import fs from 'fs';
import path from 'path';

const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi','da','no','nb','uk','bg','hr','sr','sk',
  'sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si','tl','te',
];

const LOCALE_NAMES = {
  en:'English',zh:'中文',es:'Español',fr:'Français',de:'Deutsch',
  ja:'日本語',pt:'Português',ru:'Русский',ar:'العربية',ko:'한국어',
  it:'Italiano',nl:'Nederlands',tr:'Türkçe',vi:'Tiếng Việt',id:'Bahasa Indonesia',
  th:'ไทย',hi:'हिन्दी',pl:'Polski',sv:'Svenska',el:'Ελληνικά',
  cs:'Čeština',ro:'Română',hu:'Magyar',fi:'Suomi',da:'Dansk',
  no:'Norsk',nb:'Norsk (Bokmål)',uk:'Українська',bg:'Български',
  hr:'Hrvatski',sr:'Srpski',sk:'Slovenčina',sl:'Slovenščina',
  ms:'Bahasa Melayu',ka:'ქართული',he:'עברית',sw:'Kiswahili',bn:'বাংলা',
  ca:'Català',fa:'فارسی',ur:'اردو',ta:'தமிழ்',af:'Afrikaans',
  sq:'Shqip',az:'Azərbaycan',hy:'Հայերեն',be:'Беларуская',
  ne:'नेपाली',si:'සිංහල',tl:'Tagalog',te:'తెలుగు',
};

export async function generateStaticParams() {
  return LOCALES.map(l => ({ locale: l }));
}

export default async function BlogHome({ params }) {
  const { locale } = await params;
  const contentDir = path.join(process.cwd(), 'content', locale);
  let posts = [];
  if (fs.existsSync(contentDir)) {
    posts = fs.readdirSync(contentDir)
      .filter(f => f.endsWith('.mdx'))
      .map(f => f.replace(/\.mdx$/, ''));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#1B365D] mb-4">
        {LOCALE_NAMES[locale] || 'Blog'} - SinoTrade Compliance
      </h1>
      <p className="text-gray-600 mb-8">
        {locale === 'en' ? 'Latest insights on China import compliance.' :
         '最中国进口合规的最新见解。'}
      </p>
      <div className="grid gap-6">
        {posts.map(slug => (
          <a key={slug} href={`/${locale}/${slug}/`}
             className="block p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <h2 className="text-xl font-semibold text-[#1B365D] mb-2 capitalize">
              {slug.replace(/-/g, ' ')}
            </h2>
            <p className="text-sm text-gray-500">{locale === 'en' ? 'Read More →' : '阅读更多 →'}</p>
          </a>
        ))}
      </div>
      {posts.length === 0 && <p className="text-gray-400">No posts yet for this language.</p>}
    </div>
  );
}
