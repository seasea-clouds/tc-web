// Root layout: minimal pass-through for the / redirect page
// All actual site routes are under (site)/ with proper <html>/<body>
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
