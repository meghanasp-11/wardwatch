// Seeds Supabase with the demo ward. Safe to re-run (upserts).
import { createClient } from '@supabase/supabase-js';
import { buildSeedRows } from '../lib/seed.js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { patients, vitals } = buildSeedRows();
const strip = ({ id, ...rest }) => rest; // let Postgres generate vitals uuids
const a = await sb.from('patients').upsert(patients);
if (a.error) throw a.error;
const del = await sb.from('vitals_logs').delete().eq('source', 'seed');
if (del.error) throw del.error;
const b = await sb.from('vitals_logs').insert(vitals.map(strip));
if (b.error) throw b.error;
console.log(`Seeded ${patients.length} patients, ${vitals.length} readings`);
