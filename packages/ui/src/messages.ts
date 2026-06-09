/**
 * Shared UI messages map — single source for Navbar/Footer/CookieConsent/ActionDock translations.
 *
 * Loads UI messages from packages/ui/messages/ for all 48 locales and builds a lookup map.
 * App-level messages.ts imports this and merges with app-specific messages.
 *
 * Usage:
 *   import { uiMessagesMap } from '@trade/ui/messages';
 *   const messages = { ...uiMessagesMap[locale], ...appMessages };
 */

// Auto-generated: loads UI shared messages from packages/ui/messages/
// This file is re-generated when UI messages change.

import sharedaf from '../messages/af.json';
import sharedar from '../messages/ar.json';
import sharedaz from '../messages/az.json';
import sharedbe from '../messages/be.json';
import sharedbg from '../messages/bg.json';
import sharedbn from '../messages/bn.json';
import sharedca from '../messages/ca.json';
import sharedcs from '../messages/cs.json';
import sharedda from '../messages/da.json';
import sharedde from '../messages/de.json';
import sharedel from '../messages/el.json';
import shareden from '../messages/en.json';
import sharedes from '../messages/es.json';
import sharedfa from '../messages/fa.json';
import sharedfi from '../messages/fi.json';
import sharedfr from '../messages/fr.json';
import sharedhe from '../messages/he.json';
import sharedhi from '../messages/hi.json';
import sharedhr from '../messages/hr.json';
import sharedhu from '../messages/hu.json';
import sharedhy from '../messages/hy.json';
import sharedid from '../messages/id.json';
import sharedit from '../messages/it.json';
import sharedja from '../messages/ja.json';
import sharedka from '../messages/ka.json';
import sharedko from '../messages/ko.json';
import sharedms from '../messages/ms.json';
import sharedne from '../messages/ne.json';
import sharednl from '../messages/nl.json';
import sharedno from '../messages/no.json';
import sharedpl from '../messages/pl.json';
import sharedpt from '../messages/pt.json';
import sharedro from '../messages/ro.json';
import sharedru from '../messages/ru.json';
import sharedsi from '../messages/si.json';
import sharedsk from '../messages/sk.json';
import sharedsl from '../messages/sl.json';
import sharedsq from '../messages/sq.json';
import sharedsr from '../messages/sr.json';
import sharedsv from '../messages/sv.json';
import sharedsw from '../messages/sw.json';
import sharedta from '../messages/ta.json';
import sharedth from '../messages/th.json';
import sharedtr from '../messages/tr.json';
import shareduk from '../messages/uk.json';
import sharedur from '../messages/ur.json';
import sharedvi from '../messages/vi.json';
import sharedzh from '../messages/zh.json';

/**
 * Locale → shared UI messages lookup.
 * Apps merge this with their own namespace messages.
 */
export const uiMessagesMap: Record<string, Record<string, unknown>> = {
  af: sharedaf as unknown as Record<string, unknown>,
  ar: sharedar as unknown as Record<string, unknown>,
  az: sharedaz as unknown as Record<string, unknown>,
  be: sharedbe as unknown as Record<string, unknown>,
  bg: sharedbg as unknown as Record<string, unknown>,
  bn: sharedbn as unknown as Record<string, unknown>,
  ca: sharedca as unknown as Record<string, unknown>,
  cs: sharedcs as unknown as Record<string, unknown>,
  da: sharedda as unknown as Record<string, unknown>,
  de: sharedde as unknown as Record<string, unknown>,
  el: sharedel as unknown as Record<string, unknown>,
  en: shareden as unknown as Record<string, unknown>,
  es: sharedes as unknown as Record<string, unknown>,
  fa: sharedfa as unknown as Record<string, unknown>,
  fi: sharedfi as unknown as Record<string, unknown>,
  fr: sharedfr as unknown as Record<string, unknown>,
  he: sharedhe as unknown as Record<string, unknown>,
  hi: sharedhi as unknown as Record<string, unknown>,
  hr: sharedhr as unknown as Record<string, unknown>,
  hu: sharedhu as unknown as Record<string, unknown>,
  hy: sharedhy as unknown as Record<string, unknown>,
  id: sharedid as unknown as Record<string, unknown>,
  it: sharedit as unknown as Record<string, unknown>,
  ja: sharedja as unknown as Record<string, unknown>,
  ka: sharedka as unknown as Record<string, unknown>,
  ko: sharedko as unknown as Record<string, unknown>,
  ms: sharedms as unknown as Record<string, unknown>,
  ne: sharedne as unknown as Record<string, unknown>,
  nl: sharednl as unknown as Record<string, unknown>,
  no: sharedno as unknown as Record<string, unknown>,
  pl: sharedpl as unknown as Record<string, unknown>,
  pt: sharedpt as unknown as Record<string, unknown>,
  ro: sharedro as unknown as Record<string, unknown>,
  ru: sharedru as unknown as Record<string, unknown>,
  si: sharedsi as unknown as Record<string, unknown>,
  sk: sharedsk as unknown as Record<string, unknown>,
  sl: sharedsl as unknown as Record<string, unknown>,
  sq: sharedsq as unknown as Record<string, unknown>,
  sr: sharedsr as unknown as Record<string, unknown>,
  sv: sharedsv as unknown as Record<string, unknown>,
  sw: sharedsw as unknown as Record<string, unknown>,
  ta: sharedta as unknown as Record<string, unknown>,
  th: sharedth as unknown as Record<string, unknown>,
  tr: sharedtr as unknown as Record<string, unknown>,
  uk: shareduk as unknown as Record<string, unknown>,
  ur: sharedur as unknown as Record<string, unknown>,
  vi: sharedvi as unknown as Record<string, unknown>,
  zh: sharedzh as unknown as Record<string, unknown>,
};
