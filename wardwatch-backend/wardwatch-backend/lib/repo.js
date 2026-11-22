// Storage abstraction. Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
// otherwise an in-memory demo store (seeded, resets on restart / cold start).
import { randomUUID } from 'node:crypto';
import { ApiError } from './http.js';
import { buildSeedRows } from './seed.js';

export const usingSupabase = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---------- in-memory ----------
function mem() {
  if (!globalThis.__wardwatchMem) {
    const { patients, vitals } = buildSeedRows();
    globalThis.__wardwatchMem = { patients: new Map(patients.map((p) => [p.id, p])), vitals };
  }
  return globalThis.__wardwatchMem;
}
export function resetMemoryStore() { delete globalThis.__wardwatchMem; }

const memoryRepo = {
  async listPatients() { return [...mem().patients.values()].filter((p) => p.active); },
  async getPatient(id) { const p = mem().patients.get(id); return p && p.active ? p : null; },
  async insertPatient(p) {
    const row = { id: `p-${randomUUID().slice(0, 8)}`, active: true, created_at: new Date().toISOString(), ...p };
    mem().patients.set(row.id, row); return row;
  },
  async updatePatient(id, fields) { const p = mem().patients.get(id); Object.assign(p, fields); return p; },
  async insertVitals(row) { const r = { id: randomUUID(), ...row }; mem().vitals.push(r); return r; },
  async listVitals(patient_id, limit = 6) {
    return mem().vitals.filter((v) => v.patient_id === patient_id)
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)).slice(-limit);
  },
};

// ---------- supabase ----------
let client;
async function sb() {
  if (client) return client;
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  return client;
}
function ok({ data, error }) {
  if (error) { console.error('supabase error:', error); throw new ApiError(502, 'Database error'); }
  return data;
}
const supabaseRepo = {
  async listPatients() { const c = await sb(); return ok(await c.from('patients').select('*').eq('active', true).order('created_at')); },
  async getPatient(id) { const c = await sb(); return ok(await c.from('patients').select('*').eq('id', id).eq('active', true).maybeSingle()); },
  async insertPatient(p) { const c = await sb(); return ok(await c.from('patients').insert(p).select().single()); },
  async updatePatient(id, f) { const c = await sb(); return ok(await c.from('patients').update(f).eq('id', id).select().single()); },
  async insertVitals(row) { const c = await sb(); return ok(await c.from('vitals_logs').insert(row).select().single()); },
  async listVitals(patient_id, limit = 6) {
    const c = await sb();
    const rows = ok(await c.from('vitals_logs').select('*').eq('patient_id', patient_id).order('recorded_at', { ascending: false }).limit(limit));
    return rows.reverse();
  },
};

export const repo = new Proxy({}, { get: (_, k) => (usingSupabase() ? supabaseRepo : memoryRepo)[k] });
