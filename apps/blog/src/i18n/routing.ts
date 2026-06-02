export const locales = [
  'en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi','da','no','uk','bg','hr','sr','sk',
  'sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si',
] as const;

export type Locale = (typeof locales)[number];
export const defaultLocale = 'en' satisfies Locale;
