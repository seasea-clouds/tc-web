/**
 * Cloudflare Web Analytics — shared component.
 * All SinoTrade sites share the same analytics token since they operate
 * under a single domain (sinotradecompliance.com).
 *
 * Usage in layout:
 *   import { CfAnalytics } from '@trade/ui';
 *   // in <head>:
 *   <CfAnalytics />
 */
export default function CfAnalytics() {
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon='{"token": "6639e5…51b7"}'
    />
  );
}
