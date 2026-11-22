import { useState } from 'react'
import { Plus, X } from 'lucide-react'

// Admit Patient Modal
export function AdmitModal({ open, setOpen, onAddPatient, patients }) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    bed: patients.length + 1,
    diagnosis: '',
    spo2Scale: 1,
    medications: '',
    labs: '',
  })

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const newPatient = {
      id: Date.now(),
      name: form.name,
      age: form.age,
      bed: form.bed,
      condition: form.diagnosis,
      vitals: {
        respiratoryRate: 16,
        spo2: form.spo2Scale === 2 ? 90 : 96,
        spo2Scale: form.spo2Scale,
        supplementalO2: false,
        systolicBP: 120,
        heartRate: 80,
        temperature: 36.8,
        acvpu: 'A',
      },
      qSOFA: 0,
      timestamp: new Date().toISOString(),
    }
    onAddPatient(newPatient)
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
        <h3 className="text-xl font-bold mb-4">Admit Patient</h3>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Patient Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:border-rose-600 focus:outline-none"
                placeholder="e.g. Rohan Deshmukh"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:border-rose-600 focus:outline-none"
                placeholder="e.g. 65"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bed Number</label>
              <input
                type="number"
                value={form.bed}
                onChange={(e) => setForm({ ...form, bed: parseInt(e.target.value) || 1 })}
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:border-rose-600 focus:outline-none"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Diagnosis</label>
              <input
                type="text"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:border-rose-600 focus:outline-none"
                placeholder="e.g. Sepsis, COPD exacerbation"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">SpO2 Scale</label>
              <div className="space-y-1">
                <label className={`flex items-center px-2 py-1 rounded-lg border border-slate-300 cursor-pointer ${form.spo2Scale === 1 ? 'bg-rose-600 text-white' : 'bg-slate-200'}`}>
                  <input
                    type="radio"
                    name="spo2Scale"
                    value="1"
                    checked={form.spo2Scale === 1}
                    onChange={() => setForm({ ...form, spo2Scale: 1 })}
                    className="hidden"
                  />
                  <span>Scale 1</span>
                </label>
                <label className={`flex items-center px-2 py-1 rounded-lg border border-slate-300 cursor-pointer ${form.spo2Scale === 2 ? 'bg-rose-600 text-white' : 'bg-slate-200'}`}>
                  <input
                    type="radio"
                    name="spo2Scale"
                    value="2"
                    checked={form.spo2Scale === 2}
                    onChange={() => setForm({ ...form, spo2Scale: 2 })}
                    className="hidden"
                  />
                  <span>Scale 2 (COPD 88-92%)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Medications & Labs</label>
              <textarea
                value={form.medications}
                onChange={(e) => setForm({ ...form, medications: e.target.value })}
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:border-rose-600 focus:outline-none min-h-20"
                placeholder="e.g. IV antibiotics, fluids..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Additional Notes</label>
              <textarea
                value={form.labs}
                onChange={(e) => setForm({ ...form, labs: e.target.value })}
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:border-rose-600 focus:outline-none min-h-20"
                placeholder="e.g. Lactate 4.2, WBC elevated..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
            >
              Admit Patient
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main WardSidebar component
export function WardSidebar({ patients, onAddPatient, onSelect, onRemove }) {
  const [admitOpen, setAdmitOpen] = useState(false)

  // Sort patients: highest risk (NEWS2 desc) first, then by bed number
  const sortedPatients = [...patients].sort((a, b) => {
    if (b.news2Total !== a.news2Total) return b.news2Total - a.news2Total
    return a.bed - b.bed
  })

  return (
    <aside className="w-64 border-r border-slate-200 flex-shrink-0 h-screen overflow-y-auto bg-white shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold tracking-tight">WARD CENSUS ({patients.length})</h2>
        <p className="text-sm text-slate-500 mt-1">Sorted by clinical acuity</p>
      </div>

      <div className="p-2">
        {sortedPatients.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">
            No patients admitted yet.
          </p>
        )}

        <div className="space-y-1">
          {sortedPatients.map((patient) => {
            // Determine risk category and color
            const isRedSepsis = patient.news2Total >= 5
            const isAmber = patient.news2Total >= 3 && patient.news2Total < 5
            const isStable = patient.news2Total < 3

            const riskBadgeClass = isRedSepsis
              ? 'bg-rose-100 text-rose-800'
              : isAmber
                ? 'bg-amber-100 text-amber-800'
                : isStable
                  ? 'bg-emerald-100 text-emerald-800'
                  : ''

            const qsofaTag = patient.qSOFA > 0 && (
              <span className="text-xs font-medium bg-slate-100 text-slate-800 rounded px-1.5 py-0.5">
                qSOFA {patient.qSOFA}/3
              </span>
            )

            const spo2ScaleTag = patient.vitals?.spo2Scale === 2 && (
              <span className="text-xs font-medium bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">
                SpO2 Scale 2 (COPD)
              </span>
            )

            const conditionText = isRedSepsis && (
              <p className="text-xs font-medium text-rose-700">
                {patient.condition}
              </p>
            )
              || isAmber && (
                <p className="text-xs font-medium text-amber-700">
                  {patient.condition}
                </p>
              )
              || (
                <p className="text-xs text-slate-600">
                  {patient.condition}
                </p>
              )

            return (
              <div
                key={patient.id}
                className={`p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors select-none ${
                  patient.isSelected ? 'border-rose-500 bg-rose-50/50' : ''
                }`}
                onClick={() => onSelect(patient)}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg font-bold">
                      Bed {patient.bed}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${riskBadgeClass}`}>
                      {patient.news2Total}
                    </span>
                    <span className="text-sm font-medium truncate max-w-xs">
                      {patient.name.split(' ')[0]}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(patient.id)
                    }}
                    className="rounded-lg bg-white/5 p-1.5 hover:bg-white/10 transition-colors text-rose-500 text-xs"
                    aria-label="Remove patient"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  {conditionText}
                  {qsofaTag}
                  {spo2ScaleTag}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* + Admit button - dark slate */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={() => setAdmitOpen(true)}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-950 transition-colors"
        >
          + Admit
        </button>
      </div>

      {/* Admit Modal */}
      {admitOpen && (
        <AdmitModal
          open={admitOpen}
          setOpen={setAdmitOpen}
          onAddPatient={onAddPatient}
          patients={patients}
        />
      )}
    </aside>
  )
}