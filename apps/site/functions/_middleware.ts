/**
 * Cloudflare Pages Middleware:
 * 1. Route /{locale}/c/* → portal site (user compliance portal)
 * 2. Route /{locale}/blog/* → blog site
 * 3. Serve sub-site static assets at /blog/_next/static/* and /c/_next/static/*
 *    (relative paths — no absolute domains in HTML)
 * 4. Accept-Language → redirect / to corresponding locale
 * 5. Canonical host redirect: www / pages.dev → main domain
 *
 * Upstream URLs (for server-side proxy) resolved via:
 *   - Environment variables: UPSTREAM_PORTAL, UPSTREAM_BLOG
 *   - Auto-derivation on .pages.dev: trade-web-site → trade-web-portal / trade-web-blog
 */

const SUPPORTED_LOCALES = [
  'en', 'zh', 'es', 'fr', 'de', 'ja', 'pt', 'ru',
  'ar', 'ko', 'it', 'nl', 'tr', 'vi', 'id', 'th',
  'hi', 'pl', 'sv', 'el', 'cs', 'ro', 'hu', 'fi',
  'da', 'no', 'uk', 'bg', 'hr', 'sr', 'sk', 'sl',
  'ms', 'ka', 'he', 'sw', 'bn', 'ca',
  'fa', 'ur', 'ta', 'af', 'sq', 'az', 'hy', 'be', 'ne', 'si',
];
const DEFAULT_LOCALE = 'en';
const CANONICAL_HOST = 'sinotradecompliance.com';

// ─── Upstream URL resolution ─────────────────────────────────────

function resolveUpstream(hostname: string, subProject: string, env?: Record<string, string>): string {
  const envKey = `UPSTREAM_${subProject.toUpperCase()}`;
  if (env && env[envKey]) return env[envKey];

  // Auto-derive for .pages.dev using naming convention
  if (hostname.endsWith('.pages.dev')) {
    const projectName = hostname.replace('.pages.dev', '');
    // trade-web-site → trade-web-blog / trade-web-portal
    const derived = projectName.replace(/-site$/, `-${subProject}`);
    if (derived !== projectName) return `https://${derived}.pages.dev`;
    return `https://${projectName}-${subProject}.pages.dev`;
  }

  // Final fallback
  return `https://trade-web-${subProject}.pages.dev`;
}

// ─── Rewrite HTML: replace /_next/static/ with /{prefix}/_next/static/ ───

function rewriteNextStatic(html: string, prefix: string): string {
  // Replace ALL occurrences — covers both HTML attributes and RSC data (self.__next_f)
  return html.replace(/\/_next\/static\//g, `/${prefix}/_next/static/`);
}

// ─── Proxy request with header sanitation ────────────────────────

async function proxyFetch(upstreamUrl: string, request: Request): Promise<Response> {
  const bodyText = (request.method !== 'GET' && request.method !== 'HEAD')
    ? await request.clone().text()
    : undefined;

  const upstreamReq = new Request(upstreamUrl, {
    method: request.method,
    headers: request.headers,
    body: bodyText,
    redirect: 'manual',
  });

  return fetch(upstreamReq);
}

function sanitizeHeaders(headers: Headers): Headers {
  const h = new Headers(headers);
  h.delete('content-encoding');
  h.delete('transfer-encoding');
  h.delete('content-length');
  return h;
}

// ─── Portal proxy ────────────────────────────────────────────────

async function proxyToPortal(url: URL, request: Request, env?: Record<string, string>): Promise<Response> {
  const upstream = resolveUpstream(url.hostname, 'portal', env);
  const upstreamPath = url.pathname; // full path including /{locale}/c/...
  const upstreamUrl = `${upstream}${upstreamPath}${url.search}`;

  let resp = await proxyFetch(upstreamUrl, request);

  // Follow internal redirects (portal may redirect /c/ → /c)
  if (resp.status >= 300 && resp.status < 400) {
    const location = resp.headers.get('location');
    if (location) {
      const locUrl = new URL(location, upstreamUrl);
      const upstreamHost = new URL(upstream).hostname;
      if (locUrl.hostname === upstreamHost) {
        resp = await proxyFetch(`${upstream}${locUrl.pathname}${locUrl.search}`, request);
      } else {
        // External redirect: rewrite Location to main site domain
        const headers = new Headers(resp.headers);
        headers.set('location', `${url.origin}${locUrl.pathname}${locUrl.search}`);
        return new Response(resp.body, {
          status: resp.status,
          statusText: resp.statusText,
          headers,
        });
      }
    }
  }

  // Rewrite Location header if needed
  const headers = sanitizeHeaders(resp.headers);
  const location = headers.get('location');
  if (location) {
    const locUrl = new URL(location, upstreamUrl);
    const upstreamHost = new URL(upstream).hostname;
    if (locUrl.hostname === upstreamHost) {
      headers.set('location', `${url.origin}${locUrl.pathname}${locUrl.search}`);
    }
  }

  // Rewrite static asset paths in HTML to relative /c/_next/static/
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const html = await resp.text();
    const rewritten = rewriteNextStatic(html, 'c');
    return new Response(rewritten, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    });
  }

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers,
  });
}

// ─── Static asset proxy helpers ──────────────────────────────────

/**
 * If the request URL matches /{prefix}/_next/static/{path},
 * proxy to the sub-site upstream at /_next/static/{path}.
 * Returns a Response if matched, or null to continue normal routing.
 */
async function proxySubSiteAsset(url: URL, request: Request, env?: Record<string, string>): Promise<Response | null> {
  // Match /blog/_next/static/* → blog upstream
  const blogMatch = url.pathname.match(/^\/blog\/_next\/static\/(.+)/);
  if (blogMatch) {
    const upstream = resolveUpstream(url.hostname, 'blog', env);
    const assetUrl = `${upstream}/_next/static/${blogMatch[1]}`;
    const resp = await fetch(assetUrl);
    const h = sanitizeHeaders(resp.headers);
    // Ensure proper content-type for JS/CSS
    if (url.pathname.endsWith('.js')) h.set('content-type', 'application/javascript');
    else if (url.pathname.endsWith('.css')) h.set('content-type', 'text/css');
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
  }

  // Match /c/_next/static/* → portal upstream
  const portalMatch = url.pathname.match(/^\/c\/_next\/static\/(.+)/);
  if (portalMatch) {
    const upstream = resolveUpstream(url.hostname, 'portal', env);
    const assetUrl = `${upstream}/_next/static/${portalMatch[1]}`;
    const resp = await fetch(assetUrl);
    const h = sanitizeHeaders(resp.headers);
    if (url.pathname.endsWith('.js')) h.set('content-type', 'application/javascript');
    else if (url.pathname.endsWith('.css')) h.set('content-type', 'text/css');
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
  }

  return null;
}

// ─── Main handler ────────────────────────────────────────────────

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

export async function onRequest(context: { request: Request; next: () => Promise<Response>; env?: Record<string, string> }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // ── Sub-site static assets (check first, before HTML routing) ──
  const assetResp = await proxySubSiteAsset(url, request, env);
  if (assetResp) return assetResp;

  // ── Portal proxy (/c/) ─────────────────────────────────────────
  const portalMatch = url.pathname.match(/^\/([a-z]{2})\/c\/?$/);
  const portalSubPath = url.pathname.match(/^\/([a-z]{2})\/c\/.+/);
  if (portalMatch && SUPPORTED_LOCALES.includes(portalMatch[1])) {
    if (!url.pathname.endsWith('/')) {
      return Response.redirect(url.origin + url.pathname + '/', 308);
    }
    return proxyToPortal(url, request, env);
  }
  if (portalSubPath && SUPPORTED_LOCALES.includes(portalSubPath[1])) {
    return proxyToPortal(url, request, env);
  }

  if (url.pathname === '/c' || url.pathname === '/c/') {
    const locale = matchBrowserLanguage(request.headers.get('accept-language'));
    return Response.redirect(url.origin + '/' + locale + '/c/', 302);
  }

  if (url.pathname.startsWith('/c/')) {
    return proxyToPortal(url, request, env);
  }

  // ── Portal API proxy (/api/) ──────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    return proxyToPortal(url, request, env);
  }

  if (url.pathname === '/api' || url.pathname === '/api/') {
    const locale = matchBrowserLanguage(request.headers.get('accept-language'));
    return Response.redirect(url.origin + '/' + locale + url.pathname + '/', 302);
  }

  // ── Blog proxy ─────────────────────────────────────────────────
  // Preserves /blog/ prefix. Static assets served at /blog/_next/static/*.
  const blogPathMatch = url.pathname.match(/^\/([a-z]{2})\/blog(\/.*)?$/);
  if (blogPathMatch && SUPPORTED_LOCALES.includes(blogPathMatch[1])) {
    const locale = blogPathMatch[1];
    const rest = blogPathMatch[2] || '/';
    const upstream = resolveUpstream(url.hostname, 'blog', env);
    const blogUrl = upstream + '/' + locale + '/blog' + rest;

    try {
      const resp = await fetch(blogUrl);
      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('text/html')) {
        let html = await resp.text();
        // Rewrite /_next/static/ → /blog/_next/static/ (relative, no absolute domain)
        html = rewriteNextStatic(html, 'blog');

        const headers = sanitizeHeaders(resp.headers);
        return new Response(html, {
          status: resp.status,
          statusText: resp.statusText,
          headers,
        });
      }

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: sanitizeHeaders(resp.headers),
      });
    } catch (err) {
      return new Response('Blog proxy error: ' + err, { status: 502 });
    }
  }

  if (url.pathname === '/blog' || url.pathname === '/blog/') {
    const locale = matchBrowserLanguage(request.headers.get('accept-language'));
    return Response.redirect(url.origin + '/' + locale + '/blog/', 302);
  }

  // ── Canonical host redirect ────────────────────────────────────
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
