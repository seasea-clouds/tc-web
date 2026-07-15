"use client";

import { useT, useTradeLocale, WHATSAPP_URL, useMessages } from '@trade/ui';

import { useState, useEffect } from "react";
import { checkTrademark, CATEGORY_LABELS } from "../../../../../../modules/trademark/rules";
import { API_BASE } from "@/lib/constants";
import { useFormValidation, inputClasses, selectClasses } from "@/lib/useFormValidation";
import { usePathPrefix } from '@/lib/useSubsiteHref';
import { initiateCheckout } from '@/lib/checkout';
import { useSubscription } from '@/lib/useSubscription';
import { setLocaleData } from '../../../../../../modules/shared/i18n';

type Step = "form" | "free-result";

export default function TrademarkCheckClient() {
  const t = useT('Check');
  const locale = useTradeLocale();
  const messages = useMessages();
  useEffect(() => {
    setLocaleData(locale, messages);
  }, [locale, messages]);
  const [step, setStep] = useState<Step>("form");
  const [input, setInput] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [freeData, setFreeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { fieldErrors, validate, clearFieldError } = useFormValidation();
  const { subscribed } = useSubscription();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(input, ['category', 'productName'])) return;
    const result = checkTrademark(input as any, locale);
    setFreeData(result);
    setStep("free-result");
  };

  const pathPrefix = usePathPrefix();
  const handlePayment = async () => {
    // If subscribed, skip checkout and go directly to the report page
    if (subscribed) {
      try {
        localStorage.setItem('compli-report-input', JSON.stringify({
          ...input,
          productName: input.productName || t('yourProduct'),
        }));
      } catch {}
      const reportId = `TRADEMARK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (freeData) {
        fetch('/api/report/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            module: 'Brand Protection',
            inputData: input,
            resultData: freeData,
            paymentStatus: 'completed',
          }),
        }).catch(e => console.warn('D1 save failed (subscribed):', e));
      }
      window.location.href = pathPrefix + "/c/report/?id=" + reportId;
      return;
    }
    try {
      const reportId = `TRADEMARK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      try {
        localStorage.setItem('compli-report-input', JSON.stringify({
          ...input,
          productName: input.productName || t('yourProduct'),
        }));
      } catch {}

      if (freeData) {
        fetch('/api/report/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            module: 'Brand Protection',
            inputData: input,
            resultData: freeData,
            nextSteps: [
              t('trademarkStep1'),
              t('trademarkStep2'),
              t('trademarkStep3'),
              t('trademarkStep4'),
              t('trademarkStep5'),
            ],
          }),
        }).catch(e => console.warn('D1 save failed:', e));
        
        fetch('/api/report/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, module: 'trademark', inputData: input }),
        }).catch(e => console.warn('PDF generation skipped (dev mode):', e));
      }

      if (email) {
        fetch('/api/report/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, email, module: 'trademark', inputData: input }),
        }).catch(e => console.warn('Email send failed (dev mode):', e));
      }

      // 3. Try checkout API — redirect to Creem checkout
      const checkoutUrl = await initiateCheckout({
        reportId,
        email,
        locale,
        productName: input.productName || t('yourProduct'),
        category: input.category,
        originCountry: input.originCountry,
        module: 'Brand Protection',
        moduleKey: 'trademark',
      });

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        // Checkout failed — show error instead of silently giving access
        setError(t('checkoutError'));
        setLoading(false);
      }
    } catch (err) {
      try {
        localStorage.setItem('compli-report-input', JSON.stringify({
          ...input,
          productName: input.productName || t('yourProduct'),
        }));
      } catch {}
      setError(String(err));
      setLoading(false);
    }
  }

  // Helper to set input values
  // Get category options
  const catOptions = Object.entries(CATEGORY_LABELS) as [string, string][];
  
  const setVal = (name: string, val: string) => setInput(v => ({ ...v, [name]: val }));

  return (
    <div className="bg-bg-ice">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8 text-sm text-gray-400">
          <span className={step === "form" ? "text-gold font-semibold" : ""}>{t('step1')}</span>
          <span>&rarr;</span>
          <span className={step === "free-result" ? "text-gold font-semibold" : ""}>{t('step2')}</span>
        </div>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
            {Object.keys(fieldErrors).length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-2">
                {t('requiredFieldsError')}
              </div>
            )}
            <h1 className="text-2xl font-bold text-primary-navy">{t('trademarkTitle')}</h1>
            <p className="text-sm text-gray-500">{t('trademarkSubtitle')}</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('productCategory')}</label>
              <select
                value={input.category || ""}
                onChange={e => { setVal("category", e.target.value); clearFieldError("category"); }}
                className={selectClasses(!!fieldErrors["category"])}
                required
              >
                <option value="">{t('selectCategory')}</option>
                {catOptions.map(([v, l]) => (<option key={v} value={v}>{t(`catTm_${v}`, l)}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('brandName')}</label>
              <input
                type="text"
                value={input["brandName"] || ""}
                onChange={e => setVal("brandName", e.target.value)}
                minLength={2}
                placeholder={t("brandNamePlaceholder")}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('productName')}</label>
              <input
                type="text"
                value={input["productName"] || ""}
                onChange={e => { setVal("productName", e.target.value); clearFieldError("productName"); }}
                className={inputClasses(!!fieldErrors["productName"])}
                minLength={2}
                placeholder={t("trademarkProductNamePlaceholder")}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('countryOfOrigin')}</label>
              <input
                type="text"
                value={input["originCountry"] || ""}
                onChange={e => setVal("originCountry", e.target.value)}
                minLength={2}
                placeholder={t("countryPlaceholder")}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('alreadyRegisteredChina')}</label>
              <select
                value={input["registeredInChina"] || ""}
                onChange={e => setVal("registeredInChina", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="">{t('selectOption')}</option>
                <option value="true">{t('yes')}</option>
                <option value="false">{t('no')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('hasChineseName')}</label>
                <select
                  value={input["hasChineseName"] || ""}
                  onChange={e => setVal("hasChineseName", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                >
                  <option value="">{t('selectOption')}</option>
                  <option value="yes">{t('yes')}</option>
                  <option value="no">{t('noNeedOne')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('foreignRegistration')}</label>
                <select
                  value={input["hasForeignRegistration"] || ""}
                  onChange={e => setVal("hasForeignRegistration", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                >
                  <option value="">{t('selectOption')}</option>
                  <option value="yes">{t('yes')}</option>
                  <option value="no">{t('no')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('primaryNiceClass')}</label>
                <input
                  type="text"
                  value={input["tmClassDescription"] || ""}
                  onChange={e => setVal("tmClassDescription", e.target.value)}
                  placeholder={t("niceClassPlaceholder")}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('brandInMarket')}</label>
                <input
                  type="text"
                  value={input["brandYearsInMarket"] || ""}
                  onChange={e => setVal("brandYearsInMarket", e.target.value)}
                  placeholder={t("brandInMarketPlaceholder")}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('needsCustomsRecordal')}</label>
              <select
                value={input["needsCustomsRecordal"] || ""}
                onChange={e => setVal("needsCustomsRecordal", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="">{t('selectOption')}</option>
                <option value="yes">{t('yes')}</option>
                <option value="no">{t('no')}</option>
                <option value="not_sure">{t('notSure')}</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-gold hover:bg-gold/90 text-primary-navy font-bold py-3 px-6 rounded-lg transition-all text-lg"
            >
              {t('checkBtn')}
            </button>
          </form>
        )}

        {step === "free-result" && freeData && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-primary-navy mb-4">{t('freeResult')}</h2>
              <p className="text-sm text-gray-700 mb-4">{freeData.summary}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{t('resultProduct')}</p><p className="text-sm font-semibold mt-0.5">{input["productName"]}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{t('resultCategory')}</p><p className="text-sm font-semibold mt-0.5">{t(`catTm_${input["category"]}`) || input["category"]}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{t('brandLabel')}</p><p className="text-sm font-semibold mt-0.5">{input["brandName"]}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{t('registeredInChina')}</p><p className="text-sm font-semibold mt-0.5">{freeData.needsRegistration ? t('tmActionNeeded') : t('tmYes')}</p></div>
              </div>

              {freeData.requiredDocuments && freeData.requiredDocuments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-primary-navy">{t('documentsTitle')}</h3>
                  <ul className="space-y-1">
                    {freeData.requiredDocuments.map((d: string, i: number) => (<li key={i} className="flex items-center gap-2 text-sm text-gray-600"><span className="w-1.5 h-1.5 bg-gold rounded-full"></span>{d}</li>))}
                  </ul>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center space-y-4">
              {subscribed ? (
                <>
                  <p className="text-lg font-semibold text-primary-navy">{t('subscribedViewReport')}</p>
                  <p className="text-sm text-gray-500">{t('subscribedDesc')}</p>
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                      <span>{t('subscribedBadge')}</span>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex justify-center">
                    <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full max-w-xs bg-gold hover:bg-gold/90 disabled:bg-gray-300 text-primary-navy font-semibold py-3 px-6 rounded-md transition-all text-lg"
                    >
                      {loading ? t('redirecting') : t('viewFullReport')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-primary-navy">{t('paymentTitle')}</p>
                  <p className="text-sm text-gray-500">{t('fullReportDesc')}</p>

                  <div className="max-w-xs mx-auto">
                    <input
                      type="email"
                      placeholder={t("emailForPdf")}
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm text-center"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full max-w-xs bg-gold hover:bg-gold/90 disabled:bg-gray-300 text-primary-navy font-semibold py-3 px-6 rounded-md transition-all text-lg"
                    >
                      {loading ? t('redirecting') : t('fullReport1')}
                    </button>
                    <p className="text-xs text-gray-400">{t('oneTimePayment')}</p>
                  </div>
                </>
              )}
            </div>

            {/* Expert CTA */}
            <div className="bg-primary-navy text-white rounded-lg p-8 text-center">
              <h3 className="text-xl font-bold mb-2">{t('expertCtaTitle')}</h3>
              <p className="text-white/80 mb-6 max-w-lg mx-auto">{t('expertCtaDesc')}</p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-6 py-3 rounded-md transition-all"
              >
                {t('expertCtaBtn')}
              </a>
              <p className="text-white/60 text-sm mt-3">{t('expertCtaPrice')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}