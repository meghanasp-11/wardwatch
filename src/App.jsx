import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Activity,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Clock,
  FileText,
  Code2,
  Copy,
  Check,
  Download,
  Wind,
  Thermometer,
  Droplets,
  Brain,
  Stethoscope,
  X,
  UserPlus,
  TrendingUp,
  Info
} from 'lucide-react';

// ============================================================================
// ROYAL COLLEGE OF PHYSICIANS (RCP) NEWS2 & qSOFA CLINICAL SCORING ENGINE
// ============================================================================
function calculateNEWS2(vitals, spo2Scale = 1) {
  const { resp_rate, spo2, on_oxygen, systolic_bp, heart_rate, temp, consciousness } = vitals;

  // 1. Respiration Rate Score
  let rrScore = 0;
  if (resp_rate <= 8) rrScore = 3;
  else if (resp_rate <= 11) rrScore = 1;
  else if (resp_rate <= 20) rrScore = 0;
  else if (resp_rate <= 24) rrScore = 2;
  else rrScore = 3;

  // 2. SpO2 Score (Scale 1 = Standard, Scale 2 = Hypercapnic / COPD)
  let spo2Score = 0;
  if (spo2Scale === 2) {
    if (spo2 <= 83) spo2Score = 3;
    else if (spo2 <= 85) spo2Score = 2;
    else if (spo2 <= 87) spo2Score = 1;
    else if (spo2 <= 92) spo2Score = 0;
    else if (!on_oxygen) spo2Score = 0; // >= 93 on room air is normal even in Scale 2
    else if (spo2 <= 94) spo2Score = 1;
    else if (spo2 <= 96) spo2Score = 2;
    else spo2Score = 3;
  } else {
    if (spo2 <= 91) spo2Score = 3;
    else if (spo2 <= 93) spo2Score = 2;
    else if (spo2 <= 95) spo2Score = 1;
    else spo2Score = 0;
  }

  // 3. Supplemental Oxygen Score
  const o2Score = on_oxygen ? 2 : 0;

  // 4. Systolic Blood Pressure Score
  let bpScore = 0;
  if (systolic_bp <= 90) bpScore = 3;
  else if (systolic_bp <= 100) bpScore = 2;
  else if (systolic_bp <= 110) bpScore = 1;
  else if (systolic_bp <= 219) bpScore = 0;
  else bpScore = 3;

  // 5. Heart Rate / Pulse Score
  let hrScore = 0;
  if (heart_rate <= 40) hrScore = 3;
  else if (heart_rate <= 50) hrScore = 1;
  else if (heart_rate <= 90) hrScore = 0;
  else if (heart_rate <= 110) hrScore = 1;
  else if (heart_rate <= 130) hrScore = 2;
  else hrScore = 3;

  // 6. Temperature Score
  let tempScore = 0;
  if (temp <= 35.0) tempScore = 3;
  else if (temp <= 36.0) tempScore = 1;
  else if (temp <= 38.0) tempScore = 0;
  else if (temp <= 39.0) tempScore = 1;
  else tempScore = 2;

  // 7. Consciousness (ACVPU) Score
  const acvpuScore = consciousness === 'A' ? 0 : 3;

  const breakdown = {
    resp_rate: rrScore,
    spo2: spo2Score,
    on_oxygen: o2Score,
    systolic_bp: bpScore,
    heart_rate: hrScore,
    temp: tempScore,
    consciousness: acvpuScore
  };

  const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  const redFlags = Object.entries(breakdown)
    .filter(([, score]) => score === 3)
    .map(([key]) => key);

  // RCP Clinical Risk Classification
  let riskLevel = 'Low';
  let monitoringFreq = 'Minimum every 12 hours (or every 4–6 hours if score 1–4)';
  let clinicalAction = 'Continue routine ward monitoring and standard care plan.';

  if (totalScore >= 7) {
    riskLevel = 'High';
    monitoringFreq = 'Continuous monitoring of vital signs';
    clinicalAction =
      'EMERGENCY: Immediate bedside review by Critical Care / Rapid Response Team (< 15 mins). Consider transfer to ICU/HDU.';
  } else if (totalScore >= 5) {
    riskLevel = 'Medium';
    monitoringFreq = 'Minimum every 1 hour';
    clinicalAction =
      'URGENT: Urgent review by ward clinician / acute team within 30 minutes. Screen for sepsis immediately.';
  } else if (redFlags.length > 0) {
    riskLevel = 'Medium';
    monitoringFreq = 'Minimum every 1 hour';
    clinicalAction =
      'URGENT SINGLE-PARAMETER TRIGGER (Score of 3): Immediate ward doctor review to rule out acute organ compromise.';
  }

  // qSOFA Sepsis Screening (RR >= 22, SBP <= 100, Altered Mentation != 'A')
  const qsofaCriteria = [];
  if (resp_rate >= 22) qsofaCriteria.push('Resp Rate ≥ 22/min');
  if (systolic_bp <= 100) qsofaCriteria.push('Systolic BP ≤ 100 mmHg');
  if (consciousness !== 'A') qsofaCriteria.push(`Altered Mentation (${consciousness})`);
  const qsofaScore = qsofaCriteria.length;
  const sepsisAlert = qsofaScore >= 2;

  return {
    totalScore,
    breakdown,
    redFlags,
    riskLevel,
    monitoringFreq,
    clinicalAction,
    qsofaScore,
    qsofaCriteria,
    sepsisAlert
  };
}

// ============================================================================
// INITIAL SEED DATA (6 REALISTIC WARD PATIENTS)
// ============================================================================
const INITIAL_PATIENTS = [
  {
    id: 'p-1',
    name: 'Rohan Deshmukh',
    age: 64,
    bed_number: 'Bed 06-A',
    condition: 'Urosepsis / Acute Kidney Injury',
    spo2_scale: 1,
    meds_and_labs: 'IV Piperacillin-Tazobactam, Norepinephrine | Lactate 4.2 mmol/L, WBC 21.8',
    history: [
      { time: '08:00', resp_rate: 22, spo2: 94, on_oxygen: true, systolic_bp: 102, heart_rate: 110, temp: 38.4, consciousness: 'A' },
      { time: '10:00', resp_rate: 25, spo2: 92, on_oxygen: true, systolic_bp: 94, heart_rate: 118, temp: 38.9, consciousness: 'A' },
      { time: '12:00', resp_rate: 28, spo2: 91, on_oxygen: true, systolic_bp: 88, heart_rate: 126, temp: 39.2, consciousness: 'C' }
    ]
  },
  {
    id: 'p-2',
    name: 'Meera Krishnan',
    age: 52,
    bed_number: 'Bed 06-B',
    condition: 'Acute Pancreatitis (Day 2)',
    spo2_scale: 1,
    meds_and_labs: 'IV Ringer Lactate 150mL/hr, Fentanyl PCA | Lipase 940 U/L, CRP 185 mg/L',
    history: [
      { time: '08:00', resp_rate: 19, spo2: 96, on_oxygen: false, systolic_bp: 114, heart_rate: 98, temp: 37.6, consciousness: 'A' },
      { time: '10:00', resp_rate: 22, spo2: 94, on_oxygen: true, systolic_bp: 104, heart_rate: 110, temp: 38.2, consciousness: 'A' },
      { time: '12:00', resp_rate: 25, spo2: 93, on_oxygen: true, systolic_bp: 96, heart_rate: 118, temp: 38.6, consciousness: 'A' }
    ]
  },
  {
    id: 'p-3',
    name: 'Arthur Pendelton',
    age: 72,
    bed_number: 'Bed 04-A',
    condition: 'Community-Acquired Pneumonia',
    spo2_scale: 1,
    meds_and_labs: 'IV Ceftriaxone, Azithromycin | WBC 16.4, Lactate 2.1 mmol/L',
    history: [
      { time: '08:00', resp_rate: 18, spo2: 96, on_oxygen: false, systolic_bp: 124, heart_rate: 88, temp: 37.8, consciousness: 'A' },
      { time: '10:00', resp_rate: 20, spo2: 95, on_oxygen: true, systolic_bp: 118, heart_rate: 94, temp: 38.1, consciousness: 'A' },
      { time: '12:00', resp_rate: 21, spo2: 94, on_oxygen: true, systolic_bp: 112, heart_rate: 98, temp: 38.3, consciousness: 'A' }
    ]
  },
  {
    id: 'p-4',
    name: 'Marcus Thorne',
    age: 67,
    bed_number: 'Bed 05-A',
    condition: 'COPD Acute Exacerbation',
    spo2_scale: 2,
    meds_and_labs: 'Nebulized Salbutamol, Oral Prednisolone 40mg | ABG pCO2 58 mmHg, pH 7.36',
    history: [
      { time: '08:00', resp_rate: 20, spo2: 89, on_oxygen: true, systolic_bp: 132, heart_rate: 88, temp: 37.2, consciousness: 'A' },
      { time: '10:00', resp_rate: 21, spo2: 90, on_oxygen: true, systolic_bp: 130, heart_rate: 91, temp: 37.3, consciousness: 'A' },
      { time: '12:00', resp_rate: 22, spo2: 90, on_oxygen: true, systolic_bp: 128, heart_rate: 94, temp: 37.4, consciousness: 'A' }
    ]
  },
  {
    id: 'p-5',
    name: 'Eleanor Vance',
    age: 58,
    bed_number: 'Bed 04-B',
    condition: 'Post-Op Abdominal Surgery (Day 1)',
    spo2_scale: 1,
    meds_and_labs: 'SC Enoxaparin, Paracetamol IV | Hb 9.8 g/dL, Creatinine 0.9 mg/dL',
    history: [
      { time: '08:00', resp_rate: 16, spo2: 98, on_oxygen: false, systolic_bp: 116, heart_rate: 92, temp: 36.9, consciousness: 'A' },
      { time: '10:00', resp_rate: 17, spo2: 97, on_oxygen: false, systolic_bp: 112, heart_rate: 98, temp: 37.0, consciousness: 'A' },
      { time: '12:00', resp_rate: 18, spo2: 97, on_oxygen: false, systolic_bp: 108, heart_rate: 104, temp: 37.1, consciousness: 'A' }
    ]
  },
  {
    id: 'p-6',
    name: 'Priya Nair',
    age: 41,
    bed_number: 'Bed 05-B',
    condition: 'Recovering Pyelonephritis',
    spo2_scale: 1,
    meds_and_labs: 'Oral Ciprofloxacin 500mg BD | Afebrile 24h, WBC trending down (10.2)',
    history: [
      { time: '08:00', resp_rate: 16, spo2: 98, on_oxygen: false, systolic_bp: 120, heart_rate: 80, temp: 37.0, consciousness: 'A' },
      { time: '10:00', resp_rate: 15, spo2: 99, on_oxygen: false, systolic_bp: 121, heart_rate: 78, temp: 36.9, consciousness: 'A' },
      { time: '12:00', resp_rate: 15, spo2: 98, on_oxygen: false, systolic_bp: 122, heart_rate: 76, temp: 36.8, consciousness: 'A' }
    ]
  }
];

// ============================================================================
// SBAR & FAMILY COMMUNICATION GENERATOR
// ============================================================================
function generateClinicalHandoff(patient, vitals, assessment) {
  const acvpuMap = {
    A: 'Alert',
    C: 'New-onset Confusion',
    V: 'Responds to Voice only',
    P: 'Responds to Pain only',
    U: 'Unresponsive'
  };

  const situation = `Calling regarding ${patient.name} (${patient.age}y) in ${patient.bed_number}, admitted with ${patient.condition}. Patient has triggered a ${assessment.riskLevel.toUpperCase()} RISK alert with a NEWS2 score of ${assessment.totalScore}${
    assessment.sepsisAlert ? ` and positive qSOFA sepsis screen (${assessment.qsofaScore}/3)` : ''
  }.`;

  const background = `Primary diagnosis: ${patient.condition}. Oxygen protocol: ${
    patient.spo2_scale === 2 ? 'SpO2 Scale 2 (Target 88–92% for hypercapnic respiratory failure)' : 'SpO2 Scale 1 (Standard target ≥ 96%)'
  }. Current medications & labs: ${patient.meds_and_labs || 'Standard ward protocol'}.`;

  const assessmentText = `Current vitals: RR ${vitals.resp_rate}/min (+${assessment.breakdown.resp_rate}), SpO2 ${vitals.spo2}% ${
    vitals.on_oxygen ? 'on supplemental O2 (+2)' : 'on room air'
  } (+${assessment.breakdown.spo2}), Systolic BP ${vitals.systolic_bp} mmHg (+${assessment.breakdown.systolic_bp}), HR ${vitals.heart_rate} bpm (+${
    assessment.breakdown.heart_rate
  }), Temp ${vitals.temp}°C (+${assessment.breakdown.temp}), Consciousness: ${acvpuMap[vitals.consciousness]} (+${
    assessment.breakdown.consciousness
  }).`;

  const recommendation =
    assessment.riskLevel === 'High'
      ? `Requesting immediate bedside review by Critical Care / Rapid Response Team within 15 minutes. Prepare Sepsis Six bundle (blood cultures, lactate, IV antibiotics, fluid resuscitation) and evaluate for HDU/ICU transfer.`
      : assessment.riskLevel === 'Medium'
      ? `Requesting urgent ward clinician review within 30 minutes, repeat lactate/bloods, and hourly vital sign observations.`
      : `Continue current treatment plan with routine ward observations every 4–6 hours. Escalate immediately if NEWS2 rises ≥ 5.`;

  const familyUpdate =
    assessment.riskLevel === 'High'
      ? `The medical team is closely monitoring ${patient.name} in ${patient.bed_number} because their breathing and blood pressure need extra support right now. Our senior doctors and critical care nurses are at the bedside adjusting their fluids and medications to keep them safe and comfortable.`
      : assessment.riskLevel === 'Medium'
      ? `${patient.name} is being monitored closely by our nursing and medical team in ${patient.bed_number} as we treat their ${patient.condition.toLowerCase()}. We are checking their vital signs every hour and adjusting their treatment to help them recover steadily.`
      : `${patient.name} is resting comfortably in ${patient.bed_number} with stable vital signs. They are responding well to their current treatment plan and will continue routine recovery checks today.`;

  return {
    doctorNote: `S — SITUATION:\n${situation}\n\nB — BACKGROUND:\n${background}\n\nA — ASSESSMENT:\n${assessmentText}\n\nR — RECOMMENDATION:\n${recommendation}`,
    familyUpdate
  };
}

// ============================================================================
// HL7 FHIR R4 BUNDLE GENERATOR
// ============================================================================
function generateFHIRBundle(patient, vitals, assessment) {
  const now = new Date().toISOString();
  return {
    resourceType: 'Bundle',
    id: `wardwatch-triage-${patient.id}-${Date.now()}`,
    type: 'collection',
    timestamp: now,
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          name: [{ text: patient.name }],
          extension: [
            {
              url: 'http://wardwatch.clinical/fhir/StructureDefinition/bed-location',
              valueString: patient.bed_number
            },
            {
              url: 'http://wardwatch.clinical/fhir/StructureDefinition/spo2-scale',
              valueInteger: patient.spo2_scale
            }
          ]
        }
      },
      {
        resource: {
          resourceType: 'Observation',
          status: 'final',
          code: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '1104441000000107',
                display: 'Royal College of Physicians NEWS2 total score'
              }
            ]
          },
          subject: { reference: `Patient/${patient.id}` },
          effectiveDateTime: now,
          valueInteger: assessment.totalScore,
          interpretation: [
            {
              text: `${assessment.riskLevel} Clinical Risk (qSOFA: ${assessment.qsofaScore}/3)`
            }
          ],
          component: [
            { code: { text: 'Respiratory Rate' }, valueQuantity: { value: vitals.resp_rate, unit: '/min' } },
            { code: { text: 'SpO2' }, valueQuantity: { value: vitals.spo2, unit: '%' } },
            { code: { text: 'Supplemental Oxygen' }, valueBoolean: vitals.on_oxygen },
            { code: { text: 'Systolic Blood Pressure' }, valueQuantity: { value: vitals.systolic_bp, unit: 'mmHg' } },
            { code: { text: 'Heart Rate' }, valueQuantity: { value: vitals.heart_rate, unit: 'bpm' } },
            { code: { text: 'Body Temperature' }, valueQuantity: { value: vitals.temp, unit: 'Cel' } },
            { code: { text: 'ACVPU Consciousness' }, valueString: vitals.consciousness }
          ]
        }
      }
    ]
  };
}

// ============================================================================
// MAIN WARDWATCH DASHBOARD COMPONENT
// ============================================================================
export default function App() {
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [selectedId, setSelectedId] = useState('p-1');
  const [activeTab, setActiveTab] = useState('protocol'); // 'protocol' | 'sbar' | 'fhir'
  const [copiedKey, setCopiedKey] = useState(null);
  const [showAdmitModal, setShowAdmitModal] = useState(false);

  // Admit Patient Form State
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: 60,
    bed_number: 'Bed 07-A',
    condition: 'Suspected Lower Respiratory Tract Infection',
    spo2_scale: 1,
    meds_and_labs: 'Pending blood cultures, IV fluids'
  });

  // Compute latest vitals & NEWS2 assessment for every patient, then sort by urgency
  const enrichedPatients = useMemo(() => {
    const riskOrder = { High: 0, Medium: 1, Low: 2 };
    return patients
      .map((p) => {
        const latestVitals = p.history[p.history.length - 1];
        const assessment = calculateNEWS2(latestVitals, p.spo2_scale);
        return { ...p, latestVitals, assessment };
      })
      .sort((a, b) => {
        if (riskOrder[a.assessment.riskLevel] !== riskOrder[b.assessment.riskLevel]) {
          return riskOrder[a.assessment.riskLevel] - riskOrder[b.assessment.riskLevel];
        }
        return b.assessment.totalScore - a.assessment.totalScore;
      });
  }, [patients]);

  const activePatient =
    enrichedPatients.find((p) => p.id === selectedId) || enrichedPatients[0];

  // Ward-wide summary counts
  const wardSummary = useMemo(() => {
    return enrichedPatients.reduce(
      (acc, p) => {
        acc[p.assessment.riskLevel] += 1;
        return acc;
      },
      { High: 0, Medium: 0, Low: 0 }
    );
  }, [enrichedPatients]);

  // Update active patient's latest vitals in real time when sliders move
  const handleVitalChange = (field, value) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== activePatient.id) return p;
        const updatedHistory = [...p.history];
        const lastIdx = updatedHistory.length - 1;
        updatedHistory[lastIdx] = {
          ...updatedHistory[lastIdx],
          [field]: value
        };
        return { ...p, history: updatedHistory };
      })
    );
  };

  // Simulate +2 Hours progression (appends a new timestamped reading to trajectory)
  const handleSimulateTwoHours = () => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== activePatient.id) return p;
        const curr = p.history[p.history.length - 1];
        const [hh, mm] = curr.time.split(':').map(Number);
        const nextHour = String((hh + 2) % 24).padStart(2, '0');
        const nextTime = `${nextHour}:${String(mm).padStart(2, '0')}`;

        // Realistic clinical trajectory: recovering patient improves slightly; others show early deterioration
        const isRecovering = p.id === 'p-6';
        const nextVitals = isRecovering
          ? {
              time: nextTime,
              resp_rate: Math.max(14, curr.resp_rate - 1),
              spo2: Math.min(99, curr.spo2 + 1),
              on_oxygen: false,
              systolic_bp: Math.min(126, curr.systolic_bp + 2),
              heart_rate: Math.max(72, curr.heart_rate - 3),
              temp: Number(Math.max(36.7, curr.temp - 0.1).toFixed(1)),
              consciousness: 'A'
            }
          : {
              time: nextTime,
              resp_rate: Math.min(34, curr.resp_rate + 3),
              spo2: Math.max(85, curr.spo2 - (p.spo2_scale === 2 ? 1 : 2)),
              on_oxygen: true,
              systolic_bp: Math.max(78, curr.systolic_bp - 8),
              heart_rate: Math.min(148, curr.heart_rate + 10),
              temp: Number(Math.min(40.2, curr.temp + 0.4).toFixed(1)),
              consciousness: curr.systolic_bp - 8 <= 92 && curr.consciousness === 'A' ? 'C' : curr.consciousness
            };

        return {
          ...p,
          history: [...p.history.slice(-5), nextVitals]
        };
      })
    );
  };

  // Admit a new patient into the ward census
  const handleAdmitSubmit = (e) => {
    e.preventDefault();
    if (!newPatient.name.trim()) return;
    const createdId = `p-${Date.now()}`;
    const created = {
      id: createdId,
      name: newPatient.name.trim(),
      age: Number(newPatient.age) || 55,
      bed_number: newPatient.bed_number.trim() || 'Bed 07-A',
      condition: newPatient.condition.trim() || 'Observation',
      spo2_scale: Number(newPatient.spo2_scale),
      meds_and_labs: newPatient.meds_and_labs.trim() || 'Baseline labs ordered',
      history: [
        {
          time: '12:00',
          resp_rate: 19,
          spo2: newPatient.spo2_scale === 2 ? 90 : 96,
          on_oxygen: false,
          systolic_bp: 118,
          heart_rate: 92,
          temp: 37.5,
          consciousness: 'A'
        }
      ]
    };
    setPatients((prev) => [...prev, created]);
    setSelectedId(createdId);
    setShowAdmitModal(false);
    setNewPatient({
      name: '',
      age: 60,
      bed_number: 'Bed 07-B',
      condition: 'Suspected Sepsis / Fever',
      spo2_scale: 1,
      meds_and_labs: 'Pending blood cultures, IV fluids'
    });
  };

  // Clipboard copy helper
  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Download FHIR R4 JSON file
  const handleDownloadFHIR = (jsonString) => {
    const blob = new Blob([jsonString], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePatient.name.toLowerCase().replace(/\s+/g, '-')}-fhir-r4.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handoffData = useMemo(
    () => generateClinicalHandoff(activePatient, activePatient.latestVitals, activePatient.assessment),
    [activePatient]
  );

  const fhirJsonString = useMemo(
    () => JSON.stringify(generateFHIRBundle(activePatient, activePatient.latestVitals, activePatient.assessment), null, 2),
    [activePatient]
  );

  // Risk styling tokens
  const riskStyles = {
    High: {
      badge: 'bg-rose-600 text-white border-rose-700',
      pill: 'bg-rose-50 text-rose-700 border-rose-200',
      banner: 'bg-rose-600 text-white border-rose-700 shadow-rose-100',
      dot: 'bg-rose-500'
    },
    Medium: {
      badge: 'bg-amber-500 text-slate-950 border-amber-600',
      pill: 'bg-amber-50 text-amber-800 border-amber-200',
      banner: 'bg-amber-500 text-slate-950 border-amber-600 shadow-amber-100',
      dot: 'bg-amber-500'
    },
    Low: {
      badge: 'bg-emerald-600 text-white border-emerald-700',
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      banner: 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-100',
      dot: 'bg-emerald-500'
    }
  };

  const currentStyle = riskStyles[activePatient.assessment.riskLevel];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ====================================================================
          TOP COMMAND BAR
         ==================================================================== */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 sticky top-0 z-20">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 rounded-xl shadow-sm">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">WardWatch</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  RCP NEWS2 + qSOFA
                </span>
              </div>
              <p className="text-xs text-slate-400">Ward 4B — Acute General Medicine & Sepsis Triage</p>
            </div>
          </div>

          {/* Live Ward Risk Summary Counters */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{wardSummary.High} High Risk</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-800/70 text-amber-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{wardSummary.Medium} Medium</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800/70 text-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{wardSummary.Low} Stable</span>
            </div>
          </div>
        </div>
      </header>

      {/* ====================================================================
          MAIN WORKSPACE: LEFT WARD SIDEBAR + RIGHT PATIENT TRIAGE PANEL
         ==================================================================== */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6">
        {/* LEFT SIDEBAR: WARD CENSUS */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Ward Census ({enrichedPatients.length})
                </h2>
                <p className="text-xs text-slate-500">Sorted by clinical acuity</p>
              </div>
              <button
                onClick={() => setShowAdmitModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Admit
              </button>
            </div>

            <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-0.5">
              {enrichedPatients.map((patient) => {
                const isSelected = patient.id === activePatient.id;
                const pStyle = riskStyles[patient.assessment.riskLevel];
                return (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedId(patient.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {patient.bed_number}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${pStyle.badge}`}>
                        NEWS2: {patient.assessment.totalScore}
                      </span>
                    </div>

                    <div className="font-bold text-sm truncate">
                      {patient.name}{' '}
                      <span className={`font-normal text-xs ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                        ({patient.age}y)
                      </span>
                    </div>

                    <div className={`text-xs truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                      {patient.condition}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {patient.spo2_scale === 2 && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-sky-900/80 text-sky-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          SpO₂ Scale 2 (COPD)
                        </span>
                      )}
                      {patient.assessment.sepsisAlert && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          qSOFA {patient.assessment.qsofaScore}/3
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN WORKSPACE */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-5">
          {/* PATIENT HEADER CARD */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold">
                    {activePatient.bed_number}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    {activePatient.name}, {activePatient.age}y
                  </h2>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${currentStyle.pill}`}>
                    {activePatient.assessment.riskLevel} Risk
                  </span>
                  {activePatient.spo2_scale === 2 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                      COPD SpO₂ Scale 2 Active
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-700 mt-1.5">{activePatient.condition}</p>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-600">Meds & Labs:</span> {activePatient.meds_and_labs}
                </p>
              </div>

              <button
                onClick={handleSimulateTwoHours}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                Simulate +2 Hours
              </button>
            </div>

            {/* DYNAMIC ESCALATION BANNER */}
            <div className={`mt-4 p-4 rounded-xl border shadow-sm transition-colors ${currentStyle.banner}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {activePatient.assessment.riskLevel === 'High' ? (
                    <ShieldAlert className="w-6 h-6 shrink-0" />
                  ) : activePatient.assessment.riskLevel === 'Medium' ? (
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-sm sm:text-base flex flex-wrap items-center gap-2">
                      <span>
                        {activePatient.assessment.riskLevel.toUpperCase()} CLINICAL RISK — NEWS2 SCORE:{' '}
                        {activePatient.assessment.totalScore}
                      </span>
                      {activePatient.assessment.sepsisAlert && (
                        <span className="px-2 py-0.5 rounded bg-black/25 text-white text-xs font-extrabold tracking-wide">
                          SEPSIS SCREEN POSITIVE (qSOFA {activePatient.assessment.qsofaScore}/3)
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm opacity-95 mt-0.5">{activePatient.assessment.clinicalAction}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* BEDSIDE VITALS SLIDERS + TRAJECTORY CHART */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* INTERACTIVE VITALS ENTRY (7 COLS) */}
            <section className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Live Bedside Vitals Entry
                  </h3>
                </div>
                <span className="text-xs text-slate-500">Adjust sliders to test NEWS2 thresholds</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* 1. Respiratory Rate */}
                <VitalSliderCard
                  icon={<Wind className="w-4 h-4 text-sky-600" />}
                  label="Respiratory Rate"
                  value={activePatient.latestVitals.resp_rate}
                  unit="/min"
                  min={6}
                  max={36}
                  step={1}
                  score={activePatient.assessment.breakdown.resp_rate}
                  onChange={(val) => handleVitalChange('resp_rate', Number(val))}
                />

                {/* 2. SpO2 */}
                <VitalSliderCard
                  icon={<Droplets className="w-4 h-4 text-blue-600" />}
                  label={`SpO₂ (${activePatient.spo2_scale === 2 ? 'Scale 2' : 'Scale 1'})`}
                  value={activePatient.latestVitals.spo2}
                  unit="%"
                  min={80}
                  max={100}
                  step={1}
                  score={activePatient.assessment.breakdown.spo2}
                  onChange={(val) => handleVitalChange('spo2', Number(val))}
                />

                {/* 3. Systolic BP */}
                <VitalSliderCard
                  icon={<Activity className="w-4 h-4 text-rose-600" />}
                  label="Systolic BP"
                  value={activePatient.latestVitals.systolic_bp}
                  unit="mmHg"
                  min={70}
                  max={230}
                  step={2}
                  score={activePatient.assessment.breakdown.systolic_bp}
                  onChange={(val) => handleVitalChange('systolic_bp', Number(val))}
                />

                {/* 4. Heart Rate */}
                <VitalSliderCard
                  icon={<HeartPulse className="w-4 h-4 text-rose-500" />}
                  label="Heart Rate"
                  value={activePatient.latestVitals.heart_rate}
                  unit="bpm"
                  min={35}
                  max={160}
                  step={1}
                  score={activePatient.assessment.breakdown.heart_rate}
                  onChange={(val) => handleVitalChange('heart_rate', Number(val))}
                />

                {/* 5. Temperature */}
                <VitalSliderCard
                  icon={<Thermometer className="w-4 h-4 text-amber-600" />}
                  label="Temperature"
                  value={activePatient.latestVitals.temp}
                  unit="°C"
                  min={34.0}
                  max={41.0}
                  step={0.1}
                  score={activePatient.assessment.breakdown.temp}
                  onChange={(val) => handleVitalChange('temp', Number(val))}
                />

                {/* 6. Supplemental Oxygen Toggle */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Air or Oxygen?</span>
                    <ScoreBadge score={activePatient.assessment.breakdown.on_oxygen} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleVitalChange('on_oxygen', false)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        !activePatient.latestVitals.on_oxygen
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Room Air (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVitalChange('on_oxygen', true)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        activePatient.latestVitals.on_oxygen
                          ? 'bg-sky-600 text-white border-sky-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      On O₂ (+2)
                    </button>
                  </div>
                </div>
              </div>

              {/* 7. ACVPU Consciousness Selector */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-slate-700">Consciousness Level (ACVPU)</span>
                  </div>
                  <ScoreBadge score={activePatient.assessment.breakdown.consciousness} />
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { code: 'A', label: 'Alert' },
                    { code: 'C', label: 'Confusion' },
                    { code: 'V', label: 'Voice' },
                    { code: 'P', label: 'Pain' },
                    { code: 'U', label: 'Unresp.' }
                  ].map((item) => {
                    const active = activePatient.latestVitals.consciousness === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleVitalChange('consciousness', item.code)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          active
                            ? item.code === 'A'
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-rose-600 text-white border-rose-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>{item.code}</div>
                        <div className="text-[10px] font-normal opacity-90">{item.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* VITALS TRAJECTORY SVG CHART (5 COLS) */}
            <section className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Vitals & NEWS2 Trajectory
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {activePatient.history.length} readings
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Tracks Heart Rate, Systolic BP, and NEWS2 trend over time
                </p>

                <VitalsTrajectorySVG history={activePatient.history} spo2Scale={activePatient.spo2_scale} />
              </div>

              {/* Legend & Quick Trend Summary */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Heart Rate
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Systolic BP
                  </span>
                </div>
                <span className="text-slate-500">
                  Latest: <strong className="text-slate-800">{activePatient.latestVitals.time}</strong>
                </span>
              </div>
            </section>
          </div>

          {/* ====================================================================
              BOTTOM ACTION TABS (PROTOCOL / SBAR HANDOFF / HL7 FHIR EXPORT)
             ==================================================================== */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/80 px-3 pt-3 gap-2">
              <TabButton
                active={activeTab === 'protocol'}
                onClick={() => setActiveTab('protocol')}
                icon={<Stethoscope className="w-4 h-4" />}
                label="Escalation Protocol & qSOFA"
              />
              <TabButton
                active={activeTab === 'sbar'}
                onClick={() => setActiveTab('sbar')}
                icon={<FileText className="w-4 h-4" />}
                label="SBAR Handoff & Family Update"
              />
              <TabButton
                active={activeTab === 'fhir'}
                onClick={() => setActiveTab('fhir')}
                icon={<Code2 className="w-4 h-4" />}
                label="HL7 FHIR R4 Export"
              />
            </div>

            <div className="p-4 sm:p-6">
              {/* TAB 1: ESCALATION PROTOCOL & qSOFA BREAKDOWN */}
              {activeTab === 'protocol' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      RCP Monitoring Frequency & Response
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block">Observation Frequency</span>
                        <span className="font-bold text-slate-900">{activePatient.assessment.monitoringFreq}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block">Required Clinical Response</span>
                        <span className="font-medium text-slate-800">{activePatient.assessment.clinicalAction}</span>
                      </div>
                      {activePatient.assessment.redFlags.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                          Single-Parameter Red Flag (Score 3):{' '}
                          {activePatient.assessment.redFlags.join(', ').replace(/_/g, ' ').toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        qSOFA Sepsis Screening (Bedside)
                      </h4>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          activePatient.assessment.sepsisAlert
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Score: {activePatient.assessment.qsofaScore} / 3
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                        <span>Respiratory Rate ≥ 22 /min</span>
                        <span
                          className={`font-bold ${
                            activePatient.latestVitals.resp_rate >= 22 ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {activePatient.latestVitals.resp_rate >= 22
                            ? `YES (${activePatient.latestVitals.resp_rate})`
                            : `No (${activePatient.latestVitals.resp_rate})`}
                        </span>
                      </li>
                      <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                        <span>Systolic Blood Pressure ≤ 100 mmHg</span>
                        <span
                          className={`font-bold ${
                            activePatient.latestVitals.systolic_bp <= 100 ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {activePatient.latestVitals.systolic_bp <= 100
                            ? `YES (${activePatient.latestVitals.systolic_bp})`
                            : `No (${activePatient.latestVitals.systolic_bp})`}
                        </span>
                      </li>
                      <li className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                        <span>Altered Mentation (ACVPU ≠ Alert)</span>
                        <span
                          className={`font-bold ${
                            activePatient.latestVitals.consciousness !== 'A' ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {activePatient.latestVitals.consciousness !== 'A'
                            ? `YES (${activePatient.latestVitals.consciousness})`
                            : 'No (Alert)'}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: SBAR DOCTOR HANDOFF & PLAIN-LANGUAGE FAMILY UPDATE */}
              {activeTab === 'sbar' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Structured SBAR Clinician Escalation Note
                      </span>
                      <button
                        onClick={() => handleCopy('sbar', handoffData.doctorNote)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        {copiedKey === 'sbar' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'sbar' ? 'Copied Note' : 'Copy SBAR Note'}
                      </button>
                    </div>
                    <pre className="flex-1 p-4 rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                      {handoffData.doctorNote}
                    </pre>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Plain-Language Family Status Update
                      </span>
                      <button
                        onClick={() => handleCopy('family', handoffData.familyUpdate)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        {copiedKey === 'family' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'family' ? 'Copied Update' : 'Copy Family Update'}
                      </button>
                    </div>
                    <div className="flex-1 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-sm text-slate-800 leading-relaxed flex flex-col justify-between">
                      <p>{handoffData.familyUpdate}</p>
                      <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center gap-1.5 text-xs text-indigo-700">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>Translated automatically into compassionate, jargon-free language for bedside family updates.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: HL7 FHIR R4 EXPORT */}
              {activeTab === 'fhir' && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        HL7 FHIR R4 Interoperability Bundle (JSON)
                      </h4>
                      <p className="text-xs text-slate-500">
                        SNOMED-CT coded NEWS2 Observation resource ready for EHR ingestion
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy('fhir', fhirJsonString)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition cursor-pointer"
                      >
                        {copiedKey === 'fhir' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'fhir' ? 'Copied JSON' : 'Copy JSON'}
                      </button>
                      <button
                        onClick={() => handleDownloadFHIR(fhirJsonString)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download .json
                      </button>
                    </div>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-emerald-300 text-xs overflow-x-auto max-h-64 font-mono">
                    {fhirJsonString}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* ====================================================================
          ADMIT NEW PATIENT MODAL
         ==================================================================== */}
      {showAdmitModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Admit Patient to Ward 4B</h3>
              </div>
              <button
                onClick={() => setShowAdmitModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit} className="p-5 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Vikram Rao"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min={1}
                    max={115}
                    required
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bed Number</label>
                  <input
                    type="text"
                    required
                    value={newPatient.bed_number}
                    onChange={(e) => setNewPatient({ ...newPatient, bed_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Admitting Diagnosis</label>
                <input
                  type="text"
                  required
                  value={newPatient.condition}
                  onChange={(e) => setNewPatient({ ...newPatient, condition: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Oxygen Target Protocol</label>
                <select
                  value={newPatient.spo2_scale}
                  onChange={(e) => setNewPatient({ ...newPatient, spo2_scale: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>Scale 1 — Standard (Target ≥ 96%)</option>
                  <option value={2}>Scale 2 — COPD / Hypercapnic (Target 88–92%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Active Meds & Key Labs</label>
                <input
                  type="text"
                  value={newPatient.meds_and_labs}
                  onChange={(e) => setNewPatient({ ...newPatient, meds_and_labs: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdmitModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  Admit Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER SUB-COMPONENTS
// ============================================================================
function ScoreBadge({ score }) {
  const styles =
    score === 3
      ? 'bg-rose-600 text-white'
      : score === 2
      ? 'bg-amber-500 text-slate-950'
      : score === 1
      ? 'bg-yellow-200 text-slate-900'
      : 'bg-slate-200 text-slate-600';
  return (
    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${styles}`}>
      +{score} pt{score === 1 ? '' : 's'}
    </span>
  );
}

function VitalSliderCard({ icon, label, value, unit, min, max, step, score, onChange }) {
  return (
    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-semibold text-slate-700">{label}</span>
        </div>
        <ScoreBadge score={score} />
      </div>
      <div className="text-lg font-extrabold text-slate-900 mb-2">
        {value} <span className="text-xs font-medium text-slate-500">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-slate-900 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-t border-x transition cursor-pointer ${
        active
          ? 'bg-white text-slate-900 border-slate-200 -mb-px shadow-2xs'
          : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function VitalsTrajectorySVG({ history, spo2Scale }) {
  const width = 360;
  const height = 185;
  const padX = 32;
  const padY = 24;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const minVal = 40;
  const maxVal = 170;

  const getCoords = (index, val) => {
    const x =
      history.length === 1
        ? padX + plotW / 2
        : padX + (index / (history.length - 1)) * plotW;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const y = padY + plotH - ((clamped - minVal) / (maxVal - minVal)) * plotH;
    return { x, y };
  };

  const hrPoints = history.map((h, i) => getCoords(i, h.heart_rate));
  const bpPoints = history.map((h, i) => getCoords(i, h.systolic_bp));

  const toPath = (pts) =>
    pts.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');

  return (
    <div className="w-full bg-slate-50 rounded-xl border border-slate-200 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Horizontal Grid Lines */}
        {[60, 100, 140].map((tick) => {
          const { y } = getCoords(0, tick);
          return (
            <g key={tick}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text x={padX - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Systolic BP Line */}
        {bpPoints.length > 1 && (
          <path d={toPath(bpPoints)} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Heart Rate Line */}
        {hrPoints.length > 1 && (
          <path d={toPath(hrPoints)} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Data Points & X-Axis Labels */}
        {history.map((entry, idx) => {
          const hr = hrPoints[idx];
          const bp = bpPoints[idx];
          const news = calculateNEWS2(entry, spo2Scale).totalScore;
          return (
            <g key={`${entry.time}-${idx}`}>
              <circle cx={bp.x} cy={bp.y} r="4" fill="#4f46e5" />
              <circle cx={hr.x} cy={hr.y} r="4" fill="#f43f5e" />
              <text x={hr.x} y={height - 6} textAnchor="middle" className="fill-slate-600 text-[9px] font-semibold">
                {entry.time} (N:{news})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}