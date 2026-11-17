// Vercel Serverless Function Handler for CyberSafe Exhibition APIs

let memoryStats = { visits: 0, pledges: 0, quizSubmissions: 0, feedbackSubmissions: 0 };
let memoryFeedback = [];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname.endsWith('/health')) {
    return res.status(200).json({ ok: true, service: 'cybersafe-exhibition-vercel', time: new Date().toISOString() });
  }

  if (pathname.endsWith('/stats')) {
    return res.status(200).json({
      visits: memoryStats.visits,
      pledges: memoryStats.pledges,
      quizSubmissions: memoryStats.quizSubmissions
    });
  }

  if (pathname.endsWith('/visit') && req.method === 'POST') {
    memoryStats.visits += 1;
    return res.status(200).json({ visits: memoryStats.visits });
  }

  if (pathname.endsWith('/pledge') && req.method === 'POST') {
    memoryStats.pledges += 1;
    return res.status(200).json({ pledges: memoryStats.pledges });
  }

  if (pathname.endsWith('/quiz') && req.method === 'POST') {
    memoryStats.quizSubmissions += 1;
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    body = body || {};
    return res.status(200).json({ saved: true, score: Math.max(0, Math.min(5, Number(body.score) || 0)) });
  }

  if (pathname.endsWith('/feedback')) {
    if (req.method === 'POST') {
      memoryStats.feedbackSubmissions += 1;
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }
      body = body || {};
      const entry = {
        id: memoryStats.feedbackSubmissions,
        fullName: String(body.fullName || '').trim(),
        exhibitionRating: Number(body.exhibitionRating) || 0,
        websiteRating: Number(body.websiteRating) || 0,
        vibesRating: Number(body.vibesRating) || 0,
        favoriteSection: String(body.favoriteSection || '').trim(),
        comments: String(body.comments || '').trim(),
        submittedAt: new Date().toISOString()
      };
      memoryFeedback.push(entry);
      return res.status(200).json({ saved: true, hasName: Boolean(entry.fullName) });
    }
    if (req.method === 'GET') {
      return res.status(200).json({ entries: memoryFeedback, total: memoryFeedback.length });
    }
    if (req.method === 'DELETE') {
      memoryFeedback = [];
      memoryStats.feedbackSubmissions = 0;
      return res.status(200).json({ ok: true, cleared: true });
    }
  }

  return res.status(404).json({ ok: false, error: 'not_found' });
}
