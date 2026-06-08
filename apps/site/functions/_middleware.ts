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

// LanguageSwitcher + Navbar dropdowns: CSS group-hover, no React state
// Force rebuild for Navbar CSS hover fix
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

// ─── Inject standalone search widget into proxied HTML ────────────

const SEARCH_WIDGET_SCRIPT = '<script defer src="/search-widget.js"></script>';

function injectSearchWidget(html: string): string {
  return html.replace('</body>', `${SEARCH_WIDGET_SCRIPT}\n</body>`);
}

// ─── Ensure __next_f exists before async modules attempt to consume it ──
// Next.js async chunk 07lhk_q6pmm3r.js contains:
//   let R=self.__next_f=self.__next_f||[]; R.forEach(z); R.length=0; R.push=z;
// This code only runs when the module body is EVALUATED by the turbopack
// module system. Through the CF Worker proxy, module evaluation can be
// deferred if the module system init depends on timing (DOMContentLoaded).
// Fix: eagerly initialize __next_f in <head> so that when modules evaluate,
// the array is ready. Keep RSC data scripts in their original <body> position.
// The consumer module's `R.push=z` interceptor will process any deferred pushes.

function ensureNextF(html: string): string {
  // Init guard: ensure self.__next_f exists before any async scripts
  // The async chunks call TURBOPACK.push() which eventually evaluates
  // module 23755 (RSC consumer). This runs: let R=self.__next_f=R||[]; R.forEach(z);
  // __next_f must be initialized before this runs to be the same array that
  // inline RSC push scripts write to.
  const initScr = '<script>self.__next_f||(self.__next_f=[]);</script><!-- NXF -->';
  const headEnd = html.indexOf('</head>');
  if (headEnd >= 0) {
    return html.slice(0, headEnd) + '\n' + initScr + '\n' + html.slice(headEnd);
  }
  return initScr + html;
}


async function proxyFetch(upstreamUrl: string, request: Request): Promise<Response> {
  const bodyText = (request.method !== 'GET' && request.method !== 'HEAD')
    ? await request.clone().text()
    : undefined;

  // Strip Host from incoming headers and let fetch() set it from upstreamUrl
  const headers = new Headers(request.headers);
  headers.delete('host');

  const upstreamReq = new Request(upstreamUrl, {
    method: request.method,
    headers,
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
    let html = await resp.text();
    html = rewriteNextStatic(html, 'c');
    html = ensureNextF(html);
    html = injectSearchWidget(html);
    return new Response(html, {
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

  // ── Portal module system's dynamically loaded chunks ────────────
  // Turbopack's module system uses a hardcoded `/_next/` base path (t = "/_next/")
  // in its q() function to generate chunk URLs from "otherChunks" relative paths.
  // This means dynamically loaded portal chunks appear at:
  //   /_next/static/chunks/{hash}.js  (without /c/ prefix)
  // But the actual <script async> tags were rewritten to /c/_next/static/chunks/...
  // The module system can't find existing script tags (querySelector uses wrong path)
  // and creates new <script> elements pointing to /_next/static/chunks/...
  // which would request from the MAIN site (wrong/no content).
  // Fix: try main site first, fallback to portal proxy.
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    const nextResp = await context.next();
    if (nextResp.ok) return nextResp;

    // Fallback: proxy from portal
    const relativePath = url.pathname.slice('/_next/static/'.length);
    const upstream = resolveUpstream(url.hostname, 'portal', env);
    const assetUrl = `${upstream}/_next/static/${relativePath}`;
    const portalResp = await fetch(assetUrl);
    if (portalResp.ok) {
      const h = sanitizeHeaders(portalResp.headers);
      if (url.pathname.endsWith('.js')) h.set('content-type', 'application/javascript');
      else if (url.pathname.endsWith('.css')) h.set('content-type', 'text/css');
      return new Response(portalResp.body, { status: portalResp.status, headers: h });
    }

    return new Response('next_chunk not found', { status: 404 });
  }

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
        // Inject standalone search widget for non-React pages
        html = injectSearchWidget(html);

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
