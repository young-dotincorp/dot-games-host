export default async function handler(req, res) {
  const { q, tl = 'ko' } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  if (q.length > 200) return res.status(400).json({ error: 'q too long' });

  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(q)}&ttsspeed=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `upstream ${response.status}` });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: 'fetch failed', detail: e.message });
  }
}
