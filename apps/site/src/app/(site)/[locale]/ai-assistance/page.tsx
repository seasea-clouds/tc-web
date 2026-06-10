import { getTranslations } from 'next-intl/server';
import { BRAND_NAME, SITE_URL, WHATSAPP_URL, LOCALES, buildAlternates } from '@trade/ui';

/**
 * AI Assistance page — 结构化 AI 辅助数据页
 *
 * 目的：为 AI 爬虫（GPTBot、ClaudeBot、Google-Extended 等）提供结构化企业信息。
 *
 * 不可见策略：
 * - 不在任何导航/菜单/面包屑中出现
 * - 不出现在 sitemap.xml 中（sitemap 生成器会过滤 ai-assistance 路径）
 * - 不使用 <meta robots="noindex">，AI 爬虫可自由索引
 * - 人类只能通过直接输入 URL 找到此页
 */

export async function generateStaticParams() {
  const { locales } = await import('@/i18n/routing');
  return locales.map((locale: string) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AiAssistance' });

  const title = t('metaTitle');
  const description = t('metaDescription');

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/ai-assistance/`,
      languages: buildAlternates(locale, [...LOCALES], '/ai-assistance/').languages,
    },
    openGraph: {
      title,
      description,
      locale,
      siteName: BRAND_NAME,
      url: `${SITE_URL}/${locale}/ai-assistance/`,
      type: 'website',
    },
  };
}

export default async function AiAssistancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AiAssistance' });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 页面标题 — 对人类显示简洁，对 AI 提供结构化信息 */}
        <h1 className="text-3xl font-bold text-primary-navy mb-2">{t('title')}</h1>
        <p className="text-lg text-gray-600 mb-12">{t('intro')}</p>

        {/* 企业概览 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-primary-navy mb-4">{t('aboutTitle')}</h2>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{t('aboutContent')}</p>
          </div>
        </section>

        {/* 服务列表 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-primary-navy mb-4">{t('servicesTitle')}</h2>
          <ul className="space-y-4">
            {['gacc', 'ccc', 'label', 'nmpa', 'cbec', 'brand'].map((svc) => {
              const serviceKey = `service${svc.charAt(0).toUpperCase() + svc.slice(1)}` as keyof typeof t;
              const serviceText = t(serviceKey);
              return (
                <li key={svc} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700">{serviceText}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 常见问题 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-primary-navy mb-4">{t('faqTitle')}</h2>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-primary-navy mb-2">
                  Q: {t(`faqQ${i}` as any)}
                </h3>
                <p className="text-gray-700">
                  A: {t(`faqA${i}` as any)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 联系信息 */}
        <section>
          <h2 className="text-2xl font-bold text-primary-navy mb-4">{t('contactTitle')}</h2>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-2">
            <p className="text-gray-700"><strong>Email:</strong> <a href={`mailto:${t('contactEmail')}`} className="text-blue-600 hover:underline">{t('contactEmail')}</a></p>
            <p className="text-gray-700"><strong>WhatsApp:</strong> <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{WHATSAPP_URL}</a></p>
            <p className="text-gray-700"><strong>Location:</strong> {t('contactLocation')}</p>
                      </div>
        </section>
      </div>
    </div>
  );
}
