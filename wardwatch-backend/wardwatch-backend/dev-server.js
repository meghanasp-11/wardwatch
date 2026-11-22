// Local server on :3001. In Vite config, proxy '/api' -> 'http://localhost:3001'.
import http from 'node:http';
import { handle } from './lib/router.js';
import { corsHeaders } from './lib/http.js';

http.createServer(async (req, res) => {
  const cors = corsHeaders(req.headers.origin);
  if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const { status, json } = await handle({ method: req.method, url: req.url, body: raw || undefined });
  res.writeHead(status, { 'Content-Type': 'application/json', ...cors }).end(JSON.stringify(json));
}).listen(process.env.PORT || 3001, () => console.log(`WardWatch API on :${process.env.PORT || 3001}`));
