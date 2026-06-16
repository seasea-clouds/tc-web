/**
 * Shared favicon component — renders link tags in <head>.
 * Added to all three apps (site / portal / blog) for consistency.
 */
export default function Favicon() {
  return (
    <>
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" href="/icon.png" type="image/png" />
      <link rel="apple-touch-icon" href="/icon.png" />
    </>
  );
}
