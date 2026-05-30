import { getTranslations } from 'next-intl/server';

/**
 * T136: Quick Answer block — appears at top of service pages.
 * Provides a concise, direct answer that generative engines (ChatGPT, Perplexity, Google AI Overview) can cite.
 * Designed as a visually distinct box with a question-style heading.
 */
export default async function QuickAnswer({
  locale,
  namespace,
}: {
  locale: string;
  namespace: string;
}) {
  const t = await getTranslations({ locale, namespace });

  if (!t.has('quickAnswerTitle') || !t.has('quickAnswer')) return null;

  return (
    <section className="py-8 bg-white border-b border-[#F4F6F9]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F0F7FF] border-l-4 border-[#1B365D] rounded-r-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div>
              <h2 className="text-lg font-bold text-[#1B365D] mb-2">
                {t('quickAnswerTitle')}
              </h2>
              <p className="text-[#333333] leading-relaxed text-sm">
                {t('quickAnswer')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
