/**
 * Cloudflare Pages Middleware:
 * 1. Route /{locale}/c/* → portal site (user compliance portal)
 * 2. Accept-Language → redirect / to corresponding locale (e.g. /zh/)
 * 3. Canonical host redirect: www / pages.dev → main domain
 */

const SUPPORTED_LOCALES = [
  'en', 'zh', 'es', 'fr', 'de', 'ja', 'pt', 'ru',
  'ar', 'ko', 'it', 'nl', 'tr', 'vi', 'id', 'th',
  'hi', 'pl', 'sv', 'el', 'cs', 'ro', 'hu', 'fi',
  'da', 'no', 'nb', 'uk', 'bg', 'hr', 'sr', 'sk', 'sl',
  'ms', 'ka', 'he', 'sw', 'bn', 'ca',
  'fa', 'ur', 'ta', 'af', 'sq', 'az', 'hy', 'be', 'ne', 'si',
  'tl', 'te',
];
const DEFAULT_LOCALE = 'en';
const UPSTREAM = 'https://compli-service.pages.dev';
const CANONICAL_HOST = 'sinotradecompliance.com';

function matchBrowserLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const prefs = acceptLanguage.split(',').map((p) => {
    const [lang, q] = p.trim().split(';');
    return { lang: lang.split('-')[0].trim(), q: parseFloat(q?.replace('q=', '') || '1') };
  }).sort((a, b) => b.q - a.q);
  for (const { lang } of prefs) {
    const match = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === lang.toLowerCase());
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

async function proxyToUserSite(url: URL, request: Request, stripPrefix: string): Promise<Response> {
  const prefix = stripPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + prefix);
  const upstreamPath = url.pathname.replace(re, '') || '/';
  const upstreamUrl = `${UPSTREAM}${upstreamPath}${url.search}`;

  let bodyText;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      bodyText = await request.clone().text();
    } catch {
      bodyText = await request.text();
    }
  }

  const upstreamReq = new Request(upstreamUrl, {
    method: request.method,
    headers: request.headers,
    body: bodyText,
    redirect: 'manual',
  });

  try {
    const resp = await fetch(upstreamReq);
    const headers = new Headers(resp.headers);
    const location = headers.get('location');
    if (location) {
      const locUrl = new URL(location, upstreamUrl);
      if (locUrl.hostname === new URL(UPSTREAM).hostname) {
        headers.set('location', `${url.origin}${stripPrefix}${locUrl.pathname}${locUrl.search}`);
      }
    }
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  } catch (err) {
    return new Response(`Proxy error: ${err}`, { status: 502 });
  }
}

export async function onRequest(context: { request: Request; next: () => Promise<Response> }): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);

  // ── Portal proxy (/c/) ─────────────────────────────────────────
  const portalMatch = url.pathname.match(/^\/([a-z]{2})\/c\//);
  if (portalMatch && SUPPORTED_LOCALES.includes(portalMatch[1])) {
    return proxyToUserSite(url, request, '');
  }

  if (url.pathname === '/c' || url.pathname === '/c/') {
    const locale = matchBrowserLanguage(request.headers.get('accept-language'));
    return Response.redirect(url.origin + '/' + locale + '/c/', 302);
  }

  if (url.pathname.startsWith('/c/')) {
    return proxyToUserSite(url, request, '');
  }

  // ── Portal API proxy (/api/) ──────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    return proxyToUserSite(url, request, '');
  }

  // ── Redirect /c and /api to locale-prefixed versions (fallback) ──
  if (url.pathname === '/c' || url.pathname === '/c/' || url.pathname === '/api' || url.pathname === '/api/') {
    const locale = matchBrowserLanguage(request.headers.get('accept-language'));
    return Response.redirect(url.origin + '/' + locale + url.pathname + '/', 302);
  }

  // ── Canonical host redirect ────────────────────────────────────
  // Allow dev/test domains to bypass canonical redirect
  const isDevDomain = url.hostname.endsWith('.pages.dev');
  if (url.hostname !== CANONICAL_HOST && !isDevDomain) {
    return Response.redirect('https://' + CANONICAL_HOST + url.pathname + url.search, 301);
  }

  // ── Language auto-detect ───────────────────────────────────────
  if (url.pathname === '/' || url.pathname === '') {
    const locale = matchBrowserLanguage(request.headers.get('accept-language'));
    return Response.redirect(url.origin + '/' + locale + '/', 302);
  }

  return context.next();
}
