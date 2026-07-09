const { put, get } = require('@vercel/blob');

const BLOB_PATH = 'finflow-data.json';
const ACCESS = 'private'; // store is configured as private

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // ── GET  /api/data  →  return stored JSON (or null on first run)
  if (req.method === 'GET') {
    try {
      const result = await get(BLOB_PATH, { access: ACCESS, useCache: false });
      if (!result || !result.stream) return res.status(200).json(null);

      const data = await new Response(result.stream).json();
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

      await put(BLOB_PATH, body, {
        access: ACCESS,
        addRandomSuffix: false,
        contentType: 'application/json',
        allowOverwrite: true,
      });

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
