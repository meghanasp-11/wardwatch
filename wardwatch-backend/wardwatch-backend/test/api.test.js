import test from 'node:test';
import assert from 'node:assert/strict';
delete process.env.SUPABASE_URL; delete process.env.GEMINI_API_KEY;
const { handle } = await import('../lib/router.js');
const { resetMemoryStore } = await import('../lib/repo.js');
const call = (method, url, body) => handle({ method, url, body });

test.beforeEach(() => resetMemoryStore());

test('health reports memory + template-only', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 200); assert.equal(r.json.store, 'memory'); assert.equal(r.json.ai, 'template-only');
});
test('census sorted sickest first, summary adds up', async () => {
  const { json } = await call('GET', '/api/patients');
  assert.equal(json.patients.length, 6);
  assert.equal(json.patients[0].id, 'p-1');                 // NEWS2 high + sepsis
  const ranks = json.patients.map((p) => p.assessment.severityRank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a));
  assert.equal(json.summary.High + json.summary.Medium + json.summary.Low, 6);
  assert.ok(json.patients[0].history.length >= 3 && json.patients[0].history[0].time);
});
test('COPD patient uses Scale 2', async () => {
  const { json } = await call('GET', '/api/patients/p-4');
  assert.equal(json.assessment.spo2Scale, 2);
  assert.equal(json.assessment.breakdown.spo2, 0);
});
test('stateless score endpoint + validation errors', async () => {
  const ok = await call('POST', '/api/score', { vitals: { resp_rate: 8, spo2: 97, on_oxygen: false, systolic_bp: 120, heart_rate: 70, temp: 37, consciousness: 'Alert' } });
  assert.equal(ok.json.totalScore, 3);
  const bad = await call('POST', '/api/score', { vitals: { resp_rate: 999, spo2: 'x' } });
  assert.equal(bad.status, 400); assert.ok(bad.json.details.length >= 3);
});
test('save reading, then simulate +2h moves trajectory', async () => {
  const before = (await call('GET', '/api/patients/p-5')).json;
  const sim = await call('POST', '/api/patients/p-5/simulate', {});
  assert.equal(sim.status, 200);
  assert.equal(sim.json.history.length, before.history.length + 1 > 6 ? 6 : before.history.length + 1);
  assert.ok(sim.json.assessment.totalScore > before.assessment.totalScore);
  const prev = await call('POST', '/api/patients/p-5/simulate', { persist: false });
  assert.equal(prev.json.preview, true);
});
test('recover direction improves p-6', async () => {
  const before = (await call('GET', '/api/patients/p-6')).json.assessment.totalScore;
  const r = await call('POST', '/api/patients/p-6/simulate', { direction: 'recover' });
  assert.ok(r.json.assessment.totalScore <= before);
});
test('admit patient, baseline reading created, appears in census', async () => {
  const r = await call('POST', '/api/patients', { name: 'Test Pt', age: 60, bed_number: 'Bed 07-A', condition: 'Fever', spo2_scale: 1, meds_and_labs: 'x' });
  assert.equal(r.status, 201); assert.equal(r.json.history.length, 1);
  assert.equal((await call('GET', '/api/patients')).json.patients.length, 7);
  assert.equal((await call('DELETE', `/api/patients/${r.json.id}`)).json.discharged, true);
  assert.equal((await call('GET', '/api/patients')).json.patients.length, 6);
});
test('SBAR falls back to template without Gemini key; unsaved vitals override works', async () => {
  const r = await call('POST', '/api/patients/p-6/sbar', { vitals: { resp_rate: 30, spo2: 88, on_oxygen: true, systolic_bp: 85, heart_rate: 140, temp: 39.5, consciousness: 'V' } });
  assert.equal(r.json.source, 'template');
  assert.match(r.json.doctorNote, /HIGH RISK alert with a NEWS2 score of \d+/);
  assert.match(r.json.doctorNote, /sepsis/i);
  assert.ok(r.json.familyUpdate.split(/[.!?]\s/).length <= 3);
});
test('SBAR uses Gemini when it returns valid JSON, rejects bad output', async () => {
  process.env.GEMINI_API_KEY = 'test';
  const realFetch = globalThis.fetch;
  const reply = (obj) => async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) });
  try {
    const { json: p1 } = await call('GET', '/api/patients/p-1');
    globalThis.fetch = reply({ situation: `Bed 06-A, NEWS2 ${p1.assessment.totalScore}.`, background: 'b', assessment: 'a', recommendation: 'r', family_update: 'The team is with him. We will keep you updated.' });
    const ok = await call('POST', '/api/patients/p-1/sbar', {});
    assert.equal(ok.json.source, 'gemini');
    globalThis.fetch = reply({ situation: 'no score here', background: 'b', assessment: 'a', recommendation: 'r', family_update: 'Fine.' });
    const bad = await call('POST', '/api/patients/p-1/sbar', {});
    assert.equal(bad.json.source, 'template');
    globalThis.fetch = async () => { throw new Error('network down'); };
    assert.equal((await call('POST', '/api/patients/p-1/sbar', {})).json.source, 'template');
  } finally { globalThis.fetch = realFetch; delete process.env.GEMINI_API_KEY; }
});
test('FHIR bundle is structurally valid and references resolve', async () => {
  const { status, json: b } = await call('GET', '/api/patients/p-1/fhir');
  assert.equal(status, 200); assert.equal(b.resourceType, 'Bundle'); assert.equal(b.type, 'collection');
  const types = b.entry.map((e) => e.resource.resourceType);
  assert.equal(types.filter((t) => t === 'Patient').length, 1);
  assert.equal(types.filter((t) => t === 'Observation').length, 9);
  const urls = new Set(b.entry.map((e) => `${e.resource.resourceType}/${e.resource.id}`));
  const news2 = b.entry.find((e) => e.resource.code?.coding?.[0]?.code === 'news2-total').resource;
  news2.hasMember.forEach((m) => assert.ok(urls.has(m.reference), m.reference));
  b.entry.filter((e) => e.resource.resourceType === 'Observation').forEach((e) => assert.ok(urls.has(e.resource.subject.reference)));
  JSON.parse(JSON.stringify(b));
});
test('404 / 405 / bad JSON', async () => {
  assert.equal((await call('GET', '/api/patients/nope')).status, 404);
  assert.equal((await call('GET', '/api/nothing')).status, 404);
  assert.equal((await call('PUT', '/api/patients')).status, 405);
  assert.equal((await call('POST', '/api/score', '{bad')).status, 400);
});
