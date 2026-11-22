// SBAR + family update. Scores are computed deterministically elsewhere; Gemini only
// rewrites supplied facts into prose, and any bad/missing output falls back to the template.
const ACVPU = { A: 'Alert', C: 'New-onset Confusion', V: 'Responds to Voice only', P: 'Responds to Pain only', U: 'Unresponsive' };

export const assembleDoctorNote = (s) =>
  `S — SITUATION:\n${s.situation}\n\nB — BACKGROUND:\n${s.background}\n\nA — ASSESSMENT:\n${s.assessment}\n\nR — RECOMMENDATION:\n${s.recommendation}`;

export function templateHandoff(patient, v, a, previous) {
  const situation = `Calling regarding ${patient.name} (${patient.age}y) in ${patient.bed_number}, admitted with ${patient.condition}. Patient has triggered a ${a.riskLevel.toUpperCase()} RISK alert with a NEWS2 score of ${a.totalScore}${a.singleRedFlag && a.totalScore < 5 ? ' (single-parameter red flag)' : ''}${a.sepsisAlert ? ` and positive qSOFA sepsis screen (${a.qsofaScore}/3)` : ''}.`;
  const trend = previous ? ` NEWS2 was ${previous.totalScore} at the previous reading.` : '';
  const background = `Primary diagnosis: ${patient.condition}. Oxygen protocol: ${a.spo2Scale === 2 ? 'SpO2 Scale 2 (Target 88–92% for hypercapnic respiratory failure)' : 'SpO2 Scale 1 (Standard target ≥ 96%)'}. Current medications & labs: ${patient.meds_and_labs || 'Standard ward protocol'}.`;
  const b = a.breakdown;
  const assessment = `Current vitals: RR ${v.resp_rate}/min (+${b.resp_rate}), SpO2 ${v.spo2}% ${v.on_oxygen ? 'on supplemental O2 (+2)' : 'on room air'} (+${b.spo2}), Systolic BP ${v.systolic_bp} mmHg (+${b.systolic_bp}), HR ${v.heart_rate} bpm (+${b.heart_rate}), Temp ${v.temp}°C (+${b.temp}), Consciousness: ${ACVPU[v.consciousness]} (+${b.consciousness}).${trend}${a.sepsisAlert ? ` qSOFA criteria met: ${a.qsofaCriteria.join('; ')}.` : ''}`;
  const sepsis = a.sepsisAlert ? ' Initiate sepsis screening and treatment per local pathway (cultures, lactate, antibiotics, fluids).' : '';
  const recommendation =
    a.riskTier === 'high' ? `Requesting immediate bedside review by Critical Care / Rapid Response Team within ${a.responseMinutes} minutes; evaluate for HDU/ICU transfer; continuous monitoring.${sepsis}`
    : a.riskTier === 'medium' ? `Requesting urgent ward clinician review within ${a.responseMinutes} minutes, repeat bloods, and hourly vital sign observations.${sepsis}`
    : a.riskTier === 'low_medium' ? `Single-parameter trigger (${a.redFlags.join(', ')}): requesting urgent ward doctor review, hourly observations.${sepsis}`
    : `Continue current treatment plan with routine ward observations every 4–6 hours. Escalate immediately if NEWS2 rises to 5 or more.${sepsis}`;

  const familyUpdate =
    a.riskLevel === 'High' ? `The medical team is closely monitoring ${patient.name} in ${patient.bed_number} because their breathing and blood pressure need extra support right now. Our senior doctors and critical care nurses are at the bedside adjusting their care to keep them safe and comfortable.`
    : a.riskLevel === 'Medium' ? `${patient.name} is being monitored closely by our nursing and medical team in ${patient.bed_number} as we treat their ${patient.condition.toLowerCase()}. We are checking their vital signs every hour and adjusting their treatment to help them recover steadily.`
    : `${patient.name} is resting in ${patient.bed_number} with stable vital signs. They are responding to their current treatment plan and will continue routine recovery checks today.`;
  return { situation, background, assessment, recommendation, familyUpdate };
}

const SCHEMA = {
  type: 'OBJECT',
  properties: Object.fromEntries(['situation', 'background', 'assessment', 'recommendation', 'family_update'].map((k) => [k, { type: 'STRING' }])),
  required: ['situation', 'background', 'assessment', 'recommendation', 'family_update'],
};
const SYSTEM = `You are a documentation assistant in a hospital early-warning demo. Rewrite ONLY the supplied structured facts into an SBAR handover note and a family update.
Rules: never change, recompute or invent any number, drug, lab value or diagnosis. Do not diagnose. The recommendation must follow the supplied escalation action and response time. Each SBAR section is 1-3 concise clinical sentences; the situation must state the NEWS2 score. family_update is exactly two calm, honest, plain-language sentences with no scores, abbreviations or jargon and no promises about outcomes.`;

function validOutput(o, a) {
  const keys = ['situation', 'background', 'assessment', 'recommendation', 'family_update'];
  if (!o || keys.some((k) => typeof o[k] !== 'string' || !o[k].trim() || o[k].length > 1500)) return 'incomplete output';
  if (!o.situation.includes(String(a.totalScore))) return 'situation missing NEWS2 score';
  if (/news2|qsofa/i.test(o.family_update)) return 'family update contains clinical jargon';
  if ((o.family_update.match(/[.!?](\s|$)/g) || []).length > 3) return 'family update too long';
  return null;
}

async function callGemini(facts, a) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: `FACTS (JSON):\n${JSON.stringify(facts)}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  const out = JSON.parse(text);
  const bad = validOutput(out, a);
  if (bad) throw new Error(bad);
  return { model, out };
}

export async function generateHandoff(patient, v, a, previous) {
  const t = templateHandoff(patient, v, a, previous);
  const result = (source, s, extra = {}) => ({
    source, ...extra,
    sbar: { situation: s.situation, background: s.background, assessment: s.assessment, recommendation: s.recommendation },
    doctorNote: assembleDoctorNote(s), familyUpdate: s.familyUpdate, generated_at: new Date().toISOString(),
  });
  if (!process.env.GEMINI_API_KEY) return result('template', t, { fallback_reason: 'GEMINI_API_KEY not set' });
  const facts = {
    patient: { name: patient.name, age: patient.age, bed: patient.bed_number, diagnosis: patient.condition, meds_and_labs: patient.meds_and_labs, spo2_scale: a.spo2Scale },
    vitals: { ...v, points: a.breakdown }, news2_total: a.totalScore, risk_level: a.riskLevel, red_flag_parameters: a.redFlags,
    qsofa: { score: a.qsofaScore, positive: a.sepsisAlert, criteria: a.qsofaCriteria },
    escalation: { action: a.clinicalAction, monitoring: a.monitoringFreq, response_minutes: a.responseMinutes },
    previous_news2_total: previous ? previous.totalScore : null,
  };
  try {
    const { model, out } = await callGemini(facts, a);
    return result('gemini', { ...out, familyUpdate: out.family_update }, { model });
  } catch (e) {
    console.error('Gemini fallback:', e.message);
    return result('template', t, { fallback_reason: e.message });
  }
}
