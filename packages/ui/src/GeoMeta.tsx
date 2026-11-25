/**
 * Shared geo-location meta tags — renders in <head>.
 * Added to all three apps (site / portal / insights) for consistency.
 */
export default function GeoMeta() {
  return (
    <>
      <meta name="geo.region" content="CN-BJ" />
      <meta name="geo.placename" content="Beijing" />
      <meta name="ICBM" content="39.9042, 116.4074" />
    </>
  );
}
