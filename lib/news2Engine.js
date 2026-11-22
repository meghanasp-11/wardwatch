// Deterministic RCP NEWS2 (2017) + qSOFA. No AI is ever involved in scoring.
// Field names match the frontend (resp_rate, systolic_bp, heart_rate, consciousness...).
// SpO2 Scale 2 must only be enabled on instruction of a qualified clinician
// for patients with confirmed hypercapnic respiratory failure (e.g. COPD).

export const ACVPU_LEVELS = ['A', 'C', 'V', 'P', 'U'];
const ALIASES = {
  a: 'A', alert: 'A', c: 'C', confusion: 'C', confused: 'C', new_confusion: 'C',
  v: 'V', voice: 'V', p: 'P', pain: 'P', u: 'U', unresponsive: 'U',
};
export function normaliseAcvpu(x) {
  if (x == null) return null;
  return ALIASES[String(x).trim().toLowerCase().replace(/[\s-]+/g, '_')] ?? null;
}

// Tier table. riskLevel is the 3-level label the UI uses; riskTier is finer (single red flag = low_medium).
// responseMinutes are local-policy defaults, tune per hospital.
const TIERS = {
  high: {
    riskLevel: 'High', color: 'red', rank: 4, responseMinutes: 15,
    monitoringFreq: 'Continuous monitoring of vital signs',
    clinicalAction: 'EMERGENCY: Immediate bedside review by Critical Care / Rapid Response Team (< 15 mins). Consider transfer to ICU/HDU.',
  },
  medium: {
    riskLevel: 'Medium', color: 'amber', rank: 3, responseMinutes: 30,
    monitoringFreq: 'Minimum every 1 hour',
    clinicalAction: 'URGENT: Urgent review by ward clinician / acute team within 30 minutes. Screen for sepsis immediately.',
  },
  low_medium: {
    riskLevel: 'Medium', color: 'amber', rank: 2, responseMinutes: 30,
    monitoringFreq: 'Minimum every 1 hour',
    clinicalAction: 'URGENT SINGLE-PARAMETER TRIGGER (Score of 3): Immediate ward doctor review to rule out acute organ compromise.',
  },
  low: {
    riskLevel: 'Low', color: 'green', rank: 1, responseMinutes: null,
    monitoringFreq: 'Minimum every 4-6 hours (every 12 hours if score is 0)',
    clinicalAction: 'Continue routine ward monitoring and standard care plan.',
  },
};

const rrScore = (v) => (v <= 8 ? 3 : v <= 11 ? 1 : v <= 20 ? 0 : v <= 24 ? 2 : 3);
const spo2Scale1 = (v) => (v <= 91 ? 3 : v <= 93 ? 2 : v <= 95 ? 1 : 0);
function spo2Scale2(v, onO2) {
  if (v <= 83) return 3;
  if (v <= 85) return 2;
  if (v <= 87) return 1;
  if (v <= 92) return 0;          // 88-92 is 0; >=93 on air is also 0
  if (!onO2) return 0;
  return v <= 94 ? 1 : v <= 96 ? 2 : 3;
}
const sbpScore = (v) => (v <= 90 ? 3 : v <= 100 ? 2 : v <= 110 ? 1 : v <= 219 ? 0 : 3);
const hrScore = (v) => (v <= 40 ? 3 : v <= 50 ? 1 : v <= 90 ? 0 : v <= 110 ? 1 : v <= 130 ? 2 : 3);
const tempScore = (v) => (v <= 35.0 ? 3 : v <= 36.0 ? 1 : v <= 38.0 ? 0 : v <= 39.0 ? 1 : 2);

export function computeNews2(vitals, spo2Scale = 1) {
  const v = {
    resp_rate: Math.round(vitals.resp_rate), spo2: Math.round(vitals.spo2), on_oxygen: !!vitals.on_oxygen,
    systolic_bp: Math.round(vitals.systolic_bp), heart_rate: Math.round(vitals.heart_rate),
    temp: Math.round(vitals.temp * 10) / 10, consciousness: vitals.consciousness,
  };
  const scale = Number(spo2Scale) === 2 ? 2 : 1;
  const breakdown = {
    resp_rate: rrScore(v.resp_rate),
    spo2: scale === 2 ? spo2Scale2(v.spo2, v.on_oxygen) : spo2Scale1(v.spo2),
    on_oxygen: v.on_oxygen ? 2 : 0,
    systolic_bp: sbpScore(v.systolic_bp),
    heart_rate: hrScore(v.heart_rate),
    temp: tempScore(v.temp),
    consciousness: v.consciousness === 'A' ? 0 : 3,
  };
  const totalScore = Object.values(breakdown).reduce((s, n) => s + n, 0);
  const redFlags = Object.entries(breakdown).filter(([, n]) => n === 3).map(([k]) => k);
  const singleRedFlag = redFlags.length > 0;

  const riskTier = totalScore >= 7 ? 'high' : totalScore >= 5 ? 'medium' : singleRedFlag ? 'low_medium' : 'low';
  const t = TIERS[riskTier];

  const qsofaCriteria = [];
  if (v.resp_rate >= 22) qsofaCriteria.push('Resp Rate ≥ 22/min');
  if (v.systolic_bp <= 100) qsofaCriteria.push('Systolic BP ≤ 100 mmHg');
  if (v.consciousness !== 'A') qsofaCriteria.push(`Altered Mentation (${v.consciousness})`);
  const qsofaScore = qsofaCriteria.length;
  const sepsisAlert = qsofaScore >= 2;

  return {
    totalScore, breakdown, redFlags, singleRedFlag,
    riskLevel: t.riskLevel, riskTier, color: t.color, severityRank: t.rank,
    monitoringFreq: riskTier === 'low' && totalScore >= 1 ? 'Minimum every 4-6 hours' : riskTier === 'low' ? 'Minimum every 12 hours' : t.monitoringFreq,
    clinicalAction: t.clinicalAction, responseMinutes: t.responseMinutes,
    qsofaScore, qsofaCriteria, sepsisAlert, spo2Scale: scale,
  };
}

// Sickest first: risk tier, then NEWS2 total, then qSOFA
export function compareSeverity(a, b) {
  return (b.severityRank - a.severityRank) || (b.totalScore - a.totalScore) || (b.qsofaScore - a.qsofaScore);
}
