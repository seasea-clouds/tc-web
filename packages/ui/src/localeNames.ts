/**
 * 48 语言的中文名 —— 只用于「询盘来源标识」：运营收到的邮件要能一眼看出是哪个语言。
 *
 * 不参与界面渲染（界面的语言名走 LOCALE_NAMES，用各语言自己的写法带国旗）。
 * 与 LOCALES 一一对应，缺项由调用方兜底成语言代码。
 */
export const LOCALE_NAMES_ZH: Record<string, string> = {
  en: '英语',
  zh: '中文',
  es: '西班牙语',
  fr: '法语',
  de: '德语',
  ja: '日语',
  pt: '葡萄牙语',
  ru: '俄语',
  ar: '阿拉伯语',
  ko: '韩语',
  it: '意大利语',
  nl: '荷兰语',
  tr: '土耳其语',
  vi: '越南语',
  id: '印尼语',
  th: '泰语',
  hi: '印地语',
  pl: '波兰语',
  sv: '瑞典语',
  el: '希腊语',
  cs: '捷克语',
  ro: '罗马尼亚语',
  hu: '匈牙利语',
  fi: '芬兰语',
  da: '丹麦语',
  no: '挪威语',
  uk: '乌克兰语',
  bg: '保加利亚语',
  hr: '克罗地亚语',
  sr: '塞尔维亚语',
  sk: '斯洛伐克语',
  sl: '斯洛文尼亚语',
  ms: '马来语',
  ka: '格鲁吉亚语',
  he: '希伯来语',
  sw: '斯瓦希里语',
  bn: '孟加拉语',
  ca: '加泰罗尼亚语',
  fa: '波斯语',
  ur: '乌尔都语',
  ta: '泰米尔语',
  af: '南非荷兰语',
  sq: '阿尔巴尼亚语',
  az: '阿塞拜疆语',
  hy: '亚美尼亚语',
  be: '白俄罗斯语',
  ne: '尼泊尔语',
  si: '僧伽罗语',
};

/** `de` → `德语（de）`；未知语言原样返回代码 */
export function localeNameZh(locale: string): string {
  const name = LOCALE_NAMES_ZH[locale];
  return name ? `${name}（${locale}）` : locale;
}
