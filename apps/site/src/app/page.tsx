// Fallback server component for root path.
// Proxy (src/proxy.ts) handles Accept-Language based redirects.
// This page only renders if proxy is bypassed.
import { redirect } from 'next/navigation';

export default function RootFallback() {
  redirect('/en/');
}
