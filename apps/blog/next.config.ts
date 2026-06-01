// Force fresh build for LanguageSwitcher usePathname fix
const config = { output: 'export' as const, trailingSlash: true, images: { unoptimized: true }, transpilePackages: ['@trade/ui'] };
export default config;
