/**
 * WardWatch NEWS2 & qSOFA Calculator
 * Royal College of Physicians (RCP) NEWS2 scoring
 * Supports SpO2 Scale 1 (standard) and Scale 2 (COPD target 88–92%)
 * Single-vital score-of-3 red flag detection
 * qSOFA sepsis screening
 */

/**
 * Score a single NEWS2 vital based on scale and value
 * @param {number} value - The measured value
 * @param {string} scale - 'scale1' or 'scale2'
 * @returns {number} NEWS2 score (0-3)
 */
export function scoreVital(value, scale = 'scale1') {
  if (scale === 'scale2') {
    // COPD-optimised: target SpO2 88-92%
    // Scale 2 reverse scoring for SpO2: 95-92 = 0, 91-89 = 1, 88-86 = 2, <86 = 3
    if (value >= 95) return 0;
    if (value >= 90) return 1;
    if (value >= 86) return 2;
    return 3;
  }

  // Scale 1 (standard): SpO2 95-96 = 0, 91-94 = 1, 86-90 = 2, <86 = 3
  if (value >= 95) return 0;
  if (value >= 91) return 1;
  if (value >= 86) return 2;
  return 3;
}

/**
 * NEWS2 Total Score Calculation
 * Maps each vital to its score and sums the total (0-20 scale)
 */
export function calculateNews2({ respiratoryRate, spo2, spo2Scale = 1, supplementalO2, systolicBP, heartRate, temperature, acvpu }) {
  // Respiratory Rate scoring (0-3)
  // RR ≤ 8 = 3, 9-11 = 0, 12-20 = 0, 21-24 = 1, ≥ 25 = 3
  let rrScore;
  if (respiratoryRate <= 8) rrScore = 3;
  else if (respiratoryRate >= 25) rrScore = 3;
  else if (respiratoryRate >= 21) rrScore = 1;
  else if (respiratoryRate >= 12) rrScore = 0;
  else rrScore = 0; // 9-11

  // SpO2 scoring
  let spo2Score = scoreVital(spo2, `scale${spo2Scale}`);

  // Supplemental O2 adjustment
  let spo2Adjusted = supplementalO2 ? Math.min(spo2Score + 1, 3) : spo2Score;

  // Systolic BP scoring (0-3)
  // < 90 = 3, 91-100 = 2, 101-110 = 1, > 110 = 0
  let sbpScore;
  if (systolicBP < 90) sbpScore = 3;
  else if (systolicBP >= 91 && systolicBP <= 100) sbpScore = 2;
  else if (systolicBP >= 101 && systolicBP <= 110) sbpScore = 1;
  else sbpScore = 0; // > 110

  // Heart Rate scoring (0-3)
  // HR ≤ 40 = 3, 41-50 = 2, 51-90 = 0, 91-110 = 1, 111-130 = 2, ≥ 131 = 3
  let hrScore;
  if (heartRate <= 40) hrScore = 3;
  else if (heartRate >= 131) hrScore = 3;
  else if (heartRate >= 111) hrScore = 2;
  else if (heartRate >= 91) hrScore = 1;
  else hrScore = 0; // 51-90

  // Temperature scoring (0-3)
  // < 35.0 = 3, 35.0-36.0 = 1, 36.1-38.0 = 0, 38.1-39.0 = 1, > 39.0 = 2
  let tempScore;
  if (temperature < 35.0) tempScore = 3;
  else if (temperature >= 35.0 && temperature <= 36.0) tempScore = 1;
  else if (temperature >= 36.1 && temperature <= 38.0) tempScore = 0;
  else if (temperature >= 38.1 && temperature <= 39.0) tempScore = 1;
  else tempScore = 2; // > 39.0

  // ACVPU scoring
  // A = 0, C = 1, V = 2, P = 3, U = 3
  let acvpuScore;
  switch (acvpu) {
    case 'A': acvpuScore = 0; break;
    case 'C': acvpuScore = 1; break;
    case 'V': acvpuScore = 2; break;
    case 'P': acvpuScore = 3; break;
    case 'U': acvpuScore = 3; break;
    default: acvpuScore = 0;
  }

  // Calculate total
  const total = rrScore + spo2Adjusted + sbpScore + hrScore + tempScore + acvpuScore;

  return {
    total,
    perVital: {
      respiratoryRate: rrScore,
      spo2: spo2Adjusted,
      systolicBP: sbpScore,
      heartRate: hrScore,
      temperature: tempScore,
      acvpu: acvpuScore,
    },
    flags: {
      singleParameterRedFlag: rrScore === 3 || spo2Adjusted === 3 || sbpScore === 3 || hrScore === 3 || tempScore === 3 || acvpuScore === 3,
      qSOFA: checkqSOFA(respiratoryRate, systolicBP, acvpu),
    },
  };
}

/**
 * Single-parameter score-of-3 red flag (RCP NEWS2 guidance)
 * If ANY single vital scores 3 points, this is a red flag requiring immediate review
 */
export function checkSingleParameterRedFlag(perVital) {
  return Object.values(perVital).some(score => score === 3);
}

/**
 * qSOFA Sepsis Screening (JAMA/Sepsis-3 criteria)
 * qSOFA = 1 point each for:
 *   - RR ≥ 22 breaths/min
 *   - SBP ≤ 100 mmHg
 *   - Altered mental status (ACVPU C/V/P/U)
 * Score of ≥ 2 suggests possible sepsis
 */
export function checkqSOFA(respiratoryRate, systolicBP, acvpu) {
  let score = 0;

  // RR ≥ 22
  if (respiratoryRate >= 22) score++;

  // SBP ≤ 100
  if (systolicBP <= 100) score++;

  // Altered mental status (ACVPU ≠ A)
  const altered = acvpu !== 'A';
  if (altered) score++;

  const possibleSepsis = score >= 2;

  return {
    qSOFAScore: score,
    possibleSepsis,
    interpretation:
      possibleSepsis
        ? 'Possible sepsis - initiate clinical review, consider lactate, blood cultures, and broad-spectrum antibiotics per protocol'
        : 'Low qSOFA - routine monitoring, reassess if condition changes',
  };
}

/**
 * NEWS2 Grade/Category from total score (RCP guidance)
 */
export function getNews2Grade(total) {
  if (total <= 1) return { grade: '0', category: 'Low Risk', description: 'Normal observations', color: 'green' };
  if (total <= 3) return { grade: '1', category: 'Low Risk', description: 'Mild abnormality', color: 'green' };
  if (total <= 5) return { grade: '2', category: 'Medium Risk', description: 'Moderate abnormality - consider urgent clinical assessment', color: 'amber' };
  if (total <= 6) return { grade: '3', category: 'Medium Risk', description: 'Moderate abnormality - acute clinical review required', color: 'amber' };
  if (total <= 10) return { grade: '4-5', category: 'High Risk', description: 'High concern - immediate review and escalation', color: 'red' };
  return { grade: '6+', category: 'Critical', description: 'Life-threatening - emergency response', color: 'red' };
}

/**
 * Generate a clinical summary text from NEWS2 results
 */
export function generateClinicalSummary(result) {
  const { total, perVital, flags } = result;
  const grade = getNews2Grade(total);

  let summary = `**NEWS2 Score: ${total}** (${grade.category})\n`;
  summary += `Grade: ${grade.grade} — ${grade.description}\n\n`;
  summary += `• Respiratory Rate: ${perVital.respiratoryRate} ${perVital.breakdown.rr.label}\n`;
  summary += `• SpO2 (scale ${result.perVital.breakdown.spo2.scale}): ${result.perVital.breakdown.spo2.value}% — ${perVital.breakdown.spo2.label}\n`;
  summary += `• Systolic BP: ${result.perVital.breakdown.sbp.value} mmHg — ${perVital.breakdown.sbp.label}\n`;
  summary += `• Heart Rate: ${result.perVital.breakdown.hr.value} bpm — ${perVital.breakdown.hr.label}\n`;
  summary += `• Temperature: ${result.perVital.breakdown.temp.value}°C — ${perVital.breakdown.temp.label}\n`;
  summary += `• ACVPU: ${perVital.breakdown.acvpu.label}\n\n`;

  if (flags.singleParameterRedFlag) {
    summary += '⚠️ **SINGLE PARAMETER SCORE OF 3 RED FLAG** — Immediate clinical review required regardless of total NEWS2\n';
  }

  if (flags.qSOFA.possibleSepsis) {
    summary += `⚠️ **qSOFA Score: ${flags.qSOFAScore}** — ${flags.qSOFA.interpretation}\n`;
  }

  return summary;
}

export default { calculateNews2, checkSingleParameterRedFlag, checkqSOFA, getNews2Grade, generateClinicalSummary, scoreVital };