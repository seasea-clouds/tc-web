import { defineRouting } from 'next-intl/routing';
export const routing = defineRouting({
  locales: ['en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th','hi','pl','sv','el','cs','ro','hu','fi','da','no','nb','uk','bg','hr','sr','sk','sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si','tl','te'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
