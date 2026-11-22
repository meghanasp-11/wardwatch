import { handle } from '../lib/router.js';
import { corsHeaders } from '../lib/http.js';

export default async function handler(req, res) {
  const cors = corsHeaders(req.headers.origin);
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  const { status, json } = await handle({ method: req.method, url: req.url, body: req.body });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(json);
}
