import { ApiError } from './http.js';
import { normaliseAcvpu } from './news2Engine.js';

const RANGES = { resp_rate: [0, 70], spo2: [50, 100], systolic_bp: [40, 300], heart_rate: [20, 250], temp: [30, 43] };

export function validateVitals(raw) {
  if (!raw || typeof raw !== 'object') throw new ApiError(400, 'vitals object required');
  const errors = [];
  const out = {};
  for (const [k, [lo, hi]] of Object.entries(RANGES)) {
    const n = Number(raw[k]);
    if (raw[k] === undefined || raw[k] === null || raw[k] === '' || !Number.isFinite(n)) errors.push(`${k} is required and must be a number`);
    else if (n < lo || n > hi) errors.push(`${k} must be between ${lo} and ${hi}`);
    else out[k] = n;
  }
  const c = normaliseAcvpu(raw.consciousness);
  if (!c) errors.push('consciousness must be A, C, V, P or U (or Alert, Confusion, Voice, Pain, Unresponsive)');
  else out.consciousness = c;
  if (raw.on_oxygen !== undefined && typeof raw.on_oxygen !== 'boolean') errors.push('on_oxygen must be boolean');
  out.on_oxygen = raw.on_oxygen === true;
  if (errors.length) throw new ApiError(400, 'Invalid vitals', errors);
  return out;
}

export function validatePatient(raw, { partial = false } = {}) {
  if (!raw || typeof raw !== 'object') throw new ApiError(400, 'patient object required');
  const errors = [];
  const out = {};
  const str = (k, required) => {
    if (raw[k] === undefined) { if (required && !partial) errors.push(`${k} is required`); return; }
    if (typeof raw[k] !== 'string' || !raw[k].trim()) errors.push(`${k} must be a non-empty string`);
    else out[k] = raw[k].trim().slice(0, 300);
  };
  str('name', true); str('bed_number', true); str('condition', true);
  if (raw.age === undefined) { if (!partial) errors.push('age is required'); }
  else {
    const a = Number(raw.age);
    if (!Number.isInteger(a) || a < 0 || a > 120) errors.push('age must be an integer 0-120'); else out.age = a;
  }
  if (raw.spo2_scale !== undefined) {
    const s = Number(raw.spo2_scale);
    if (s !== 1 && s !== 2) errors.push('spo2_scale must be 1 or 2'); else out.spo2_scale = s;
  }
  if (raw.meds_and_labs !== undefined) out.meds_and_labs = String(raw.meds_and_labs).slice(0, 1000);
  if (errors.length) throw new ApiError(400, 'Invalid patient', errors);
  return out;
}
