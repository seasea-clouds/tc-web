/**
 * Cloudflare Pages Middleware:
 * 1. Route /{locale}/c/* → portal site (user compliance portal)
 * 2. Route /{locale}/blog/* → blog site
 * 3. Route /api/admin/* → admin API
 * 4. Route /admin/* → admin dashboard (HTML + static assets)
 * 5. Serve sub-site static assets at /blog/_next/static/*, /c/_next/static/*, /admin/_next/static/*
 * 6. Accept-Language → redirect / to corresponding locale
 * 7. Canonical host redirect: www / pages.dev → main domain
 *
 * Upstream URLs (for server-side proxy) resolved via:
 *   - Environment variables: UPSTREAM_PORTAL, UPSTREAM_BLOG, UPSTREAM_ADMIN
 *   - Auto-derivation on .pages.dev: trade-web-site → trade-web-portal / trade-web-blog / trade-web-admin
 */

// LanguageSwitcher + Navbar dropdowns: CSS group-hover, no React state
// Force rebuild for Navbar CSS hover fix
import { LOCALES, DEFAULT_LOCALE, matchBrowserLanguage } from '@trade/ui/constants';

const SUPPORTED_LOCALES = LOCALES as unknown as string[];

// ── Admin proxy (via basePath /admin/) ────────────────────────────

async function proxyToAdmin(url: URL, request: Request, env?: Record<string, string>): Promise<Response> {
  const upstream = resolveUpstream(url.hostname, 'admin', env);
  const upstreamUrl = `${upstream}${url.pathname}${url.search}`;
  return proxyFetch(upstreamUrl, request);
}
// ─── Portal proxy ────────────────────────────────────────────────

async function proxyToPortal(url: URL, request: Request, env?: Record<string, string>): Promise<Response> {
  const upstream = resolveUpstream(url.hostname, 'portal', env);
  let upstreamPath = url.pathname; // full path including /{locale}/c/...

  // Fix: if the path is under /c/api/, strip locale prefix to reach portal's bare /api/ endpoints.
  // Normal portal API calls use fetch('/api/...') which goes through the /api/ route, not /c/.
  // But if a request arrives at /{locale}/c/api/... (via incorrect link or bookmark),
  // proxy it to /api/... on the portal instead of /{locale}/c/api/... (which returns 404).
  const apiFromC = upstreamPath.match(/^\/[a-z]{2}\/c\/api\//);
  if (apiFromC) {
    upstreamPath = upstreamPath.replace(/^\/[a-z]{2}\/c/, '');
  }

  const upstreamUrl = upstream + upstreamPath + url.search;

  // For HTML responses, inject search widget and fix chunk paths
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    const response = await fetch(upstreamUrl);
    const body = await response.text();
    const patched = injectSearchWidget(ensureNextF(rewriteNextStatic(body, 'c')));
    return new Response(patched, {
      status: response.status,
      statusText: response.statusText,
      headers: sanitizeHeaders(response.headers),
    });
  }

  return proxyFetch(upstreamUrl, request);
}

// ─── Rewrite HTML: replace /_next/static/ with /{prefix}/_next/static/ ───

function rewriteNextStatic(html: string, prefix: string): string {
  // Rewrite _next/static/ → {prefix}/_next/static/
  return html.replace(/\/_next\/static\//g, `/${prefix}/_next/static/`);
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

// ─── Inject standalone search widget into proxied HTML ────────────

const SEARCH_WIDGET_SCRIPT = '<script defer src="/search-widget.js"></script>';

function injectSearchWidget(html: string): string {
  return html.replace('</body>', `${SEARCH_WIDGET_SCRIPT}\n</body>`);
}

// ─── Canonical host check ────────────────────────────────────────

function getCanonicalHost(original: string): string | null {
  const url = new URL(original);
  const host = url.hostname;
  // 1. If already on main domain → null (no redirect needed)
  if (host === 'sinotradecompliance.com') return null;
  // 2. If www. → redirect to main domain
  if (host === 'www.sinotradecompliance.com') return 'sinotradecompliance.com';
  // 3. If any .pages.dev → redirect to main domain
  if (host.endsWith('.pages.dev')) return 'sinotradecompliance.com';
  return null;
}

// ─── Resolve upstream URL for sub-sites ──────────────────────────

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

// ─── Proxy request with header sanitation ────────────────────────

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

// ─── Sub-site static assets ─────────────────────────────────────

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

  // Match /admin/_next/static/* → admin upstream
  const adminMatch = url.pathname.match(/^\/admin\/_next\/static\/(.+)/);
  if (adminMatch) {
    const upstream = resolveUpstream(url.hostname, 'admin', env);
    // Admin uses basePath /admin, so files served at /admin/_next/static/
    const assetUrl = `${upstream}/admin/_next/static/${adminMatch[1]}`;
    const resp = await fetch(assetUrl);
    const h = sanitizeHeaders(resp.headers);
    if (url.pathname.endsWith('.js')) h.set('content-type', 'application/javascript');
    else if (url.pathname.endsWith('.css')) h.set('content-type', 'text/css');
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
  }

  return null;
}

// ─── Main handler ────────────────────────────────────────────────


export async function onRequest(context: { request: Request; next: () => Promise<Response>; env?: Record<string, string> }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // ── RSC prefetch tree (__next._tree.txt) — static export, no server → 204 ──
  // Next.js App Router client prefetches __next._tree.txt for visible <Link>
  // elements on mount. With output: 'export', these RSC tree files don't exist
  // because there's no running Next.js server to generate them dynamically.
  // In Cloudflare Pages Workers, requesting a non-existent file (404) causes a
  // full Worker invocation. For every visible <Link> on every page load, the
  // Worker is called just to return a 404. Instead, short-circuit to 204 No Content
  // so the client bails out of the prefetch without error.
  if (url.pathname.endsWith('/__next._tree.txt')) {
    return new Response(null, { status: 204 });
  }

  // ── Sub-site static assets ──
  const assetResp = await proxySubSiteAsset(url, request, env);
  if (assetResp) return assetResp;

  // ── Sub-site module system ──
  // Next.js async chunks are loaded at runtime via requestAnimationFrame + <link prefetch>.
  // These are relative to the same origin, so they request `/_next/static/chunks/*`.
  // On the main site, `/_next/static/` belongs to the main site itself.
  // For proxied sub-sites (portal/blog with /c/ and /blog/ base paths),
  // their modules use un-prefixed `/_next/static/chunks/*` URLs.
  // This handler serves those chunks from the correct upstream.
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    // Try portal first, then blog
    for (const sub of ['portal', 'blog']) {
      const upstream = resolveUpstream(url.hostname, sub, env);
      const fwdUrl = `${upstream}/_next/static/chunks/${url.pathname.replace('/_next/static/chunks/', '')}`;
      const resp = await fetch(fwdUrl);
      if (resp.ok) {
        const h = sanitizeHeaders(resp.headers);
        h.set('content-type', 'application/javascript');
        return new Response(resp.body, { status: 200, headers: h });
      }
    }
    // If neither portal nor blog has it, let it 404 as usual
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

  // ── Admin API proxy (/api/admin/*) ───────────────────────────
  if (url.pathname.startsWith('/api/admin/')) {
    const upstream = resolveUpstream(url.hostname, 'admin', env);
    const adminUrl = upstream + url.pathname + url.search;
    try {
      return await proxyFetch(adminUrl, request);
    } catch (err) {
      return new Response('Admin API proxy error: ' + err, { status: 502 });
    }
  }

  // ── Admin page proxy (/admin/*) ──
  if (url.pathname.startsWith('/admin/')) {
    return proxyToAdmin(url, request, env);
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
        html = rewriteNextStatic(html, 'blog');
        html = ensureNextF(html);
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

  // ── Canonical host redirect ──
  const canonical = getCanonicalHost(url.toString());
  if (canonical && url.hostname !== canonical) {
    return Response.redirect(url.toString().replace(url.hostname, canonical), 301);
  }

  // ── Language auto-detect for root path ──
  if (url.pathname === '/' || url.pathname === '') {
    const acceptLang = request.headers.get('accept-language');
    const locale = matchBrowserLanguage(acceptLang);
    const target = '/' + locale + '/';
    return Response.redirect(new URL(target, url.origin).toString(), 302);
  }

  // ── Default: serve main site ──
  const response = await context.next();



  return response;
}
