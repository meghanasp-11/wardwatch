import {
  X,
  Plus,
  Heart,
  Globe,
  Thermometer,
  Activity,
  AlertCircle,
  Info,
  Copy,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  HeartPulse,
  Stethoscope,
  Pill,
  AlertTriangle,
} from 'lucide-react'

// Import news2 functions
import {
  calculateNews2,
  checkqSOFA,
  checkSingleParameterRedFlag,
  getNews2Grade,
  scoreVital,
} from '../utils/news2'

// Import FHIR functions
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
} from '../utils/fhir'

// SVG Trend Chart - clean line chart with HR (rose) and SBP (indigo)
function TrendChart({ readings }) {
  if (!readings || readings.length < 2) {
    return (
      <div className="p-2 text-sm text-slate-500 text-center">
        No trend data yet — record vitals to see charts
      </div>
    )
  }

  const width = 420
  const height = 180
  const padding = 35
  const plotWidth = width - padding * 2
  const plotHeight = height - padding * 2

  // Extract data series
  const hrReadings = readings.map(r => ({
    x: new Date(r.timestamp).getTime(),
    y: r.heartRate,
  }))
  const sbpReadings = readings.map(r => ({
    x: new Date(r.timestamp).getTime(),
    y: r.systolicBP,
  }))

  // Determine ranges
  const allHR = hrReadings.map(r => r.y)
  const allSBP = sbpReadings.map(r => r.y)
  const hrMin = Math.min(...allHR) - 5
  const hrMax = Math.max(...allHR) + 5
  const sbpMin = Math.min(...allSBP) - 10
  const sbpMax = Math.max(...allSBP) + 10

  // Scale functions
  const hrScale = (v) => ((v - hrMin) / (hrMax - hrMin)) * plotHeight + padding
  const sbpScale = (v) => ((v - sbpMin) / (sbpMax - sbpMin)) * plotHeight + padding

  // Generate path data
  const generatePath = (readings, scale) => {
    const points = readings.map((r, i) => {
      const x = (i / (readings.length - 1)) * plotWidth + padding
      const y = scale(r.y)
      return `${x},${y}`
    })
    return `M${points.join('L')}`
  }

  const hrPath = generatePath(hrReadings, hrScale)
  const sbpPath = generatePath(sbpReadings, sbpScale)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="rounded-lg border-slate-200"
      aria-label="Vitals trajectory chart"
    >
      {/* Background */}
      <rect width="100%" height="100%" fill="white" />

      {/* HR line - rose */}
      <path
        d={hrPath}
        stroke="#f43f5e"
        stroke-width={2}
        fill="none"
      />

      {/* SBP line - indigo */}
      <path
        d={sbpPath}
        stroke="#4f46e5"
        stroke-width={2}
        fill="none"
      />

      {/* X axis with timestamp labels */}
      <g className="text-xs text-slate-400">
        {readings.map((r, i) => {
          const x = (i / (readings.length - 1)) * plotWidth + padding
          const label = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <g key={i}>
              <line
                x1={x}
                y1={height - padding}
                x2={x}
                y2={height - padding + 6}
                stroke="slate-200"
                strokeWidth={1}
              />
              <text
                x={x}
                y={height - padding + 18}
                textAnchor="middle"
                fill="slate-300"
              >
                {label} (N:{r.news2 || 0})
              </text>
            </g>
          )}
        )}
      </g>

      {/* Y axis labels */}
      <g>
        <text
          x="-10"
          y={height / 2}
          textAnchor="middle"
          transform="rotate(-90)"
          fontSize="10"
          fill="slate-300"
        >
          SBP (mmHg)
        </text>
        <text
          x={padding / 2}
          y={15}
          textAnchor="start"
          fontSize="10"
          fill="slate-300"
        >
          HR (bpm)
        </text>
      </g>

      {/* Legend */}
      <g>
        <line
          x1={width - 70}
          y1={15}
          x2={width - 56}
          y2={15}
          stroke="#f43f5e"
          strokeWidth={2}
        />
        <text x={width - 50} y={18} fontSize="8" fill="slate-400">HR</text>

        <line
          x1={width - 70}
          y1={30}
          x2={width - 56}
          y2={30}
          stroke="#4f46e5"
          strokeWidth={2}
        />
        <text x={width - 50} y={33} fontSize="8" fill="slate-400">SBP</text>
      </g>
    </svg>
  )
}

// Vitals Control - interactive bedside sliders
function VitalsControl({ patient, onChange, onSimulate }) {
  // Default vitals
  const defaults = {
    respiratoryRate: 16,
    spo2: 96,
    spo2Scale: 1,
    supplementalO2: false,
    systolicBP: 120,
    heartRate: 80,
    temperature: 36.8,
    acvpu: 'A',
  }

  const vitals = patient.vitals || { ...defaults }
  const news2 = calculateNews2({
    respiratoryRate: vitals.respiratoryRate,
    spo2: vitals.spo2,
    spo2Scale: vitals.spo2Scale,
    supplementalO2: vitals.supplementalO2,
    systolicBP: vitals.systolicBP,
    heartRate: vitals.heartRate,
    temperature: vitals.temperature,
    acvpu: vitals.acvpu,
  })

  // Point pill badge colors
  const pointColor = (score) => {
    if (score === 0) return 'bg-slate-300 text-slate-800'
    if (score === 1) return 'bg-amber-500 text-white'
    if (score === 2) return 'bg-orange-500 text-white'
    return 'bg-red-500 text-white'
  }

  // Simulate +2 Hours - realistic worsening
  const simulateVitals = () => {
    const worsened = { ...vitals }

    // Realistic deterioration patterns
    worsened.respiratoryRate = Math.min(40, worsened.respiratoryRate + (Math.random() * 4 + 2))
    worsened.systolicBP = Math.max(50, worsened.systolicBP - (Math.random() * 10 + 3))
    worsened.heartRate = Math.min(200, worsened.heartRate + (Math.random() * 10 + 5))
    worsened.temperature = Math.min(43, worsened.temperature + Math.random() * 0.4 + 0.2)
    worsened.spo2 = Math.max(70, Math.min(100, worsened.spo2 - Math.random() * 1 - 0.5))

    // If severely worsened, set ACVPU to Confused
    if (news2.total >= 8) {
      worsened.acvpu = 'C'
    }

    onChange(worsened)
  }

  // Recalculate NEWS2 + qSOFA
  const qsofa = checkqSOFA(
    vitals.respiratoryRate,
    vitals.systolicBP,
    vitals.acvpu
  )

  return (
    <div className="space-y-5">
      {/* RESPIRATORY RATE */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Respiratory Rate
        </label>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-base font-medium">{vitals.respiratoryRate} breaths/min</span>

          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => i + 8).map((rr) => (
              <span
                key={rr}
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                  scoreVital(rr, vitals.spo2Scale === 2 ? 'scale2' : 'scale1') === 1 ? 'bg-amber-100 text-amber-800' :
                  scoreVital(rr, vitals.spo2Scale === 2 ? 'scale2' : 'scale1') === 3 ? 'bg-red-100 text-red-800' :
                  'bg-slate-200 text-slate-600'
                }`}
              >
                {rr}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-1 relative">
          <input
            type="range"
            min="8"
            max="30"
            value={vitals.respiratoryRate}
            onChange={(e) => onChange({ ...vitals, respiratoryRate: parseInt(e.target.value) })}
            className="w-full rounded-lg h-1.5 bg-slate-200 appearance-none"
          />
          <span
            className="absolute right-2 transform -translate-y-1/2 text-xs"
            style={{ left: `${(vitals.respiratoryRate - 8) / 22 * 100}%` }}
          >
            {vitals.respiratoryRate}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs mt-1">
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 ${pointColor(news2.perVital.respiratoryRate)}`}>
            +{news2.perVital.respiratoryRate}
          </span>
          {news2.flags.singleParameterRedFlag && (
            <span className="text-rose-500 text-xs">⚡ Red flag</span>
          )}
        </div>
      </div>

      {/* SpO2 */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span>
            SpO2 {vitals.spo2}%
            {vitals.spo2Scale === 2 && (
              <span className="text-xs ml-1 bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">
                Scale 2
              </span>
            )}
          </span>
          <span className="text-xs">
            {vitals.supplementalO2 ? 'O2' : 'RA'}
          </span>
        </div>

        <div className="flex-1 relative">
          <input
            type="range"
            min="80"
            max="100"
            value={vitals.spo2}
            onChange={(e) => onChange({ ...vitals, spo2: parseInt(e.target.value) })}
            className="w-full rounded-lg h-1.5 bg-slate-200 appearance-none"
          />
          <span
            className="absolute right-2 transform -translate-y-1/2 text-xs"
            style={{ left: `${(vitals.spo2 - 80) / 20 * 100}%` }}
          >
            {vitals.spo2}%
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs mt-1">
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 ${pointColor(news2.perVital.spo2)}`}>
            +{news2.perVital.spo2}
          </span>
        </div>
      </div>

      {/* Supplemental O2 toggle */}
      {vitals.spo2 < 94 && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <span className="text-xs font-medium text-amber-700">
            Supplemental O2: ON
          </span>
          <button
            onClick={() => onChange({ ...vitals, supplementalO2: !vitals.supplementalO2 })}
            className="rounded-lg bg-white p-1.5 hover:bg-slate-50 text-xs hover:text-amber-600 transition-colors"
            aria-label="Toggle supplemental O2"
          >
            {vitals.supplementalO2 ? 'OFF' : 'ON'}
          </button>
        </div>
      )}

      {/* Systolic BP */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Systolic BP
        </label>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-base font-medium">{vitals.systolicBP} mmHg</span>

          <div className="flex gap-1">
            {Array.from({ length: 7 }, (_, i) => 90 + i * 10).map((sbp) => (
              <span
                key={sbp}
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                  sbp === vitals.systolicBP ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {sbp}
              </span>
            ))}
          </div>
        </div>

        <input
          type="range"
          min="70"
          max="200"
          value={vitals.systolicBP}
          onChange={(e) => onChange({ ...vitals, systolicBP: parseInt(e.target.value) })}
          className="w-full rounded-lg h-1.5 bg-slate-200 appearance-none"
        />
        <span
          className="absolute right-2 transform -translate-y-1/2 text-xs"
          style={{ left: `${(vitals.systolicBP - 70) / 130 * 100}%` }}
        >
          {vitals.systolicBP} mmHg
        </span>
      </div>

      {/* Heart Rate */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Heart Rate
        </label>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-base font-medium">{vitals.heartRate} bpm</span>

          <div className="flex gap-1">
            {Array.from({ length: 9 }, (_, i) => 50 + i * 5 + 1).map((hr) => (
              <span
                key={hr}
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                  hr === vitals.heartRate ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {hr}
              </span>
            ))}
          </div>
        </div>

        <input
          type="range"
          min="40"
          max="130"
          value={vitals.heartRate}
          onChange={(e) => onChange({ ...vitals, heartRate: parseInt(e.target.value) })}
          className="w-full rounded-lg h-1.5 bg-slate-200 appearance-none"
        />
        <span
          className="absolute right-2 transform -translate-y-1/2 text-xs"
          style={{ left: `${(vitals.heartRate - 40) / 90 * 100}%` }}
        >
          {vitals.heartRate} bpm
        </span>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Temperature
        </label>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-base font-medium">
            {vitals.temperature.toFixed(1)}°C
          </span>

          <div className="flex gap-1">
            { [35.0, 35.5, 36.0, 36.5, 37.0, 37.5, 38.0, 38.5, 39.0, 39.5].map((temp) => {
              const near = Math.abs(temp - vitals.temperature) < 0.15
              return (
                <span
                  key={temp}
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                    near ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {temp.toFixed(1)}
                </span>
              )
            })}
          </div>
        </div>

        <input
          type="range"
          min="35.0"
          max="41.0"
          step="0.1"
          value={vitals.temperature}
          onChange={(e) => onChange({ ...vitals, temperature: parseFloat(e.target.value) })}
          className="w-full rounded-lg h-1.5 bg-slate-200 appearance-none"
        />
        <span
          className="absolute right-2 transform -translate-y-1/2 text-xs"
          style={{ left: `${(vitals.temperature - 35) / 6 * 100}%` }}
        >
          {vitals.temperature.toFixed(1)}°C
        </span>
      </div>

      {/* ACVPU Consciousness Selector - 5 buttons */}
      <div>
        <label className="block text-sm font-medium mb-2.5">
          ACVPU Consciousness
        </label>
        <div className="flex gap-1">
          {[
            { key: 'A', label: 'Alert', color: 'emerald-600', bg: 'emerald-100' },
            { key: 'C', label: 'Confused', color: 'amber-600', bg: 'amber-100' },
            { key: 'V', label: 'Voice', color: 'blue-600', bg: 'blue-100' },
            { key: 'P', label: 'Pain', color: 'orange-600', bg: 'orange-100' },
            { key: 'U', label: 'Unresp', color: 'rose-600', bg: 'rose-100' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => onChange({ ...vitals, acvpu: opt.key })}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                vitals.acvpu === opt.key
                  ? `bg-rose-600 text-white`
                  : `border border-slate-300 hover:bg-slate-50 transition-colors ${pointColor(news2.perVital.acvpu)}`
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {news2.perVital.acvpu > 0 && (
          <div className="mt-1.5 text-xs text-rose-500">
            ⚡ +{news2.perVital.acvpu} pts
          </div>
        )}
      </div>
    </div>
  )
}

// Escalation Banner - color-coded RCP NEWS2 + qSOFA
function EscalationBanner({ patient }) {
  const news2Result = calculateNews2(patient.vitals)
  const grade = getNews2Grade(news2Result.total)
  const qsofaResult = checkqSOFA(
    patient.vitals.respiratoryRate,
    patient.vitals.systolicBP,
    patient.vitals.acvpu
  )

  // Clinical action based on NEWS2 + qSOFA
  let clinicalAction = ''
  if (news2Result.total >= 5) {
    clinicalAction = 'ESCALATE NOW - Review by senior clinician / ITU activation'
  } else if (news2Result.total >= 3) {
    clinicalAction = 'URGENT REVIEW - Assess within 30 min, repeat obs, consider investigations'
  } else if (qsofaResult.possibleSepsis && news2Result.total >= 2) {
    clinicalAction = 'SEPSIS SCREEN - Blood cultures, lactate, broad-spectrum antibiotics'
  } else if (qsofaResult.possibleSepsis) {
    clinicalAction = 'MONITOR - Repeat qSOFA in 1-2 hours, observe for deterioration'
  } else if (news2Result.total >= 1) {
    clinicalAction = 'REVIEW - Assess clinically, observe, repeat NEWS2 in 1-2 hours'
  } else {
    clinicalAction = 'ROUTINE - Continue standard monitoring'
  }

  // Single parameter red flag
  const hasRedFlag = checkSingleParameterRedFlag(news2Result.perVital)

  const severityClass = news2Result.total >= 5 ? 'rose-500' : news2Result.total >= 3 ? 'amber-500' : 'emerald-500'
  const severityBg = news2Result.total >= 5 ? 'rose-100' : news2Result.total >= 3 ? 'amber-100' : 'emerald-100'
  const severityText = news2Result.total >= 5 ? 'rose-800' : news2Result.total >= 3 ? 'amber-800' : 'emerald-800'

  return (
    <div className={`p-3 rounded-lg mb-3 border ${severityClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium mb-1">Clinical Escalation Status</h4>
          <p className={`text-sm ${severityText}`}>
            NEWS2: {news2Result.total} ({grade.description})
          </p>
        </div>

        {/* qSOFA badge */}
        {qsofaResult.possibleSepsis && (
          <div className="ml-2">
            <span className="text-xs font-medium bg-rose-100 text-rose-700 rounded px-2 py-0.5">
              SEPSIS SCREEN POSITIVE (qSOFA {qsofaResult.qSOFAScore}/3)
            </span>
          </div>
        )}

        {/* Red flag indicator */}
        {hasRedFlag && (
          <div className="mt-1 text-xs text-rose-600">
            ⚠️ Single-vital score-of-3 red flag - immediate review required
          </div>
        )}
      </div>

      {/* Clinical action */}
      <div className="mt-2 text-xs">
        <strong>RCP Action:</strong> {clinicalAction}
      </div>
    </div>
  )
}

// SBAR Handoff & Family Update
function SBARHandoff({ patient }) {
  const news2Result = calculateNews2(patient.vitals)
  const qsofaResult = checkqSOFA(
    patient.vitals.respiratoryRate,
    patient.vitals.systolicBP,
    patient.vitals.acvpu
  )
  const grade = getNews2Grade(news2Result.total)
  const vitals = patient.vitals

  const admissionTime = patient.vitals.admissionTime
    ? new Date(patient.vitals.admissionTime).toLocaleString('en-IN', { hour12: false })
    : 'Not recorded'

  const sbar = {
    situation: `
Patient: ${patient.name} (Bed ${patient.bed})
${news2Result.total > 0 ? `NEWS2: ${news2Result.total} (${grade.category})` : 'NEWS2: 0 - Normal'}
qSOFA: ${qsofaResult.qSOFAScore}/3 — ${qsofaResult.interpretation}

**Current Vital Signs:**
• RR: ${vitals.respiratoryRate} breaths/min
• SpO2: ${vitals.spo2}% (${vitals.spo2Scale === 2 ? 'Scale 2 (COPD 88-92%)' : 'Room Air'})
• SBP: ${vitals.systolicBP} mmHg
• HR: ${vitals.heartRate} bpm
• Temp: ${vitals.temperature.toFixed(1)}°C
• ACVPU: ${vitals.acvpu}`,

    background: `
**Admission Details:**
• Admission Time: ${admissionTime}
• Ward: Ward 4B — Acute General Medicine & Sepsis Triage
• Attending Team: General Medicine

**Relevant History:**
• Pre-admission baseline: Not yet documented
• Chronic conditions: Review chart
• Medications on admission: Review medication chart

**Observations over last 4 hours:**
• Trend: ${news2Result.total >= 3 ? 'Worsening - NEWS2 increasing' : 'Stable or improving'}
• Last recorded: ${new Date().toLocaleTimeString()}`,

    assessment: `
**Clinical Assessment:**
• Primary concern: ${patient.condition}
• Response to current interventions: ${news2Result.total >= 5 ? 'Inadequate - requires escalation' : 'Evaluating response'}
• Risk stratification: ${grade.category}
• Sepsis risk: ${qsofaResult.possibleSepsis ? 'Possible sepsis - consider cultures, lactate, antibiotics' : 'Low risk - routine monitoring'}
• ACVPU consciousness: ${vitals.acvpu === 'A' ? 'Fully alert' : vitals.acvpu === 'C' ? 'Confused - assess orientation' : 'Altered - investigate cause'}`,

    recommendation: `
**Recommendations:**
• ${news2Result.total >= 5 ? 'IMMEDIATE escalation to senior clinician / ITU review' : news2Result.total >= 3 ? 'Urgent clinical review within 30 minutes' : 'Continue routine monitoring with observations every 1-2 hours'}
• Repeat NEWS2 and vital signs in 1 hour
• ${qsofaResult.possibleSepsis ? 'Order blood cultures, lactate, and broad-spectrum antibiotics if septic screen positive' : 'No acute intervention required unless condition changes'}
• ${checkSingleParameterRedFlag(news2Result.perVital) ? 'Single-vital score-of-3 red flag - immediate senior review regardless of total NEWS2' : 'No single-vital red flags'}
• Consider requesting senior review if not already involved
• Maintain prescribed oxygen therapy; if COPD, target SpO2 88-92% (Scale 2)

**Family Update:**
• ${news2Result.total >= 5 ? 'Family should be informed of escalation and potential transfer to higher care' : 'Family updated as part of routine care unless patient prefers otherwise'}
• Provide clear, honest explanation of condition and care plan
• Address any concerns or questions from family
• Document family communication in nursing notes
• Reassure family that observations are being closely monitored and any changes will be acted upon promptly`,
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm mb-2">SBAR Handoff</h4>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">{sbar.situation}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">{sbar.background}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">{sbar.assessment}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">{sbar.recommendation}</p>
      </div>

      {/* Copy SBAR button */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <button
          onClick={() => {
            const textToCopy = `
${sbar.situation}

${sbar.background}

${sbar.assessment}

${sbar.recommendation}
          `.trim()
            navigator.clipboard.writeText(textToCopy)
            alert('SBAR note copied to clipboard!')
          }}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors flex items-center gap-1"
          aria-label="Copy SBAR note"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy SBAR Note
        </button>
      </div>

      {/* Family Update card */}
      <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50 rounded-b-lg">
        <h5 className="text-xs font-medium text-slate-500 mb-2">Family Update</h5>
        <p className="text-xs leading-relaxed text-slate-600">
          {sbar.recommendation.split('**Family Update:')[1]?.trim() || 'Patient is under continuous observation. Vital signs are being monitored at regular intervals. The clinical team is reviewing the patient\'s condition and will communicate any updates promptly.'}
        </p>
        <button
          onClick={() => {
            const familyText = `
${sbar.recommendation.split('**Family Update:')[1]?.trim() || 'See above'}

---
Sent via WardWatch Clinical Triage Dashboard. Please contact the ward nursing staff if you have any concerns.`
            navigator.clipboard.writeText(familyText)
            alert('Family update copied to clipboard!')
          }}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors flex items-center gap-1 mt-1"
          aria-label="Copy family update"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Family Update
        </button>
      </div>
    </div>
  )
}

// FHIR Export component
function FHIRExport({ patient }) {
  // Generate observations from current patient vitals
  const vitals = patient.vitals
  const qsofaResult = checkqSOFA(vitals.respiratoryRate, vitals.systolicBP, vitals.acvpu)

  const observations = [
    generateRRObservation(`rr-${patient.id}`, patient.id, vitals.respiratoryRate, vitals.timestamp, patient.id),
    generateSpO2Observation(`spo2-${patient.id}`, patient.id, vitals.spo2, vitals.spo2Scale, vitals.timestamp, patient.id),
    generateSBPObservation(`sbp-${patient.id}`, patient.id, vitals.systolicBP, vitals.timestamp, patient.id),
    generateHRObservation(`hr-${patient.id}`, patient.id, vitals.heartRate, vitals.timestamp, patient.id),
    generateTempObservation(`temp-${patient.id}`, patient.id, vitals.temperature, vitals.timestamp, patient.id),
    generateACVPUObservation(`acvpu-${patient.id}`, patient.id, vitals.acvpu, vitals.timestamp, patient.id),
    generateqSOFAObservation(`qsofa-${patient.id}`, patient.id, qsofaResult.qSOFAScore, vitals.timestamp, patient.id),
  ]

  // Generate patient resource
  const patientResource = generatePatientResource({
    id: patient.id,
    firstName: patient.name.split(' ')[0],
    lastName: patient.name.split(' ')[1] || 'Patient',
    dob: '1980-01-01',
    gender: 'Unknown',
    bedNumber: patient.bed,
    admissionTime: vitals.timestamp,
  })

  // Generate bundle
  const bundle = generateFHIRBundle({
    patient: patientResource,
    observations,
    generatedAt: new Date().toISOString(),
  })

  // Copy to clipboard handler
  const copyBundle = () => {
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2))
    alert('FHIR bundle copied to clipboard!')
  }

  // Download handler
  const downloadHandler = () => {
    downloadFHIRBundle(bundle, `wardwatch-${patient.id}.json`)
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm mb-2">HL7 FHIR R4 Export</h4>

      <p className="text-xs text-slate-500">
        Bundle contains: Patient resource + {observations.length} Observation resources
        covering RR, SpO2, SBP, HR, Temperature, ACVPU, and qSOFA
      </p>

      {/* Copy button */}
      <button
        onClick={copyBundle}
        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors flex items-center gap-1"
        aria-label="Copy FHIR JSON"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy JSON
      </button>

      {/* Download button */}
      <button
        onClick={downloadHandler}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-950 transition-colors w-full justify-start"
        aria-label="Download FHIR bundle"
      >
        <Download className="h-3.5 w-3.5" />
        Download .json
      </button>
    </div>
  )
}

// Main PatientWorkspace component
export function PatientWorkspace({ patient, onVitalChange, onSimulate, onSBAR, onFHIR, onRemove }) {
  // Initialize vitals
  const defaults = {
    respiratoryRate: 16,
    spo2: 96,
    spo2Scale: 1,
    supplementalO2: false,
    systolicBP: 120,
    heartRate: 80,
    temperature: 36.8,
    acvpu: 'A',
  }

  const currentPatient = patient
    ? {
        ...defaults,
        ...patient.vitals,
        id: patient.id,
        name: patient.name,
        bed: patient.bed,
        condition: patient.condition,
      }
    : { ...defaults, id: Date.now(), name: 'New Patient', bed: 1 }

  // Handle simulate +2 Hours
  const handleSimulate = () => {
    const worsened = { ...currentPatient.vitals }

    worsened.respiratoryRate = Math.min(40, worsened.respiratoryRate + 3)
    worsened.systolicBP = Math.max(50, worsened.systolicBP - 8)
    worsened.heartRate = Math.min(200, worsened.heartRate + 10)
    worsened.temperature = Math.min(43, worsened.temperature + 0.4)
    worsened.spo2 = Math.max(70, Math.min(100, worsened.spo2 - 1))

    // If severely worsened, set ACVPU to Confused
    const news2Result = calculateNews2(worsened)
    if (news2Result.total >= 8) {
      worsened.acvpu = 'C'
    }

    onChange(worsened)
  }

  return (
    <main className="p-4 flex-1 bg-slate-50">
      {/* Escalation Banner */}
      <EscalationBanner patient={currentPatient} />

      {/* Vitals Control + Trend Chart row */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Vitals Control */}
        <VitalsControl
          patient={currentPatient}
          onChange={onVitalChange}
          onSimulate={handleSimulate}
        />

        {/* Trend Chart */}
        <TrendChart
          readings={[
            { id: 1, heartRate: 80, systolicBP: 120, news2: 0, timestamp: new Date(Date.now() - 240000).toISOString() },
            { id: 2, heartRate: 82, systolicBP: 118, news2: 0, timestamp: new Date(Date.now() - 120000).toISOString() },
            { id: 3, heartRate: 85, systolicBP: 115, news2: 1, timestamp: new Date(Date.now() - 60000).toISOString() },
            { id: 4, heartRate: 88, systolicBP: 110, news2: 2, timestamp: new Date().toISOString() },
            { id: 5, heartRate: 92, systolicBP: 105, news2: 3, timestamp: new Date() },
            { id: 6, heartRate: 98, systolicBP: 100, news2: 4, timestamp: new Date() },
          ]}
        />

        {/* Empty slot for layout balance */}
        <div />
      </div>

      {/* Action Tabs - bottom 3-tab card */}
      <div className="mt-4 rounded-lg border-slate-200 overflow-hidden">
        {/* Tab 1: Escalation Protocol & qSOFA */}
        <div className="border-b border-slate-200">
          <div className="flex px-3 py-1.5 border-b bg-slate-50">
            <button
              className="flex-1 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
              data-tab="escalation"
            >
              Escalation Protocol & qSOFA
            </button>
            <button
              className="flex-1 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
              data-tab="sbarr"
            >
              SBAR Handoff & Family Update
            </button>
            <button
              className="flex-1 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
              data-tab="fhir"
            >
              HL7 FHIR R4 Export
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-3">
          {/* Escalation Protocol & qSOFA Tab */}
          <div className="data-tab-content" data-tab="escalation">
            <h5 className="text-xs font-medium text-slate-500 mb-2">Escalation Protocol</h5>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>RCP observation frequency: NEWS2 score 0 = hourly, 1-2 = 4-hourly, 3+ = continuous</li>
              <li>Required clinical response: See escalation banner above</li>
              <li>Single-parameter score-of-3 red flags: Immediate review regardless of total NEWS2</li>
            </ul>

            <h5 className="text-xs font-medium text-slate-500 mt-3 mb-1">qSOFA Checklist (3 criteria)</h5>
            <ul className="text-xs text-slate-600 space-y-0.5">
              <li>RR ≥ 22 breaths/min</li>
              <li>SBP ≤ 100 mmHg</li>
              <li>Altered mental status (ACVPU C/V/P/U)</li>
            </ul>
          </div>

          {/* SBAR Handoff & Family Update Tab */}
          <div className="data-tab-content" data-tab="sbarr" style={{ display: 'none' }}>
            <SBARHandoff patient={currentPatient} />
          </div>

          {/* FHIR R4 Export Tab */}
          <div className="data-tab-content" data-tab="fhir" style={{ display: 'none' }}>
            <FHIRExport patient={currentPatient} />
          </div>
        </div>
      </div>
    </main>
  )
}