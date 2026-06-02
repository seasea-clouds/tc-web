"use client";

import { useT, WHATSAPP_URL } from '@trade/ui';

import { useState } from "react";
import { checkCcc, CATEGORY_LABELS } from "../../../../../../modules/ccc/rules";
import { API_BASE } from "@/lib/constants";

type Step = "form" | "free-result";

export default function CccCheckClient() {
  const t = useT('Check');
  const [step, setStep] = useState<Step>("form");
  const [input, setInput] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [freeData, setFreeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.category || !input.productName) return;
    const result = checkCcc(input as any);
    setFreeData(result);
    setStep("free-result");
  };

  const handlePayment = async () => {
    setLoading(true);
    setError("");

    try {
      const reportId = `CCC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Save report to D1 via API
      if (freeData) {
        const saveRes = await fetch('/api/report/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            module: 'CCC Certification',
            inputData: input,
            resultData: freeData,
            nextSteps: [
              'Select a CNCA-accredited certification body for your product category',
              'Submit product samples for type testing (Safety + EMC)',
              'Prepare factory inspection documentation and QMS',
              'Receive CCC certificate and mark authorization (4-6 months)',
              'Maintain annual factory surveillance inspections',
            ],
          }),
        });
        const saveData = await saveRes.json();
        if (!saveData.saved) {
          console.warn('D1 save not available — will use localStorage fallback');
        }
      }

      // Save to localStorage for report page fallback
      try {
        localStorage.setItem('compli-report-input', JSON.stringify({
          ...input,
          productName: input.productName || 'Your Product',
        }));
      } catch {}
      
      // ⚡ 调试模式：跳过付款，直接跳报告
      window.location.href = "/" + window.location.pathname.split('/')[1] + "/c/report/?id=" + reportId;
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  };

  // Helper to set input values
  const setVal = (name: string, val: string) => setInput(v => ({ ...v, [name]: val }));

  // Get category options
  const catOptions = Object.entries(CATEGORY_LABELS) as [string, string][];

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
            <h1 className="text-2xl font-bold text-[#1B365D]">{t('reportModuleCcc')} Check</h1>
            <p className="text-sm text-gray-500">Find out if your product requires China Compulsory Certification (CCC) for import.</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('productCategory')}</label>
              <select
                value={input.category || ""}
                onChange={e => setVal("category", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              >
                <option value="">{t('selectCategory')}</option>
                {catOptions.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('productName')}</label>
              <input
                type="text"
                value={input["productName"] || ""}
                onChange={e => setVal("productName", e.target.value)}
                minLength={2}
                placeholder={"e.g., Wireless Bluetooth Speaker"}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('hsCode')}</label>
              <input
                type="text"
                value={input["hsCode"] || ""}
                onChange={e => setVal("hsCode", e.target.value)}
                minLength={2}
                placeholder={"e.g., 8518.22 (optional)"}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('intendedUse')}</label>
              <input
                type="text"
                value={input["intendedUse"] || ""}
                onChange={e => setVal("intendedUse", e.target.value)}
                minLength={2}
                placeholder={"e.g., Home use, industrial, medical"}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
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
                placeholder={"e.g., China, Vietnam, Germany"}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('manufacturerCountry')}</label>
                <input
                  type="text"
                  value={input["manufacturerCountry"] || ""}
                  onChange={e => setVal("manufacturerCountry", e.target.value)}
                  placeholder={"e.g., China, Vietnam"}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('annualVolume')}</label>
                <input
                  type="text"
                  value={input["annualVolume"] || ""}
                  onChange={e => setVal("annualVolume", e.target.value)}
                  placeholder={"e.g., 50,000 pcs/year"}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Has CB Test Report?</label>
                <select
                  value={input["hasCBReport"] || ""}
                  onChange={e => setVal("hasCBReport", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">{t('selectOption')}</option>
                  <option value="yes">{t('yes')}</option>
                  <option value="no">{t('no')}</option>
                  <option value="in_progress">{t('inProgress')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CE / UL / Other Certified?</label>
                <select
                  value={input["hasCEorUL"] || ""}
                  onChange={e => setVal("hasCEorUL", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">{t('selectOption')}</option>
                  <option value="ce">CE</option>
                  <option value="ul">UL</option>
                  <option value="fcc">FCC</option>
                  <option value="other">Other</option>
                  <option value="none">{t('none')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Voltage / Power Specs (optional)</label>
              <input
                type="text"
                value={input["voltagePower"] || ""}
                onChange={e => setVal("voltagePower", e.target.value)}
                placeholder={"e.g., 100-240V, 50/60Hz, 50W"}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              />
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
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">CCC Required</p><p className="text-sm font-semibold mt-0.5">{freeData.requiresCcc ? '✅ Yes' : '❌ May not be required'}</p></div>
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
              <p className="text-sm text-gray-500">Complete report with all required documents, timeline, and next steps.</p>

              <div className="max-w-xs mx-auto">
                <input
                  type="email"
                  placeholder="Email (optional)"
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
              <p className="text-white/80 mb-6 max-w-lg mx-auto">Our compliance experts can handle the entire process for you.</p>
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