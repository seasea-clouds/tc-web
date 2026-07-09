/**
 * Localize hardcoded English strings from rules data.
 *
 * Rules data stores literal strings like "4-6 weeks", "$800-2,500".
 * These functions parse them and replace known English patterns with
 * the corresponding translation key values.
 */

type TFunc = (key: string) => string;

/**
 * Localize timeline strings like "4-6 weeks", "3-5 months", "Days".
 *
 * Examples:
 *   localizeTimeline(t, "4-6 weeks")       → "4-6 weeks"       (en)
 *   localizeTimeline(t, "4-6 weeks")       → "4-6 周"         (zh)
 *   localizeTimeline(t, "3-5 months")      → "3-5 months"     (en)
 *   localizeTimeline(t, "3-5 months")      → "3-5 个月"       (zh)
 *   localizeTimeline(t, "Days")            → "Days"            (en)
 *   localizeTimeline(t, "Days")            → "天"              (zh)
 */
export function localizeTimeline(t: TFunc, value: string): string {
  if (!value) return value;

  const weeks = t('timelineWeeks');
  const months = t('timelineMonths');
  const days = t('timelineDays');

  // "X-Y weeks" or "X weeks"
  let result = value.replace(
    /(\d+(?:[-–]\d+)?)\s*weeks?\b/gi,
    (_, nums) => `${nums} ${weeks}`
  );

  // "X-Y months" or "X months"
  result = result.replace(
    /(\d+(?:[-–]\d+)?)\s*months?\b/gi,
    (_, nums) => `${nums} ${months}`
  );

  // "Days"
  result = result.replace(/\bDays\b/gi, days);

  return result;
}

/**
 * Localize cost strings like "$800-2,500".
 *
 * Examples:
 *   localizeCost(t, "$800-2,500")             → "$800-2,500"        (en)
 *   localizeCost(t, "$800-2,500")             → "美元800-2,500"     (zh)
 *   localizeCost(t, "$200-500 per shipment")  → "$200-500 per shipment" (en)
 *   localizeCost(t, "$200-500 per shipment")  → "美元200-500 per shipment" (zh)
 */
/**
 * Localize cost strings like "$800-2,500" and "per shipment".
 *
 * Examples:
 *   localizeCost(t, "$800-2,500")             → "$800-2,500"        (en)
 *   localizeCost(t, "$800-2,500")             → "美元800-2,500"     (zh)
 *   localizeCost(t, "$200-500 per shipment")  → "$200-500 per shipment" (en)
 *   localizeCost(t, "$200-500 per shipment")  → "美元200-500 每批" (zh)
 */
export function localizeCost(t: TFunc, value: string): string {
  if (!value) return value;

  const cur = t('curUsd');
  const perShipment = t('perShipment');
  // Replace all "$" with localized currency
  let result = value.replace(/\$/g, cur);
  // Replace "per shipment" with localized equivalent
  result = result.replace(/per\s+shipment\b/gi, perShipment);
  return result;
}
