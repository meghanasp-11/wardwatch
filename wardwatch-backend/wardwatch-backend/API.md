# WardWatch API contract (for the frontend)

Base: same origin `/api/*` on Vercel. Locally: `npm run dev` (port 3001) and proxy `/api` in `vite.config`.
All bodies/responses are JSON. Field names match the frontend: `resp_rate, spo2, on_oxygen, systolic_bp, heart_rate, temp, consciousness (A|C|V|P|U), bed_number, condition, spo2_scale (1|2), meds_and_labs`.
Errors: `{ "error": "msg", "details": ["..."] }` with 400/404/405/409/502/500.

| Method + path | Body | Returns |
|---|---|---|
| `GET /api/health` | - | `{ok, store: "supabase"\|"memory", ai}` |
| `GET /api/patients` | - | `{patients[], summary:{High,Medium,Low}, generated_at}` sorted sickest first |
| `POST /api/patients` (admit) | `{name, age, bed_number, condition, spo2_scale?, meds_and_labs?, vitals?}` | 201 + patient |
| `GET /api/patients/:id` | - | patient |
| `PATCH /api/patients/:id` | any of name, age, bed_number, condition, spo2_scale, meds_and_labs | patient |
| `DELETE /api/patients/:id` | - | `{id, discharged:true}` |
| `POST /api/patients/:id/vitals` ("Save Reading") | vitals (+ optional `recorded_at`) | patient |
| `POST /api/patients/:id/simulate` | `{direction?: "deteriorate"\|"recover", persist?: false}` | patient (or `{preview, reading, assessment}`) |
| `POST /api/score` (live sliders, no save) | `{vitals, spo2_scale?}` | assessment |
| `POST /api/patients/:id/sbar` | `{vitals?}` unsaved slider values | `{source, doctorNote, familyUpdate, sbar{}, fallback_reason?}` |
| `GET /api/patients/:id/fhir` | - | FHIR R4 Bundle (latest saved reading) |
| `POST /api/patients/:id/fhir` | `{vitals?}` | FHIR R4 Bundle (uses unsaved vitals if sent) |

**Patient object** = `{id, name, age, bed_number, condition, spo2_scale, meds_and_labs, history[], latestVitals, assessment}`
`history[]` = last 6 readings `{time:"HH:MM", recorded_at, ...vitals, news2_total}`, oldest first.
**assessment** = what `calculateNEWS2` returns today (`totalScore, breakdown, redFlags, riskLevel "Low|Medium|High", monitoringFreq, clinicalAction, qsofaScore, qsofaCriteria, sepsisAlert`) plus `riskTier, color, responseMinutes, singleRedFlag, spo2Scale, severityRank`.

## Frontend swap (what Gemini changes)
1. Load: `fetch('/api/patients')` replaces `INITIAL_PATIENTS` + local sort/summary.
2. Sliders: keep local state; optionally `POST /api/score` for live points (or keep the local function, scoring is verified identical).
3. Simulate +2h: `POST /api/patients/:id/simulate` (`direction:"recover"` for the recovering patient).
4. Save Reading: `POST /api/patients/:id/vitals`.
5. SBAR tab: `POST /api/patients/:id/sbar` with current slider `vitals`. Show `source` ("gemini" or "template").
6. FHIR tab: `POST /api/patients/:id/fhir` with current slider `vitals`.
7. Admit modal: `POST /api/patients`.
Never put the Gemini or Supabase keys in the frontend; they live only in server env vars.
