"use client";

import { WHATSAPP_URL } from '@trade/ui';

import { useState } from "react";
import { checkTrademark, CATEGORY_LABELS } from "../../../../../../modules/trademark/rules";
import { API_BASE } from "@/lib/constants";

type Step = "form" | "free-result";

export default function TrademarkCheckPage() {
  const [step, setStep] = useState<Step>("form");
  const [input, setInput] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [freeData, setFreeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.category || !input.productName) return;
    const result = checkTrademark(input as any);
    setFreeData(result);
    setStep("free-result");
  };

  const handlePayment = async () => {
    setLoading(true);
    setError("");

    try {
      const reportId = `TRADEMARK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Save report to D1 via API
      if (freeData) {
        const saveRes = await fetch('/api/report/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            module: 'Brand Protection',
            inputData: input,
            resultData: freeData,
            nextSteps: [
              'Conduct CNIPA trademark search in relevant Nice classes',
              'File trademark via direct CNIPA filing (8-14 months)',
              'Monitor 3-month opposition period',
              'Register Customs IP recordal for border enforcement',
              'Set up ongoing trademark monitoring',
            ],
          }),
        });
        if (!saveRes.ok) console.error('Save report failed');
      }

      // ⚡ 调试模式：跳过付款，直接跳报告
      window.location.href = "./report/?id=" + reportId;
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
    <main className="min-h-screen bg-[#F4F6F9]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8 text-sm text-gray-400">
          <span className={step === "form" ? "text-[#D4AF37] font-semibold" : ""}>1. Product Info</span>
          <span>&rarr;</span>
          <span className={step === "free-result" ? "text-[#D4AF37] font-semibold" : ""}>2. Free Result</span>
        </div>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
            <h1 className="text-2xl font-bold text-[#1B365D]">Brand Protection Check</h1>
            <p className="text-sm text-gray-500">Assess your brand's trademark registration needs and protection strategy in China.</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Category</label>
              <select
                value={input.category || ""}
                onChange={e => setVal("category", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              >
                <option value="">Select category...</option>
                {catOptions.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand Name</label>
              <input
                type="text"
                value={input["brandName"] || ""}
                onChange={e => setVal("brandName", e.target.value)}
                minLength={2}
                placeholder={"e.g., NaturePure"}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name</label>
              <input
                type="text"
                value={input["productName"] || ""}
                onChange={e => setVal("productName", e.target.value)}
                minLength={2}
                placeholder={"e.g., Organic Honey"}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country of Origin</label>
              <input
                type="text"
                value={input["originCountry"] || ""}
                onChange={e => setVal("originCountry", e.target.value)}
                minLength={2}
                placeholder={"e.g., Italy, USA"}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Already registered in China?</label>
              <select
                value={input["registeredInChina"] || ""}
                onChange={e => setVal("registeredInChina", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              >
                <option value="">Select...</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Has Chinese Brand Name?</label>
                <select
                  value={input["hasChineseName"] || ""}
                  onChange={e => setVal("hasChineseName", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No — need one</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Registered in Other Countries?</label>
                <select
                  value={input["hasForeignRegistration"] || ""}
                  onChange={e => setVal("hasForeignRegistration", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Primary Nice Class</label>
                <input
                  type="text"
                  value={input["tmClassDescription"] || ""}
                  onChange={e => setVal("tmClassDescription", e.target.value)}
                  placeholder={"e.g., Class 29 (meat/fish), Class 30 (coffee)"}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand in Market (years)</label>
                <input
                  type="text"
                  value={input["brandYearsInMarket"] || ""}
                  onChange={e => setVal("brandYearsInMarket", e.target.value)}
                  placeholder={"e.g., 10, New brand"}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Need Customs IP Recordal?</label>
              <select
                value={input["needsCustomsRecordal"] || ""}
                onChange={e => setVal("needsCustomsRecordal", e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              >
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="not_sure">Not sure</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-bold py-3 px-6 rounded-lg transition-all text-lg"
            >
              Check My Product
            </button>
          </form>
        )}

        {step === "free-result" && freeData && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-[#1B365D] mb-4">Free Assessment Result</h2>
              <p className="text-sm text-gray-700 mb-4">{freeData.summary}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Product</p><p className="text-sm font-semibold mt-0.5">{input["productName"]}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Category</p><p className="text-sm font-semibold mt-0.5">{CATEGORY_LABELS[input["category"] as keyof typeof CATEGORY_LABELS] || input["category"]}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Brand</p><p className="text-sm font-semibold mt-0.5">{input["brandName"]}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Registered in China</p><p className="text-sm font-semibold mt-0.5">{freeData.needsRegistration ? '❌ No — action needed' : '✅ Yes'}</p></div>
              </div>

              {freeData.requiredDocuments && freeData.requiredDocuments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-[#1B365D]">Documents Required</h3>
                  <ul className="space-y-1">
                    {freeData.requiredDocuments.map((d: string, i: number) => (<li key={i} className="flex items-center gap-2 text-sm text-gray-600"><span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full"></span>{d}</li>))}
                  </ul>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center space-y-4">
              <p className="text-lg font-semibold text-[#1B365D]">Get the Full Compliance Report</p>
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
                  {loading ? "Redirecting..." : "Full Report — $1"}
                </button>
                <p className="text-xs text-gray-400">One-time payment. Report delivered via web + email.</p>
              </div>
            </div>

            {/* Expert CTA */}
            <div className="bg-[#1B365D] text-white rounded-lg p-8 text-center">
              <h3 className="text-xl font-bold mb-2">💼 Need Professional Help?</h3>
              <p className="text-white/80 mb-6 max-w-lg mx-auto">Our compliance experts can handle the entire process for you.</p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#1B365D] font-semibold px-6 py-3 rounded-md transition-all"
              >
                Get a Quote from Our Experts →
              </a>
              <p className="text-white/60 text-sm mt-3">Professional services starting from $500</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}