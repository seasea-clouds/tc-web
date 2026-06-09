// Root layout: minimal pass-through for proper RSC tree layering
// Actual layout and providers are in [locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
