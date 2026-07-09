const { put, list } = require('@vercel/blob');

let blobUrl = null;

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // ── GET  /api/data  →  return stored JSON (or null on first run)
  if (req.method === 'GET') {
    try {
      if (!blobUrl) {
        const { blobs } = await list({ prefix: 'finflow-data' });
        const found = blobs.find(b => b.pathname === 'finflow-data.json');
        if (!found) return res.status(200).json(null);
        blobUrl = found.url;
      }

      const upstream = await fetch(blobUrl + `?t=${Date.now()}`);
      if (!upstream.ok) {
        blobUrl = null;
        return res.status(502).json({ error: `Blob fetch failed: ${upstream.status}` });
      }

      const data = await upstream.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error('[blob GET]', err);
      return res.status(500).json({ error: err.message });
    }

  // ── POST /api/data  →  overwrite the blob with the request body
  } else if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      JSON.parse(body); // validate JSON

      const blob = await put('finflow-data.json', body, {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
      });

      blobUrl = blob.url;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[blob POST]', err);
      return res.status(500).json({ error: err.message });
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
