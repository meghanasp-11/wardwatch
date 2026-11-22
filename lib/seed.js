// Synthetic demo data (same 6 patients as the frontend). Not real patients.
import { toVitalsRow } from './vitalsRow.js';

const R = (resp_rate, spo2, on_oxygen, systolic_bp, heart_rate, temp, consciousness = 'A') =>
  ({ resp_rate, spo2, on_oxygen, systolic_bp, heart_rate, temp, consciousness });

export const SEED = [
  { id: 'p-1', name: 'Rohan Deshmukh', age: 64, bed_number: 'Bed 06-A', condition: 'Urosepsis / Acute Kidney Injury', spo2_scale: 1,
    meds_and_labs: 'IV Piperacillin-Tazobactam, Norepinephrine | Lactate 4.2 mmol/L, WBC 21.8',
    series: [R(22, 94, true, 102, 110, 38.4), R(25, 92, true, 94, 118, 38.9), R(28, 91, true, 88, 126, 39.2, 'C')] },
  { id: 'p-2', name: 'Meera Krishnan', age: 52, bed_number: 'Bed 06-B', condition: 'Acute Pancreatitis (Day 2)', spo2_scale: 1,
    meds_and_labs: 'IV Ringer Lactate 150mL/hr, Fentanyl PCA | Lipase 940 U/L, CRP 185 mg/L',
    series: [R(19, 96, false, 114, 98, 37.6), R(22, 94, true, 104, 110, 38.2), R(25, 93, true, 96, 118, 38.6)] },
  { id: 'p-3', name: 'Arthur Pendelton', age: 72, bed_number: 'Bed 04-A', condition: 'Community-Acquired Pneumonia', spo2_scale: 1,
    meds_and_labs: 'IV Ceftriaxone, Azithromycin | WBC 16.4, Lactate 2.1 mmol/L',
    series: [R(18, 96, false, 124, 88, 37.8), R(20, 95, true, 118, 94, 38.1), R(21, 94, true, 112, 98, 38.3)] },
  { id: 'p-4', name: 'Marcus Thorne', age: 67, bed_number: 'Bed 05-A', condition: 'COPD Acute Exacerbation', spo2_scale: 2,
    meds_and_labs: 'Nebulized Salbutamol, Oral Prednisolone 40mg | ABG pCO2 58 mmHg, pH 7.36',
    series: [R(20, 89, true, 132, 88, 37.2), R(21, 90, true, 130, 91, 37.3), R(22, 90, true, 128, 94, 37.4)] },
  { id: 'p-5', name: 'Eleanor Vance', age: 58, bed_number: 'Bed 04-B', condition: 'Post-Op Abdominal Surgery (Day 1)', spo2_scale: 1,
    meds_and_labs: 'SC Enoxaparin, Paracetamol IV | Hb 9.8 g/dL, Creatinine 0.9 mg/dL',
    series: [R(16, 98, false, 116, 92, 36.9), R(17, 97, false, 112, 98, 37.0), R(18, 97, false, 108, 104, 37.1)] },
  { id: 'p-6', name: 'Priya Nair', age: 41, bed_number: 'Bed 05-B', condition: 'Recovering Pyelonephritis', spo2_scale: 1,
    meds_and_labs: 'Oral Ciprofloxacin 500mg BD | Afebrile 24h, WBC trending down (10.2)',
    series: [R(16, 98, false, 120, 80, 37.0), R(15, 99, false, 121, 78, 36.9), R(15, 98, false, 122, 76, 36.8)] },
];

// Readings are spaced 2 h apart, ending at the current hour.
export function buildSeedRows(now = new Date()) {
  const end = new Date(now); end.setMinutes(0, 0, 0);
  const patients = [];
  const vitals = [];
  for (const { series, ...p } of SEED) {
    patients.push({ ...p, active: true, created_at: end.toISOString() });
    series.forEach((v, i) => {
      const at = new Date(end.getTime() - (series.length - 1 - i) * 2 * 3600_000).toISOString();
      vitals.push({ id: `${p.id}-v${i}`, ...toVitalsRow(p.id, v, { spo2Scale: p.spo2_scale, recorded_at: at, source: 'seed' }) });
    });
  }
  return { patients, vitals };
}
