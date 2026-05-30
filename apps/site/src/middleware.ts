// NOTE: output: 'export' 下该 middleware 在构建时不生效。
// CF Pages 语言跳转由 functions/_middleware.ts（边缘函数）实现。
// 此文件仅用于 next dev 本地开发时的语言路由。
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

function matchBrowserLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return routing.defaultLocale;

  const prefs = acceptLanguage
    .split(',')
    .map((p) => {
      const [lang, q] = p.trim().split(';');
      return { lang: lang.split('-')[0].trim(), q: parseFloat(q?.replace('q=', '') || '1') };
    })
    .sort((a, b) => b.q - a.q);

  const { locales, defaultLocale } = routing;
  for (const { lang } of prefs) {
    const match = locales.find((l) => l.toLowerCase() === lang.toLowerCase());
    if (match) return match;
  }
  return defaultLocale;
}

export default function middleware(request: Parameters<typeof intlMiddleware>[0]) {
  const { pathname } = request.nextUrl;

  // Only redirect on root path "/"
  if (pathname === '/') {
    const locale = matchBrowserLanguage(
      request.headers.get('accept-language')
    );
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/`;
    return Response.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  // Run middleware on root and locale paths
  matcher: ['/', '/:path*'],
};
