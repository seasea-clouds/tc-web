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
  'da', 'no', 'uk', 'bg', 'hr', 'sr', 'sk', 'sl',
  'ms', 'ka', 'he', 'sw', 'bn', 'ca',
  'fa', 'ur', 'ta', 'af', 'sq', 'az', 'hy', 'be', 'ne', 'si',
];
const DEFAULT_LOCALE = 'en';
const UPSTREAM = 'https://trade-web-portal.pages.dev';
const BLOG_UPSTREAM = 'https://trade-web-blog.pages.dev';
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
    // Follow internal redirects (portal may redirect /c/ → /c)
    let finalResp = resp;
    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location');
      if (location) {
        const locUrl = new URL(location, upstreamUrl);
        if (locUrl.hostname === new URL(UPSTREAM).hostname) {
          // Follow internal redirect by fetching the new path
          const followUpstreamUrl = `${UPSTREAM}${locUrl.pathname}${locUrl.search}`;
          finalResp = await fetch(followUpstreamUrl);
        } else {
          // External redirect: rewrite Location and pass to browser
          const headers = new Headers(resp.headers);
          headers.set('location', `${url.origin}${stripPrefix}${locUrl.pathname}${locUrl.search}`);
          return new Response(resp.body, {
            status: resp.status,
            statusText: resp.statusText,
            headers,
          });
        }
      }
    }
    const headers = new Headers(finalResp.headers);
    const location = headers.get('location');
    if (location) {
      const locUrl = new URL(location, upstreamUrl);
      if (locUrl.hostname === new URL(UPSTREAM).hostname) {
        headers.set('location', `${url.origin}${stripPrefix}${locUrl.pathname}${locUrl.search}`);
      }
    }
    // Rewrite _next/static paths to absolute URLs so CSS/JS load from portal domain
    const contentType = finalResp.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await finalResp.text();
      const rewritten = html.replace(
        /(href|src)="\/_next\/static\//g,
        '$1="' + UPSTREAM + '/_next/static/'
      );
      return new Response(rewritten, {
        status: finalResp.status,
        statusText: finalResp.statusText,
        headers,
      });
    }
    return new Response(finalResp.body, {
      status: finalResp.status,
      statusText: finalResp.statusText,
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
  const portalMatch = url.pathname.match(/^\/([a-z]{2})\/c\/?$/);
  const portalSubPath = url.pathname.match(/^\/([a-z]{2})\/c\/.+/);
  if (portalMatch && SUPPORTED_LOCALES.includes(portalMatch[1])) {
    // Ensure trailing slash for /{locale}/c → /{locale}/c/
    if (!url.pathname.endsWith('/')) {
      return Response.redirect(url.origin + url.pathname + '/', 308);
    }
    return proxyToUserSite(url, request, '');
  }
  if (portalSubPath && SUPPORTED_LOCALES.includes(portalSubPath[1])) {
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

  // ── Blog proxy (/blog/) ─────────────────────────────────────────
  // Preserves /blog/ prefix (blog app routes are at /{locale}/blog/)
  // Also rewrites _next/static paths to absolute blog URLs so CSS/JS load correctly
  // /en/blog/gacc-registration-guide/ → blog.pages.dev/en/blog/gacc-registration-guide/
  const blogPathMatch = url.pathname.match(/^\/([a-z]{2})\/blog(\/.*)?$/);
  if (blogPathMatch && SUPPORTED_LOCALES.includes(blogPathMatch[1])) {
    const locale = blogPathMatch[1];
    const rest = blogPathMatch[2] || '/';
    const blogUrl = BLOG_UPSTREAM + '/' + locale + '/blog' + rest;
    try {
      const resp = await fetch(blogUrl);
      // Rewrite _next/static paths to absolute blog URLs so browser fetches
      // CSS/JS from the blog app domain instead of failing on main site
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        let html = await resp.text();
        html = html.replace(
          /(href|src)="\/_next\/static\//g,
          '$1="' + BLOG_UPSTREAM + '/_next/static/'
        );
        const newHeaders = new Headers(resp.headers);
        return new Response(html, {
          status: resp.status,
          statusText: resp.statusText,
          headers: newHeaders,
        });
      }
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
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
