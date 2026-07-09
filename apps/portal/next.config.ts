import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['@trade/ui'],
  webpack: (config: any) => {
    // Redirect modules/shared/i18n → i18n-browser for Webpack (client-side build)
    // This ensures Webpack bundles locale JSONs for browser translations.
    // esbuild (Worker build) still uses i18n.ts directly (with eval('require')).
    config.plugins.push(
      new config.webpack.NormalModuleReplacementPlugin(
        /\/modules\/shared\/i18n$/,
        path.resolve('./modules/shared/i18n-browser.ts')
      )
    );
    return config;
  },
};

export default withNextIntl(nextConfig);
