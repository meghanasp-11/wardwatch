import { useState } from 'react'
import { Plus } from 'lucide-react'

// Import utilities and components
import news2 from './utils/news2'
import {
  generateFHIRBundle,
  downloadFHIRBundle,
  generateRRObservation,
  generateSpO2Observation,
  generateSBPObservation,
  generateHRObservation,
  generateTempObservation,
  generateACVPUObservation,
  generateqSOFAObservation,
  generatePatientResource,
} from './utils/fhir'
import { Header } from './components/Header'
import { WardSidebar } from './components/WardSidebar'
import { PatientWorkspace } from './components/PatientWorkspace'

// ============================================================
// SAMPLE PATIENT DATA (6 realistic ward patients)
// ============================================================

// Patient 1: High Risk - Red Sepsis
const patient1 = {
  id: 1,
  name: 'Rohan Deshmukh',
  condition: 'Sepsis (LRTI)',
  bed: 4,
  vitals: {
    respiratoryRate: 28,
    spo2: 89,
    spo2Scale: 1,
    supplementalO2: true,
    systolicBP: 95,
    heartRate: 118,
    temperature: 38.9,
    acvpu: 'C',
  },
  timestamp: new Date().toISOString(),
}

// Patient 2: High Risk - Severe sepsis
const patient2 = {
  id: 2,
  name: 'Meera Krishnan',
  condition: 'Respiratory Failure',
  bed: 7,
  vitals: {
    respiratoryRate: 22,
    spo2: 92,
    spo2Scale: 1,
    supplementalO2: true,
    systolicBP: 88,
    heartRate: 125,
    temperature: 39.2,
    acvpu: 'V',
  },
  timestamp: new Date().toISOString(),
}

// Patient 3: Medium Risk - COPD Exacerbation (Scale 2)
const patient3 = {
  id: 3,
  name: 'Arthur Pendelton',
  condition: 'COPD Exacerbation',
  bed: 12,
  vitals: {
    respiratoryRate: 18,
    spo2: 88,
    spo2Scale: 2, // COPD Scale 2 - target 88-92%
    supplementalO2: true,
    systolicBP: 110,
    heartRate: 92,
    temperature: 37.1,
    acvpu: 'A',
  },
  timestamp: new Date().toISOString(),
}

// Patient 4: Medium Risk - COPD on Scale 2
const patient4 = {
  id: 4,
  name: 'Marcus Thorne',
  condition: 'COPD on Scale 2',
  bed: 5,
  vitals: {
    respiratoryRate: 14,
    spo2: 90,
    spo2Scale: 2, // COPD Scale 2
    supplementalO2: true,
    systolicBP: 115,
    heartRate: 88,
    temperature: 36.9,
    acvpu: 'A',
  },
  timestamp: new Date().toISOString(),
}

// Patient 5: Low Risk - Stable
const patient5 = {
  id: 5,
  name: 'Eleanor Vance',
  condition: 'Observation - Dehydration',
  bed: 15,
  vitals: {
    respiratoryRate: 14,
    spo2: 97,
    spo2Scale: 1,
    supplementalO2: false,
    systolicBP: 132,
    heartRate: 76,
    temperature: 36.5,
    acvpu: 'A',
  },
  timestamp: new Date().toISOString(),
}

// Patient 6: Low Risk - Stable
const patient6 = {
  id: 6,
  name: 'Priya Nair',
  condition: 'Post-op Recovery',
  bed: 9,
  vitals: {
    respiratoryRate: 16,
    spo2: 98,
    spo2Scale: 1,
    supplementalO2: false,
    systolicBP: 128,
    heartRate: 72,
    temperature: 36.7,
    acvpu: 'A',
  },
  timestamp: new Date().toISOString(),
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================

export default function App() {
  // Ward census state - all 6 patients
  const [patients, setPatients] = useState([patient1, patient2, patient3, patient4, patient5, patient6])

  // Active/selected patient for workspace
  const [activePatient, setActivePatient] = useState(null)

  // Vitals change handler
  const handleVitalChange = (updatedVitals, patientId) => {
    setPatients(patients.map((p) =>
      p.id === patientId
        ? { ...p, vitals: updatedVitals }
        : p
    ))
  }

  // Simulate +2 Hours handler
  const handleSimulate = (patientId) => {
    const patient = patients.find(p => p.id === patientId)
    if (!patient) return

    const worsened = { ...patient.vitals }

    // Realistic worsening pattern
    worsened.respiratoryRate = Math.min(40, worsened.respiratoryRate + 3)
    worsened.systolicBP = Math.max(50, worsened.systolicBP - 8)
    worsened.heartRate = Math.min(200, worsened.heartRate + 10)
    worsened.temperature = Math.min(43, worsened.temperature + 0.4)
    worsened.spo2 = Math.max(70, Math.min(100, worsened.spo2 - 1))

    // If severely worsened, set ACVPU to Confused
    const news2Result = news2.calculateNews2(worsened)
    if (news2Result.total >= 8) {
      worsened.acvpu = 'C'
    }

    handleVitalChange(worsened, patient.id)
  }

  // Add patient handler (from AdmitModal)
  const handleAddPatient = (newPatient) => {
    setPatients([...patients, newPatient])
  }

  // Patient select handler
  const handlePatientSelect = (patient) => {
    setActivePatient(patient)
  }

  // Patient remove handler
  const handleRemovePatient = (patientId) => {
    setPatients(patients.filter((p) => p.id !== patientId))
    if (activePatient?.id === patientId) {
      setActivePatient(null)
    }
  }

  // FHIR export handler
  const handleFHIRExport = (patient) => {
    // Generate observations
    const observations = [
      generateRRObservation(`rr-${patient.id}`, patient.id, patient.vitals.respiratoryRate, patient.vitals.timestamp, patient.id),
      generateSpO2Observation(`spo2-${patient.id}`, patient.id, patient.vitals.spo2, patient.vitals.spo2Scale, patient.vitals.timestamp, patient.id),
      generateSBPObservation(`sbp-${patient.id}`, patient.id, patient.vitals.systolicBP, patient.vitals.timestamp, patient.id),
      generateHRObservation(`hr-${patient.id}`, patient.id, patient.vitals.heartRate, patient.vitals.timestamp, patient.id),
      generateTempObservation(`temp-${patient.id}`, patient.id, patient.vitals.temperature, patient.vitals.timestamp, patient.id),
      generateACVPUObservation(`acvpu-${patient.id}`, patient.id, patient.vitals.acvpu, patient.vitals.timestamp, patient.id),
      generateqSOFAObservation(`qsofa-${patient.id}`, patient.id, 0, patient.vitals.timestamp, patient.id),
    ]

    // Generate patient resource
    const patientResource = generatePatientResource({
      id: patient.id,
      firstName: patient.name.split(' ')[0],
      lastName: patient.name.split(' ')[1] || 'Patient',
      dob: '1980-01-01',
      gender: 'Unknown',
      bedNumber: patient.bed,
      admissionTime: patient.vitals.timestamp,
    })

    // Generate bundle
    const bundle = generateFHIRBundle({
      patient: patientResource,
      observations,
      generatedAt: new Date().toISOString(),
    })

    // Download
    downloadFHIRBundle(bundle, `wardwatch-${patient.id}.json`)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sticky Header */}
      <Header patients={patients} />

      {/* Main layout: two-column grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">

          {/* LEFT: Ward Sidebar */}
          <WardSidebar
            patients={patients}
            onAddPatient={handleAddPatient}
            onSelect={handlePatientSelect}
            onRemove={handleRemovePatient}
          />

          {/* RIGHT: Patient Workspace */}
          <div className="space-y-4">
            {/* Patient workspace shows when a patient is selected */}
            {activePatient ? (
              <PatientWorkspace
                patient={activePatient}
                onVitalChange={handleVitalChange}
                onSimulate={() => {
                  // Simulate for the active patient only
                  handleSimulate(activePatient.id)
                }}
                onSBAR={() => alert('SBAR generated for ' + activePatient.name)}
                onFHIR={() => handleFHIRExport(activePatient)}
                onRemove={() => handleRemovePatient(activePatient.id)}
              />
            ) : (
              // Welcome state
              <div className="flex min-h-[500px] items-center justify-center p-8 text-slate-500">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">WardWatch Clinical Triage</h2>
                  <p className="text-lg mb-6">
                    Select a patient from the ward census on the left to open the clinical workspace.
                  </p>
                  <button
                    onClick={() => alert('Use the + Admit button in the ward census sidebar to add patients.')}
                    className="rounded-lg bg-rose-600 px-6 py-3 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
                  >
                    + Admit New Patient
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}