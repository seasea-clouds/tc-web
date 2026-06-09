/**
 * App messages: portal + shared UI messages merged.
 * Shared UI messages provided by @trade/ui/messages.
 */
import { uiMessagesMap } from '@trade/ui/messages';
import af from '../../messages/af.json';
import ar from '../../messages/ar.json';
import az from '../../messages/az.json';
import be from '../../messages/be.json';
import bg from '../../messages/bg.json';
import bn from '../../messages/bn.json';
import ca from '../../messages/ca.json';
import cs from '../../messages/cs.json';
import da from '../../messages/da.json';
import de from '../../messages/de.json';
import el from '../../messages/el.json';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import fa from '../../messages/fa.json';
import fi from '../../messages/fi.json';
import fr from '../../messages/fr.json';
import he from '../../messages/he.json';
import hi from '../../messages/hi.json';
import hr from '../../messages/hr.json';
import hu from '../../messages/hu.json';
import hy from '../../messages/hy.json';
import id from '../../messages/id.json';
import it from '../../messages/it.json';
import ja from '../../messages/ja.json';
import ka from '../../messages/ka.json';
import ko from '../../messages/ko.json';
import ms from '../../messages/ms.json';
import ne from '../../messages/ne.json';
import nl from '../../messages/nl.json';
import no from '../../messages/no.json';
import pl from '../../messages/pl.json';
import pt from '../../messages/pt.json';
import ro from '../../messages/ro.json';
import ru from '../../messages/ru.json';
import si from '../../messages/si.json';
import sk from '../../messages/sk.json';
import sl from '../../messages/sl.json';
import sq from '../../messages/sq.json';
import sr from '../../messages/sr.json';
import sv from '../../messages/sv.json';
import sw from '../../messages/sw.json';
import ta from '../../messages/ta.json';
import th from '../../messages/th.json';
import tr from '../../messages/tr.json';
import uk from '../../messages/uk.json';
import ur from '../../messages/ur.json';
import vi from '../../messages/vi.json';
import zh from '../../messages/zh.json';

// Map all 48 locale imports keyed by locale code
const localeImports: Record<string, Record<string, unknown>> = {
  af: af as unknown as Record<string, unknown>,
  ar: ar as unknown as Record<string, unknown>,
  az: az as unknown as Record<string, unknown>,
  be: be as unknown as Record<string, unknown>,
  bg: bg as unknown as Record<string, unknown>,
  bn: bn as unknown as Record<string, unknown>,
  ca: ca as unknown as Record<string, unknown>,
  cs: cs as unknown as Record<string, unknown>,
  da: da as unknown as Record<string, unknown>,
  de: de as unknown as Record<string, unknown>,
  el: el as unknown as Record<string, unknown>,
  en: en as unknown as Record<string, unknown>,
  es: es as unknown as Record<string, unknown>,
  fa: fa as unknown as Record<string, unknown>,
  fi: fi as unknown as Record<string, unknown>,
  fr: fr as unknown as Record<string, unknown>,
  he: he as unknown as Record<string, unknown>,
  hi: hi as unknown as Record<string, unknown>,
  hr: hr as unknown as Record<string, unknown>,
  hu: hu as unknown as Record<string, unknown>,
  hy: hy as unknown as Record<string, unknown>,
  id: id as unknown as Record<string, unknown>,
  it: it as unknown as Record<string, unknown>,
  ja: ja as unknown as Record<string, unknown>,
  ka: ka as unknown as Record<string, unknown>,
  ko: ko as unknown as Record<string, unknown>,
  ms: ms as unknown as Record<string, unknown>,
  ne: ne as unknown as Record<string, unknown>,
  nl: nl as unknown as Record<string, unknown>,
  no: no as unknown as Record<string, unknown>,
  pl: pl as unknown as Record<string, unknown>,
  pt: pt as unknown as Record<string, unknown>,
  ro: ro as unknown as Record<string, unknown>,
  ru: ru as unknown as Record<string, unknown>,
  si: si as unknown as Record<string, unknown>,
  sk: sk as unknown as Record<string, unknown>,
  sl: sl as unknown as Record<string, unknown>,
  sq: sq as unknown as Record<string, unknown>,
  sr: sr as unknown as Record<string, unknown>,
  sv: sv as unknown as Record<string, unknown>,
  sw: sw as unknown as Record<string, unknown>,
  ta: ta as unknown as Record<string, unknown>,
  th: th as unknown as Record<string, unknown>,
  tr: tr as unknown as Record<string, unknown>,
  uk: uk as unknown as Record<string, unknown>,
  ur: ur as unknown as Record<string, unknown>,
  vi: vi as unknown as Record<string, unknown>,
  zh: zh as unknown as Record<string, unknown>,
};

export const messagesMap: Record<string, Record<string, unknown>> = {};

// Merge app messages into shared UI messages for all locales
for (const locale of Object.keys(uiMessagesMap)) {
  const appMsg = localeImports[locale] || {};
  messagesMap[locale] = { ...uiMessagesMap[locale], ...appMsg };
}
