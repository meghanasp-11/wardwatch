import { ApiError } from './http.js';
import { usingSupabase } from './repo.js';
import * as svc from './service.js';

const routes = [
  ['GET', /^\/api\/health$/, async () => ({ ok: true, store: usingSupabase() ? 'supabase' : 'memory', ai: process.env.GEMINI_API_KEY ? 'gemini+template-fallback' : 'template-only', time: new Date().toISOString() })],
  ['POST', /^\/api\/score$/, async (_, { body }) => svc.scoreOnly(body)],
  ['GET', /^\/api\/patients$/, async () => svc.census()],
  ['POST', /^\/api\/patients$/, async (_, { body }) => svc.admit(body)],
  ['GET', /^\/api\/patients\/([^/]+)$/, async ([id]) => svc.patientView(id)],
  ['PATCH', /^\/api\/patients\/([^/]+)$/, async ([id], { body }) => svc.updatePatient(id, body)],
  ['DELETE', /^\/api\/patients\/([^/]+)$/, async ([id]) => svc.discharge(id)],
  ['POST', /^\/api\/patients\/([^/]+)\/vitals$/, async ([id], { body }) => svc.saveReading(id, body)],
  ['POST', /^\/api\/patients\/([^/]+)\/simulate$/, async ([id], { body }) => svc.simulate(id, body)],
  ['POST', /^\/api\/patients\/([^/]+)\/sbar$/, async ([id], { body }) => svc.handoff(id, body)],
  ['GET', /^\/api\/patients\/([^/]+)\/fhir$/, async ([id]) => svc.fhir(id)],
  ['POST', /^\/api\/patients\/([^/]+)\/fhir$/, async ([id], { body }) => svc.fhir(id, body)],
];

export async function handle({ method, url, body }) {
  try {
    const path = new URL(url, 'http://x').pathname.replace(/\/+$/, '') || '/';
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw new ApiError(400, 'Body must be valid JSON'); } }
    let pathMatched = false;
    for (const [m, re, fn] of routes) {
      const hit = path.match(re);
      if (!hit) continue;
      pathMatched = true;
      if (m !== method) continue;
      const json = await fn(hit.slice(1).map(decodeURIComponent), { body: body ?? {} });
      return { status: method === 'POST' && m === 'POST' && /\/api\/patients$/.test(path) ? 201 : 200, json };
    }
    throw new ApiError(pathMatched ? 405 : 404, pathMatched ? 'Method not allowed' : 'Not found');
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, json: { error: e.message, ...(e.details ? { details: e.details } : {}) } };
    console.error(e);
    return { status: 500, json: { error: 'Internal server error' } };
  }
}
