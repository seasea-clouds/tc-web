"use client";

import { useT, WHATSAPP_URL } from '@trade/ui';

import { useState } from "react";
import { checkCosmetics, CATEGORY_LABELS } from "../../../../../../modules/nmpa/rules";
import { API_BASE } from "@/lib/constants";
import { useFormValidation, inputClasses, selectClasses } from "@/lib/useFormValidation";
import { usePathPrefix } from '@/lib/useSubsiteHref';

type Step = "form" | "free-result";

export default function NmpaCheckClient() {
  const t = useT('Check');
  const [step, setStep] = useState<Step>("form");
  const [input, setInput] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [freeData, setFreeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { fieldErrors, validate, clearFieldError } = useFormValidation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(input, ['category', 'productName'])) return;
    const result = checkCosmetics(input as any);
    setFreeData(result);
    setStep("free-result");
  };

  const handlePayment = async () => { try {
      const reportId = `NMPA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // 1. Always save to localStorage first
      try {
        localStorage.setItem('compli-report-input', JSON.stringify({
          ...input,
          productName: input.productName || t('yourProduct'),
        }));
      } catch {}

      // 2. Fire-and-forget API calls
      if (freeData) {
        fetch('/api/report/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            module: 'Cosmetics Filing (NMPA)',
            inputData: input,
            resultData: freeData,
            nextSteps: [
              'Designate Chinese responsible person (境内责任人)',
              'Complete safety assessment per NMPA 2021 guidelines',
              'Coordinate testing at NMPA-designated laboratory',
              'File NMPA notification (备案) for ordinary cosmetics',
              'Set up post-market adverse event monitoring',
            ],
          }),
        }).catch(e => console.warn('D1 save failed:', e));
        
        fetch('/api/report/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, module: 'nmpa', inputData: input }),
        }).catch(e => console.warn('PDF generation skipped (dev mode):', e));
      }

      if (email) {
        fetch('/api/report/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, email, module: 'nmpa', inputData: input }),
        }).catch(e => console.warn('Email send failed (dev mode):', e));
      }

      window.location.href = usePathPrefix() + "/c/report/?id=" + reportId;
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
    <div className="bg-[#F4F6F9]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8 text-sm text-gray-400">
          <span className={step === "form" ? "text-[#D4AF37] font-semibold" : ""}>{t('step1')}</span>
          <span>&rarr;</span>
          <span className={step === "free-result" ? "text-[#D4AF37] font-semibold" : ""}>{t('step2')}</span>
        </div>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
            {Object.keys(fieldErrors).length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-2">
                {t('requiredFieldsError')}
              </div>
            )}
            <h1 className="text-2xl font-bold text-[#1B365D]">{t('nmpaTitle')}</h1>
            <p className="text-sm text-gray-500">{t('nmpaSubtitle')}</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('productCategory')}</label>
              <select
                value={input.category || ""}
                onChange={e => { setVal("category", e.target.value); clearFieldError("category"); }}
                className={selectClasses(!!fieldErrors["category"])}
                required
              >
                <option value="">{t('selectCategory')}</option>
                {catOptions.map(([v, l]) => (<option key={v} value={v}>{t(`catNmpa_${v}`, l)}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('productName')}</label>
              <input
                type="text"
                value={input["productName"] || ""}
                onChange={e => { setVal("productName", e.target.value); clearFieldError("productName"); }}
                className={inputClasses(!!fieldErrors["productName"])}
                minLength={2}
                placeholder={t("productNamePlaceholder")}
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
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('novelIngredient')}</label>
              <select
                value={input["hasNewIngredient"] || ""}
                onChange={e => setVal("hasNewIngredient", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              >
                <option value="">{t('selectOption')}</option>
                <option value="true">{t('yes')}</option>
                <option value="false">{t('no')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('containsAlcohol')}</label>
                <select
                  value={input["hasAlcohol"] || ""}
                  onChange={e => setVal("hasAlcohol", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">{t('selectOption')}</option>
                  <option value="yes">{t('yes')}</option>
                  <option value="no">{t('no')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('sunScreenClaim')}</label>
                <select
                  value={input["hasSunscreenClaim"] || ""}
                  onChange={e => setVal("hasSunscreenClaim", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">{t('selectOption')}</option>
                  <option value="true">{t('yesSpecialCosmetics')}</option>
                  <option value="false">{t('no')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('primaryProductFunction')}</label>
                <input
                  type="text"
                  value={input["productFunction"] || ""}
                  onChange={e => setVal("productFunction", e.target.value)}
                  placeholder={t("productFunctionPlaceholder")}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('netVolume')}</label>
                <input
                  type="text"
                  value={input["packagingVolume"] || ""}
                  onChange={e => setVal("packagingVolume", e.target.value)}
                  placeholder={t("netVolumePlaceholder")}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('gmpCert')}</label>
              <select
                value={input["hasGMPCert"] || ""}
                onChange={e => setVal("hasGMPCert", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              >
                <option value="">{t('selectOption')}</option>
                <option value="yes">{t('yes')}</option>
                <option value="no">{t('no')}</option>
                <option value="in_progress">{t('inProgress')}</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-bold py-3 px-6 rounded-lg transition-all text-lg"
            >
              {t('checkBtn')}
            </button>
          </form>
        )}

        {step === "free-result" && freeData && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-[#1B365D] mb-4">{t('freeResult')}</h2>
              <p className="text-sm text-gray-700 mb-4">{freeData.summary}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{t('resultProduct')}</p><p className="text-sm font-semibold mt-0.5">{input["productName"]}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{t('resultCategory')}</p><p className="text-sm font-semibold mt-0.5">{CATEGORY_LABELS[input["category"] as keyof typeof CATEGORY_LABELS] || input["category"]}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{t('filingType')}</p><p className="text-sm font-semibold mt-0.5">{freeData.isSpecialCosmetics ? t('specialCosmetics') : t('ordinaryCosmetics')}</p></div>
              </div>

              {freeData.requiredDocuments && freeData.requiredDocuments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-[#1B365D]">{t('documentsTitle')}</h3>
                  <ul className="space-y-1">
                    {freeData.requiredDocuments.map((d: string, i: number) => (<li key={i} className="flex items-center gap-2 text-sm text-gray-600"><span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full"></span>{d}</li>))}
                  </ul>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center space-y-4">
              <p className="text-lg font-semibold text-[#1B365D]">{t('paymentTitle')}</p>
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
                  className="w-full max-w-xs bg-[#D4AF37] hover:bg-[#D4AF37]/90 disabled:bg-gray-300 text-[#1B365D] font-semibold py-3 px-6 rounded-md transition-all text-lg"
                >
                  {loading ? t('redirecting') : t('fullReport1')}
                </button>
                <p className="text-xs text-gray-400">{t('oneTimePayment')}</p>
              </div>
            </div>

            {/* Expert CTA */}
            <div className="bg-[#1B365D] text-white rounded-lg p-8 text-center">
              <h3 className="text-xl font-bold mb-2">{t('expertCtaTitle')}</h3>
              <p className="text-white/80 mb-6 max-w-lg mx-auto">{t('expertCtaDesc')}</p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-semibold px-6 py-3 rounded-md transition-all"
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