import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'export' as const,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['@trade/ui'],
};

export default withNextIntl(nextConfig);
