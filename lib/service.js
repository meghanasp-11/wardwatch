import { repo } from './repo.js';
import { ApiError } from './http.js';
import { computeNews2, compareSeverity } from './news2Engine.js';
import { validateVitals, validatePatient } from './validate.js';
import { toVitalsRow, vitalsOf, readingView } from './vitalsRow.js';
import { nextVitals } from './simulate.js';
import { generateHandoff } from './sbar.js';
import { buildFhirBundle } from './fhirExport.js';

const HISTORY = 6;
const publicPatient = (p) => ({ id: p.id, name: p.name, age: p.age, bed_number: p.bed_number, condition: p.condition, spo2_scale: p.spo2_scale, meds_and_labs: p.meds_and_labs });

async function enrich(p) {
  const rows = await repo.listVitals(p.id, HISTORY);
  if (!rows.length) throw new ApiError(409, `Patient ${p.id} has no readings`);
  const history = rows.map(readingView);
  const latest = rows[rows.length - 1];
  return { ...publicPatient(p), history, latestVitals: history[history.length - 1], assessment: computeNews2(vitalsOf(latest), p.spo2_scale) };
}
async function mustGet(id) {
  const p = await repo.getPatient(id);
  if (!p) throw new ApiError(404, 'Patient not found');
  return p;
}

export async function census() {
  const enriched = await Promise.all((await repo.listPatients()).map(enrich));
  enriched.sort((a, b) => compareSeverity(a.assessment, b.assessment));
  const summary = { High: 0, Medium: 0, Low: 0 };
  enriched.forEach((p) => { summary[p.assessment.riskLevel] += 1; });
  return { patients: enriched, summary, generated_at: new Date().toISOString() };
}
export async function patientView(id) { return enrich(await mustGet(id)); }

export function scoreOnly(body) {
  const v = validateVitals(body?.vitals);
  return computeNews2(v, body?.spo2_scale ?? 1);
}

export async function admit(body) {
  const p = validatePatient(body);
  const baseline = body.vitals ? validateVitals(body.vitals)
    : { resp_rate: 19, spo2: p.spo2_scale === 2 ? 90 : 96, on_oxygen: false, systolic_bp: 118, heart_rate: 92, temp: 37.5, consciousness: 'A' };
  const created = await repo.insertPatient({ spo2_scale: 1, meds_and_labs: 'Baseline labs ordered', ...p });
  await repo.insertVitals(toVitalsRow(created.id, baseline, { spo2Scale: created.spo2_scale, source: body.vitals ? 'manual' : 'admission-baseline' }));
  return enrich(created);
}
export async function updatePatient(id, body) {
  await mustGet(id);
  const f = validatePatient(body, { partial: true });
  if (!Object.keys(f).length) throw new ApiError(400, 'No updatable fields supplied');
  return enrich(await repo.updatePatient(id, f));
}
export async function discharge(id) { await mustGet(id); await repo.updatePatient(id, { active: false }); return { id, discharged: true }; }

export async function saveReading(id, body) {
  const p = await mustGet(id);
  const v = validateVitals(body);
  let recorded_at;
  if (body.recorded_at) {
    const t = new Date(body.recorded_at);
    if (Number.isNaN(t.getTime())) throw new ApiError(400, 'recorded_at must be an ISO timestamp');
    recorded_at = t.toISOString();
  }
  await repo.insertVitals(toVitalsRow(id, v, { spo2Scale: p.spo2_scale, recorded_at }));
  return enrich(p);
}

export async function simulate(id, body = {}) {
  const p = await mustGet(id);
  const direction = body.direction === 'recover' ? 'recover' : 'deteriorate';
  const rows = await repo.listVitals(id, 1);
  if (!rows.length) throw new ApiError(409, 'No readings to simulate from');
  const last = rows[0];
  const v = nextVitals(vitalsOf(last), p.spo2_scale, direction);
  const recorded_at = new Date(new Date(last.recorded_at).getTime() + 2 * 3600_000).toISOString();
  if (body.persist === false) { // preview only, nothing saved
    return { preview: true, reading: { ...v, recorded_at }, assessment: computeNews2(v, p.spo2_scale) };
  }
  await repo.insertVitals(toVitalsRow(id, v, { spo2Scale: p.spo2_scale, recorded_at, source: 'simulated' }));
  return enrich(p);
}

// Slider values on screen may be unsaved: SBAR/FHIR accept an optional vitals override.
async function resolveCurrent(id, body) {
  const p = await mustGet(id);
  const rows = await repo.listVitals(id, 2);
  if (!rows.length && !body?.vitals) throw new ApiError(409, 'No readings for patient');
  const override = body?.vitals ? validateVitals(body.vitals) : null;
  const vitals = override || vitalsOf(rows[rows.length - 1]);
  const previousRow = override ? rows[rows.length - 1] : rows[rows.length - 2];
  return {
    patient: publicPatient(p), vitals, unsaved: !!override,
    assessment: computeNews2(vitals, p.spo2_scale),
    previous: previousRow ? computeNews2(vitalsOf(previousRow), p.spo2_scale) : null,
  };
}
export async function handoff(id, body) {
  const c = await resolveCurrent(id, body);
  return generateHandoff(c.patient, c.vitals, c.assessment, c.previous);
}
export async function fhir(id, body) {
  const c = await resolveCurrent(id, body);
  return buildFhirBundle(c.patient, c.vitals, c.assessment);
}
