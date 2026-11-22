# WardWatch

**Clinical Triage Dashboard** — Real-time ward patient monitoring with NEWS2 scoring, qSOFA sepsis screening, SBAR handoffs, and HL7 FHIR R4 export.

## Tech Stack

- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Icons**: Lucide React
- **Language**: JavaScript (ESM)

## Architecture

- **100% Free-tier tools** — no paid dependencies
- **Client-only** for v1 (Supabase integration planned for Phase 2)

## Planned Database (Supabase - Phase 2)

| Table | Purpose |
|-------|---------|
| `patients` | Ward census — bed, demographics, condition, admission time, active status |
| `vitals_logs` | Time-series vitals — patient_id, timestamp, RR, SpO2, SpO2_scale, supplemental_O2, SBP, HR, temp, ACVPU, NEWS2_total, qSOFA_score |

## Key Clinical Features (v1)

- **NEWS2 Calculator** — Royal College of Physicians compliant
  - SpO2 Scale 1 (standard) & Scale 2 (COPD target 88–92%)
  - Single-parameter score-of-3 red flags
  - ACVPU consciousness mapping (A=0, C/V/P/U=3)
- **qSOFA Sepsis Screening** — RR ≥ 22, SBP ≤ 100, altered mental status
- **Escalation Banner** — RCP color-coded urgency (Red/Amber/Green)
- **Interactive Vitals** — Live sliders with point pills (+0 to +3)
- **Trend Chart** — SVG line chart (HR, SBP history)
- **SBAR Handoff** — Structured Situation/Background/Assessment/Recommendation + Family Update
- **HL7 FHIR R4 Export** — Observation bundle + Patient resource JSON

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build (verify zero errors)
npm run lint     # Oxlint
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── components/
│   ├── App.jsx              # App shell + sample data + main layout
│   ├── Header.jsx           # Top sticky header + ward status badges
│   ├── WardSidebar.jsx      # Auto-sorted patient census + AdmitModal
│   ├── PatientWorkspace.jsx # Main clinical workspace
│   ├── EscalationBanner.jsx # Color-coded NEWS2 + qSOFA banner
│   ├── VitalsControl.jsx    # Interactive vitals sliders + ACVPU
│   ├── TrendChart.jsx       # SVG line chart (HR + SBP)
│   ├── ActionTabs.jsx       # 3-tab: Escalation/SBAR/FHIR
│   └── AdmitModal.jsx       # Add new patient form
├── utils/
│   ├── news2.js             # NEWS2 + qSOFA calculator
│   └── fhir.js              # HL7 FHIR R4 exporter
├── index.css                # Tailwind v4 import
└── main.jsx                 # Entry point
```