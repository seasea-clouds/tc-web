import type { Metadata } from 'next';

// Auth pages must not be indexed — they add no search value and create
// duplicate/low-quality pages in Google (GSC issue 4c).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
