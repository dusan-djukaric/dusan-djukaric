import { rewrite } from '@vercel/edge';

const BOT_PATTERN = /googlebot|bingbot|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|applebot|yandexbot|ia_archiver|prerender/i;

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const { pathname } = new URL(request.url);

  if (BOT_PATTERN.test(ua) && !pathname.startsWith('/api/') && pathname !== '/sitemap.xml') {
    return rewrite(
      new URL(`/api/prerender?url=${encodeURIComponent(request.url)}`, request.url)
    );
  }
}

export const config = {
  matcher: ['/((?!api/).*)'],
};
