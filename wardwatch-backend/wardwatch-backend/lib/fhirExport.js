// HL7 FHIR R4 export. Vital signs use standard LOINC + UCUM codes.
// ACVPU, supplemental oxygen, NEWS2 and qSOFA use a LOCAL code system: map them to your
// terminology server (SNOMED CT / LOINC) before any real-world exchange.
import { randomUUID } from 'node:crypto';

const BASE = 'https://wardwatch.example/fhir';
const LOCAL = `${BASE}/CodeSystem/wardwatch`;
const UCUM = 'http://unitsofmeasure.org';
const LOINC = 'http://loinc.org';
const VITALS_CAT = [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }];
const SURVEY_CAT = [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey', display: 'Survey' }] }];

export function buildFhirBundle(patient, vitals, assessment, { now = new Date().toISOString(), newId = randomUUID } = {}) {
  const pRef = `Patient/${patient.id}`;
  const entries = [];
  const add = (resource) => {
    const id = resource.id || newId();
    entries.push({ fullUrl: `${BASE}/${resource.resourceType}/${id}`, resource: { ...resource, id } });
    return `${resource.resourceType}/${id}`;
  };

  add({
    resourceType: 'Patient', id: patient.id, active: true,
    name: [{ text: patient.name }],
    extension: [
      { url: `${BASE}/StructureDefinition/bed-location`, valueString: patient.bed_number },
      { url: `${BASE}/StructureDefinition/spo2-scale`, valueInteger: patient.spo2_scale },
    ],
  });

  const base = { resourceType: 'Observation', status: 'final', subject: { reference: pRef }, effectiveDateTime: now };
  const quantity = (value, unit, code) => ({ value, unit, system: UCUM, code });
  const vital = (loinc, display, q) => add({ ...base, category: VITALS_CAT, code: { coding: [{ system: LOINC, code: loinc, display }], text: display }, valueQuantity: q });

  const members = [
    vital('9279-1', 'Respiratory rate', quantity(vitals.resp_rate, '/min', '/min')),
    vital('2708-6', 'Oxygen saturation in Arterial blood', quantity(vitals.spo2, '%', '%')),
    vital('8480-6', 'Systolic blood pressure', quantity(vitals.systolic_bp, 'mmHg', 'mm[Hg]')),
    vital('8867-4', 'Heart rate', quantity(vitals.heart_rate, 'bpm', '/min')),
    vital('8310-5', 'Body temperature', quantity(vitals.temp, 'Cel', 'Cel')),
    add({ ...base, category: VITALS_CAT, code: { coding: [{ system: LOCAL, code: 'supplemental-oxygen', display: 'Supplemental oxygen' }], text: 'Supplemental oxygen' }, valueBoolean: vitals.on_oxygen }),
    add({ ...base, category: VITALS_CAT, code: { coding: [{ system: LOCAL, code: 'acvpu', display: 'ACVPU level of consciousness' }], text: 'ACVPU level of consciousness' }, valueString: vitals.consciousness }),
  ].map((reference) => ({ reference }));

  const c = (key, text) => ({ code: { text }, valueInteger: assessment.breakdown[key] });
  add({
    ...base, category: SURVEY_CAT,
    code: { coding: [{ system: LOCAL, code: 'news2-total', display: 'NEWS2 total score (RCP 2017)' }], text: 'NEWS2 total score' },
    valueInteger: assessment.totalScore,
    interpretation: [{ text: `${assessment.riskLevel} clinical risk${assessment.singleRedFlag ? ' (single-parameter red flag)' : ''}` }],
    note: [{ text: `Escalation: ${assessment.clinicalAction} Monitoring: ${assessment.monitoringFreq}. SpO2 Scale ${assessment.spo2Scale} used.` }],
    hasMember: members,
    component: [
      c('resp_rate', 'Respiratory rate points'), c('spo2', `SpO2 Scale ${assessment.spo2Scale} points`), c('on_oxygen', 'Supplemental oxygen points'),
      c('systolic_bp', 'Systolic BP points'), c('heart_rate', 'Heart rate points'), c('temp', 'Temperature points'), c('consciousness', 'Consciousness points'),
    ],
  });

  add({
    ...base, category: SURVEY_CAT,
    code: { coding: [{ system: LOCAL, code: 'qsofa', display: 'qSOFA sepsis screening score' }], text: 'qSOFA score' },
    valueInteger: assessment.qsofaScore,
    interpretation: [{ text: assessment.sepsisAlert ? 'Positive screen (>=2 criteria)' : 'Negative screen' }],
    note: assessment.qsofaCriteria.length ? [{ text: `Criteria met: ${assessment.qsofaCriteria.join('; ')}` }] : undefined,
  });

  return { resourceType: 'Bundle', id: `wardwatch-${patient.id}-${Date.parse(now)}`, type: 'collection', timestamp: now, entry: entries };
}
