// Prerender handler — called only for bot traffic (via middleware.js rewrite)
//
// For /gallery/:paintingId URLs it fetches the painting from the backend and
// returns a minimal HTML page with Open Graph meta tags so Facebook, Twitter,
// WhatsApp etc. can show the painting image + title when the link is shared.
//
// For all other pages it falls back to Prerender.io (if PRERENDER_TOKEN is set)
// so general SEO crawlers still get fully-rendered HTML.

const BACKEND_URL = process.env.BACKEND_URL || 'https://dusan-djukaric-rho.vercel.app';

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Extract the numeric timestamp from a painting URL segment.
// Handles "8212509425840" (pure timestamp) and "venice-8212509425840" (slug-timestamp).
function extractTimestampId(paintingId) {
  if (!paintingId) return null;
  if (/^\d+$/.test(paintingId)) return paintingId;
  const match = paintingId.match(/^.+-(\d{10,})$/);
  return match ? match[1] : null;
}

module.exports = async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).send('Invalid url parameter');
  }

  const pathname = parsedUrl.pathname;

  // ── Gallery painting URLs: return OG-tag HTML directly ──────────────────────
  const galleryMatch = pathname.match(/^\/gallery\/(.+)$/);
  if (galleryMatch) {
    const timestampId = extractTimestampId(galleryMatch[1]);

    if (timestampId) {
      try {
        const apiRes = await fetch(`${BACKEND_URL}/s3/painting/${timestampId}`);
        if (apiRes.ok) {
          const painting = await apiRes.json();
          const meta = painting.metadata || {};
          const title = meta.title || 'Painting by Dusan Djukaric';
          const description = meta.description || meta.seotitle || 'Watercolor painting by Dusan Djukaric';
          const ogImageUrl = `${BACKEND_URL}/og-image/${timestampId}`;

          const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — Dusan Djukaric</title>

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${escapeHtml(targetUrl)}" />
  <meta property="og:site_name"   content="Dusan Djukaric" />
  <meta property="og:title"       content="${escapeHtml(title)} — Dusan Djukaric" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image"       content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter / X card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escapeHtml(title)} — Dusan Djukaric" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image"       content="${escapeHtml(ogImageUrl)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(ogImageUrl)}" alt="${escapeHtml(title)}" />
  <a href="${escapeHtml(targetUrl)}">View painting</a>
</body>
</html>`;

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.status(200).send(html);
        }
      } catch (err) {
        console.error('Painting fetch failed for OG tags:', err);
      }
    }
  }

  // ── Other pages: proxy to Prerender.io if token is configured ───────────────
  const token = process.env.PRERENDER_TOKEN;
  if (token) {
    try {
      const prerenderedUrl = `https://service.prerender.io/${targetUrl}`;
      const response = await fetch(prerenderedUrl, {
        headers: {
          'X-Prerender-Token': token,
          'User-Agent': req.headers['user-agent'] || 'Googlebot'
        }
      });
      const html = await response.text();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Prerender-Status', response.status.toString());
      return res.status(200).send(html);
    } catch (error) {
      console.error('Prerender proxy error:', error);
    }
  }

  // ── Last resort: minimal HTML so bots don't get an error ────────────────────
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html><html><head><title>Dusan Djukaric - Watercolor</title></head><body></body></html>`);
};
