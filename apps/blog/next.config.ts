// assetPrefix: '/blog' so all static paths reference /blog/_next/static/...
// This allows merging blog SSG output into the main site's Pages deployment
const config = { output: 'export' as const, trailingSlash: true, images: { unoptimized: true }, transpilePackages: ['@trade/ui'], assetPrefix: '/blog' };
export default config;
