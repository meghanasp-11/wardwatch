# WardWatch backend

Demo only: synthetic data, not a medical device, not for real patient care.

**Design:** all clinical logic is deterministic JS (`lib/news2Engine.js`, `lib/fhirExport.js`). Gemini only rewrites already-computed facts into SBAR prose and is validated; on any failure or missing key it falls back to a template, so the demo never breaks.

## Run locally (no accounts needed)
```
npm install
npm test
npm run dev        # http://localhost:3001/api/patients  (in-memory seeded ward)
```
## Go live
1. Supabase: run `supabase/schema.sql` in the SQL editor, then `npm run seed` (needs the env vars below).
2. Vercel: import the GitHub repo, add env vars from `.env.example`
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, optional `GEMINI_MODEL`, `WARD_TZ`).
3. Put the frontend (Vite) in the same repo: `/api` and the built site share one origin.

Without Supabase vars the API runs on memory (resets on cold start). Without a Gemini key SBAR uses the template.

## Things to verify before showing clinicians
- Minute targets in `news2Engine.js` (15 / 30) are local-policy defaults, not RCP numbers.
- Scale 2 only on a qualified clinician's instruction. FHIR uses LOINC for vitals; ACVPU/oxygen/NEWS2/qSOFA use a local code system, so map to SNOMED/LOINC before real exchange.
- `GEMINI_MODEL` name: confirm it exists on your key.
