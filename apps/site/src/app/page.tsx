// Fallback server component for root path.
// Middleware (src/middleware.ts) handles Accept-Language based redirects.
// This page only renders if middleware is bypassed.
import { redirect } from 'next/navigation';

export default function RootFallback() {
  redirect('/en/');
}
