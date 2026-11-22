/**
 * WardWatch HL7 FHIR R4 Exporter
 * Generates Patient and Observation resources per FHIR R4 specification
 * Outputs a bundle containing Patient + multiple Observation resources
 */

/**
 * Generate a FHIR Patient resource
 */
export function generatePatientResource({ id, firstName, lastName, dob, gender, bedNumber, admissionTime }) {
  return {
    resourceType: 'Patient',
    id: `patient-${id}`,
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    text: {
      status: 'generated',
      div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Name:</b> ${firstName} ${lastName}</p><p><b>Bed:</b> ${bedNumber}</p><p><b>DOB:</b> ${dob}</p><p><b>Gender:</b> ${gender}</p><p><b>Admission:</b> ${admissionTime}</p></div>`,
    },
    name: [{ use: 'official', family: lastName, given: [firstName] }],
    gender: gender,
    birthDate: dob,
  };
}

/**
 * Generate a FHIR Observation resource
 */
function generateObservation({ id, status, category, code, subject, effectiveDateTime, valueQuantity, interpretation }) {
  return {
    resourceType: 'Observation',
    id,
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    status,
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code }] }],
    code: typeof code === 'string' ? { coding: [{ system: 'http://loinc.org', code }] } : code,
    subject: typeof subject === 'string' ? { reference: `Patient/${subject}` } : subject,
    effectiveDateTime,
    valueQuantity,
    ...(interpretation && { interpretation }),
  };
}

/**
 * Generate RR Observation
 */
export function generateRRObservation(id, subject, value, effectiveDateTime, patientRef) {
  return generateObservation({
    id,
    status: 'final',
    category: 'vital-signs',
    code: { coding: [{ system: 'http://loinc.org', code: '21978-3', display: 'Respiratory rate' }] },
    subject: typeof subject === 'string' ? { reference: `Patient/${patientRef}` } : subject,
    effectiveDateTime: effectiveDateTime,
    valueQuantity: {
      value,
      unit: 'breaths/min',
      system: 'http://unitsofmeasure.org',
      code: '/min',
    },
  });
}

/**
 * Generate SpO2 Observation (supports Scale 1 and Scale 2)
 */
export function generateSpO2Observation(id, subject, value, scale, effectiveDateTime, patientRef) {
  const isScale2 = scale === 2;

  return generateObservation({
    id,
    status: 'final',
    category: 'vital-signs',
    code: isScale2
      ? { coding: [{ system: 'http://loinc.org', code: '2706-6', display: 'Pulse oximetry %SpO2 in arterial blood (SmO2)' }] }
      : { coding: [{ system: 'http://loinc.org', code: '2706-6', display: 'Oxygen saturation in arterial blood by pulse oximetry (SpO2)' }] },
    subject: typeof subject === 'string' ? { reference: `Patient/${patientRef}` } : subject,
    effectiveDateTime: effectiveDateTime,
    valueQuantity: {
      value,
      unit: isScale2 ? '% SpO2 (COPD target 88-92%)' : '%',
      system: 'http://unitsofmeasure.org',
      code: '2706-6',
    },
  });
}

/**
 * Generate SBP Observation
 */
export function generateSBPObservation(id, subject, value, effectiveDateTime, patientRef) {
  return generateObservation({
    id,
    status: 'final',
    category: 'vital-signs',
    code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
    subject: typeof subject === 'string' ? { reference: `Patient/${patientRef}` } : subject,
    effectiveDateTime: effectiveDateTime,
    valueQuantity: {
      value,
      unit: 'mmHg',
      system: 'http://unitsofmeasure.org',
      code: 'mm[Hg]',
    },
  });
}

/**
 * Generate HR Observation
 */
export function generateHRObservation(id, subject, value, effectiveDateTime, patientRef) {
  return generateObservation({
    id,
    status: 'final',
    category: 'vital-signs',
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    subject: typeof subject === 'string' ? { reference: `Patient/${patientRef}` } : subject,
    effectiveDateTime: effectiveDateTime,
    valueQuantity: {
      value,
      unit: 'beats/min',
      system: 'http://unitsofmeasure.org',
      code: '/min',
    },
  });
}

/**
 * Generate Temperature Observation
 */
export function generateTempObservation(id, subject, value, effectiveDateTime, patientRef) {
  return generateObservation({
    id,
    status: 'final',
    category: 'vital-signs',
    code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }] },
    subject: typeof subject === 'string' ? { reference: `Patient/${patientRef}` } : subject,
    effectiveDateTime: effectiveDateTime,
    valueQuantity: {
      value,
      unit: '°C',
      system: 'http://unitsofmeasure.org',
      code: '°C',
    },
  });
}

/**
 * Generate ACVPU Observation
 */
export function generateACVPUObservation(id, subject, value, effectiveDateTime, patientRef) {
  return generateObservation({
    id,
    status: 'final',
    category: 'vital-signs',
    code: { coding: [{ system: 'http://loinc.org', code: '87116-0', display: 'Consciousness code (ACVPU)' }] },
    subject: typeof subject === 'string' ? { reference: `Patient/${patientRef}` } : subject,
    effectiveDateTime: effectiveDateTime,
    valueQuantity: {
      value,
      unit: 'code',
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: value,
    },
  });
}

/**
 * Generate qSOFA Observation
 */
export function generateqSOFAObservation(id, subject, score, effectiveDateTime, patientRef) {
  return generateObservation({
    id,
    status: 'final',
    category: 'clinical-impression',
    code: { coding: [{ system: 'http://loinc.org', code: '9492-6', display: 'qSOFA score' }] },
    subject: typeof subject === 'string' ? { reference: `Patient/${patientRef}` } : subject,
    effectiveDateTime: effectiveDateTime,
    valueQuantity: {
      value: score,
      unit: 'score',
      system: 'http://unitsofmeasure.org',
      code: '0-3',
    },
  });
}

/**
 * Generate a complete FHIR Bundle with Patient + Observations
 */
export function generateFHIRBundle({ patient, observations, generatedAt }) {
  const entries = [
    { resource: patient, resourceType: 'Patient' },
  ]

  observations.forEach((obs) => {
    entries.push({ resource: obs })
  })

  return {
    resourceType: 'Bundle',
    id: `bundle-${Date.now()}`,
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    type: 'collection',
    timestamp: generatedAt || new Date().toISOString(),
    entry: entries,
  }
}

/**
 * Export FHIR bundle as downloadable JSON
 */
export function downloadFHIRBundle(bundle, filename = 'wardwatch-fhir-bundle.json') {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}