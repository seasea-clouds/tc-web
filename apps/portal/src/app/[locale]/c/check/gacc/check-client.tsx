"use client";

import { useT } from '@trade/ui';
import { useState } from "react";
import { checkGacc, CATEGORY_LABELS, type GaccCategory, type GaccInput } from "../../../../../../modules/gacc/rules";
import { useFormValidation, inputClasses, selectClasses } from "@/lib/useFormValidation";
import { usePathPrefix } from '@/lib/useSubsiteHref';

type Step = "form" | "free-result";

export default function GaccCheckClient() {
  const t = useT('Check');
  const [step, setStep] = useState<Step>("form");
  const [input, setInput] = useState<Partial<GaccInput>>({});
  const [email, setEmail] = useState("");
  const [freeData, setFreeData] = useState<ReturnType<typeof checkGacc> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { fieldErrors, validate, clearFieldError } = useFormValidation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(input, ['category', 'productName', 'originCountry'])) return;
    const result = checkGacc(input as GaccInput);
    setFreeData(result);
    setStep("free-result");
  };

  const pathPrefix = usePathPrefix();
  const handlePayment = async () => { try {
      const reportId = `GACC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // 1. Always save to localStorage first (reliable, no API dependency)
      try {
        localStorage.setItem('compli-report-input', JSON.stringify({
          ...input,
          productName: input.productName || t('yourProduct'),
        }));
      } catch {}

      // 2. Fire-and-forget API calls (don't block redirect)
      if (freeData) {
        fetch('/api/report/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            module: 'GACC Food Registration',
            inputData: input,
            resultData: freeData,
            nextSteps: [
              'Determine product category among 18 GACC-regulated categories',
              'Register in CIFER system with CRA (Compliance Review Agent) assignment',
              'Prepare all required documentation with professional Chinese translation',
              'Complete label compliance review (GB 7718 / GB 28050) before printing',
              'Submit GACC registration application and track 3-6 month review',
            ],
          }),
        }).catch(e => console.warn('D1 save failed:', e));
        
        fetch('/api/report/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, module: 'gacc', inputData: input }),
        }).catch(e => console.warn('PDF generation skipped (dev mode):', e));
      }

      if (email) {
        fetch('/api/report/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, email, module: 'gacc', inputData: input }),
        }).catch(e => console.warn('Email send failed (dev mode):', e));
      }

      // 3. Always redirect after saving to localStorage
      window.location.href = pathPrefix + "/c/report/?id=" + reportId;
    } catch (err) {
      // Last resort: even if everything fails, try to get the user to the report page
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

  return (
    <div className="bg-bg-ice">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8 text-sm text-gray-400">
          <span className={`${step === "form" ? "text-gold font-semibold" : ""}`}>{t('step1')}</span>
          <span>&rarr;</span>
          <span className={`${step === "free-result" ? "text-gold font-semibold" : ""}`}>{t('step2')}</span>
        </div>

        {/* Form */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-8 space-y-6">
            {Object.keys(fieldErrors).length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-2">
                {t('requiredFieldsError')}
              </div>
            )}
            <h1 className="text-2xl font-bold text-primary-navy">{t('gaccTitle')}</h1>
            <p className="text-gray-500 text-sm">{t('gaccSubtitle')}</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('productCategory')}</label>
              <select
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                value={input.category ?? ""}
                onChange={(e) => setInput({ ...input, category: e.target.value as GaccCategory })}
                required
              >
                <option value="">{t('selectCategory')}</option>
                {(Object.entries(CATEGORY_LABELS) as [GaccCategory, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{t(`catGacc_${key}`, label)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('productName')}</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                minLength={2}
                required
                placeholder={t('productNamePlaceholder')}
                value={input.productName ?? ""}
                onChange={(e) => setInput({ ...input, productName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('countryOfOrigin')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                  required
                placeholder={t('countryPlaceholder')}
                  value={input.originCountry ?? ""}
                  onChange={(e) => setInput({ ...input, originCountry: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('hsCodeOptional')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                  placeholder={t('hsCodePlaceholder')}
                  value={input.hsCode ?? ""}
                  onChange={(e) => setInput({ ...input, hsCode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('manufacturerExporter')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                  placeholder={t('manufacturerPlaceholder')}
                  value={input.manufacturerName ?? ""}
                  onChange={(e) => setInput({ ...input, manufacturerName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('annualExportVolume')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                  placeholder={t('exportVolumePlaceholder')}
                  value={input.exportVolume ?? ""}
                  onChange={(e) => setInput({ ...input, exportVolume: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('packagingMaterialLabel')}</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                  value={input.packagingMaterial ?? ""}
                  onChange={(e) => setInput({ ...input, packagingMaterial: e.target.value })}
                >
                  <option value="">{t('selectPackaging')}</option>
                  <option value="glass">{t('packagingGlass')}</option>
                  <option value="plastic">{t('packagingPlastic')}</option>
                  <option value="can">{t('packagingCan')}</option>
                  <option value="pouch">{t('packagingPouch')}</option>
                  <option value="box">{t('packagingBox')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('chineseLabelArtworkReady')}</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                  value={input.hasLabelArtwork ?? ""}
                  onChange={(e) => setInput({ ...input, hasLabelArtwork: e.target.value })}
                >
                  <option value="">{t('selectOption')}</option>
                  <option value="yes">{t('yes')}</option>
                  <option value="no">{t('no')}</option>
                  <option value="in_progress">{t('inProgress')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('productDescriptionLabel')}</label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                rows={2}
                placeholder={t('productDescPlaceholder')}
                value={input.productDescription ?? ""}
                onChange={(e) => setInput({ ...input, productDescription: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gold hover:bg-gold/90 text-primary-navy font-semibold py-3 px-6 rounded-md transition-all"
            >
              {t('checkBtn')}
            </button>
          </form>
        )}

        {/* Free Result */}
        {step === "free-result" && freeData && (
          <div className="bg-white rounded-lg shadow-sm border p-8 space-y-6">
            <h2 className="text-xl font-bold text-primary-navy">{t('freeResult')}</h2>

            <div className={`rounded-lg p-4 ${freeData.requiresRegistration ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
              <p className="font-semibold">
                {freeData.requiresRegistration
                  ? t('requiresGaccReg')
                  : t('notRequiresGaccReg')}
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>{t('resultProductLabel')}:</strong> {input.productName}</p>
              <p><strong>{t('resultCategoryLabel')}:</strong> {CATEGORY_LABELS[input.category!]}</p>
              <p><strong>{t('riskLevel')}:</strong> {freeData.riskCategory === "high" ? "🔴 High" : "🟢 Low"}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">{t('documentsTitle')}</h3>
              <ul className="space-y-1">
                {freeData.requiredDocuments.slice(0, 5).map((doc, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400">&#x2610;</span>
                    {doc}
                  </li>
                ))}
              </ul>
              {freeData.requiredDocuments.length > 5 && (
                <p className="text-xs text-gray-400 mt-2">+ {freeData.requiredDocuments.length - 5} {t('moreInFullReport')}</p>
              )}
            </div>

            <div className="border-t pt-6 text-center space-y-4">
              <p className="text-lg font-semibold text-primary-navy">{t('paymentTitle')}</p>
              <p className="text-sm text-gray-500">{t('fullReportDesc')}</p>

              {/* Email input */}
              <div className="max-w-xs mx-auto">
                <input
                  type="email"
                  placeholder={t('emailForPdf')}
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm text-center"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full max-w-xs bg-gold hover:bg-gold/90 disabled:bg-gray-300 text-primary-navy font-semibold py-3 px-6 rounded-md transition-all text-lg"
                >
                  {loading ? t('redirecting') : t('fullReport1')}
                </button>
                <p className="text-xs text-gray-400">
                  {t('oneTimePaymentDesc')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
