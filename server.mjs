import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cybersafe-stats.json');
const PORT = Number(process.env.PORT || process.env.MANUS_PORT || 3000);
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

const defaults = {
  visits: 0,
  pledges: 0,
  quizSubmissions: 0,
  feedbackSubmissions: 0,
  updatedAt: null
};

async function readStats() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

async function writeStats(stats) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(stats, null, 2));
  } catch {
    // The UI has its own local fallback; a read-only host must still serve the page.
  }
}

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload));
}

function safePath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, relative);
  return resolved.startsWith(ROOT) ? resolved : null;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) throw new Error('payload too large');
  }
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

async function api(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
    return res.end();
  }
  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'cybersafe-exhibition', time: new Date().toISOString() });
  }
  if (req.method === 'GET' && pathname === '/api/stats') {
    const stats = await readStats();
    return json(res, 200, { visits: stats.visits, pledges: stats.pledges, quizSubmissions: stats.quizSubmissions });
  }
  if (req.method === 'POST' && pathname === '/api/visit') {
    const stats = await readStats();
    stats.visits += 1;
    stats.updatedAt = new Date().toISOString();
    await writeStats(stats);
    return json(res, 200, { visits: stats.visits });
  }
  if (req.method === 'POST' && pathname === '/api/pledge') {
    const stats = await readStats();
    stats.pledges += 1;
    stats.updatedAt = new Date().toISOString();
    await writeStats(stats);
    return json(res, 200, { pledges: stats.pledges });
  }
  if (req.method === 'POST' && pathname === '/api/quiz') {
    const payload = await readBody(req);
    const stats = await readStats();
    stats.quizSubmissions += 1;
    stats.updatedAt = new Date().toISOString();
    await writeStats(stats);
    return json(res, 200, { saved: true, score: Math.max(0, Math.min(5, Number(payload.score) || 0)) });
  }
  if (req.method === 'POST' && pathname === '/api/feedback') {
    const payload = await readBody(req);
    const stats = await readStats();
    stats.feedbackSubmissions += 1;
    stats.updatedAt = new Date().toISOString();
    await writeStats(stats);
    return json(res, 200, { saved: true, hasName: Boolean(String(payload.fullName || '').trim()) });
  }
  return json(res, 404, { ok: false, error: 'not_found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false, error: 'method_not_allowed' });
    const filePath = safePath(pathname);
    if (!filePath) return json(res, 400, { ok: false, error: 'bad_path' });
    try {
      const file = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-cache' });
      return req.method === 'HEAD' ? res.end() : res.end(file);
    } catch {
      if (pathname !== '/') {
        const fallback = await fs.readFile(path.join(ROOT, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        return res.end(fallback);
      }
      return json(res, 404, { ok: false, error: 'not_found' });
    }
  } catch (error) {
    return json(res, 500, { ok: false, error: error instanceof Error ? error.message : 'server_error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`CyberSafe exhibition listening on http://${HOST}:${PORT}`);
});
