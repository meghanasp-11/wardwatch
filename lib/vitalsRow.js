import { computeNews2 } from './news2Engine.js';
import { formatTime } from './time.js';

export function toVitalsRow(patient_id, v, { spo2Scale = 1, recorded_at, source = 'manual' } = {}) {
  const a = computeNews2(v, spo2Scale);
  return {
    patient_id, recorded_at: recorded_at || new Date().toISOString(),
    resp_rate: v.resp_rate, spo2: v.spo2, on_oxygen: !!v.on_oxygen, systolic_bp: v.systolic_bp,
    heart_rate: v.heart_rate, temp: v.temp, consciousness: v.consciousness,
    news2_total: a.totalScore, risk_level: a.riskLevel, single_red: a.singleRedFlag,
    qsofa_score: a.qsofaScore, sepsis_alert: a.sepsisAlert, spo2_scale_used: a.spo2Scale,
    breakdown: a.breakdown, source,
  };
}
export const vitalsOf = (r) => ({
  resp_rate: r.resp_rate, spo2: r.spo2, on_oxygen: !!r.on_oxygen, systolic_bp: r.systolic_bp,
  heart_rate: r.heart_rate, temp: Number(r.temp), consciousness: r.consciousness,
});
export const readingView = (r) => ({ time: formatTime(r.recorded_at), recorded_at: r.recorded_at, ...vitalsOf(r), news2_total: r.news2_total, source: r.source });
