/**
 * Shared geo-location meta tags — renders in <head>.
 * Added to all three apps (site / portal / blog) for consistency.
 */
export default function GeoMeta() {
  return (
    <>
      <meta name="geo.region" content="CN-SH" />
      <meta name="geo.placename" content="Shanghai" />
      <meta name="ICBM" content="31.2304, 121.4737" />
    </>
  );
}
