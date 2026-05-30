/**
 * ReportShell — 模块感知报告外壳
 * 组合：Header + 共享区块 + 模块专有区块 + CTA + Footer
 * 各区块按顺序渲染，无数据时自动隐藏
 * 支持 6 模块：GACC / CCC / Label / NMPA / Cross-Border / Trademark
 */
import type { ReportLabels } from './types';
import { getGlossary } from './template';
import SectionTitle from './components/SectionTitle';

// ─── 共享区块 ─────────────────────────────────────────────────────
import DecisionSummary from './sections/shared/DecisionSummary';
import Regulations from './sections/shared/Regulations';
import RequiredDocuments from './sections/shared/RequiredDocuments';
import DocumentGuide from './sections/shared/DocumentGuide';
import CommonPitfalls from './sections/shared/CommonPitfalls';
import ComplianceChecklist from './sections/shared/ComplianceChecklist';
import Timeline from './sections/shared/Timeline';
import CustomsClearance from './sections/shared/CustomsClearance';
import Channels from './sections/shared/Channels';
import RiskMatrix from './sections/shared/RiskMatrix';
import MarketIntel from './sections/shared/MarketIntel';
import CompetitiveBenchmark from './sections/shared/CompetitiveBenchmark';
import IpBrandRisk from './sections/shared/IpBrandRisk';
import PostApproval from './sections/shared/PostApproval';
import EmergencyResponse from './sections/shared/EmergencyResponse';
import CostEstimation from './sections/shared/CostEstimation';
import HorizonScan from './sections/shared/HorizonScan';
import Glossary from './sections/shared/Glossary';
import NextSteps from './sections/shared/NextSteps';
import QuickNav from '@/components/QuickNav';

// ─── GACC 专有区块 ───────────────────────────────────────────────
import TariffTax from './sections/gacc/TariffTax';
import Classification from './sections/gacc/Classification';
import LabTesting from './sections/gacc/LabTesting';
import LabelCompliance from './sections/gacc/LabelCompliance';
import CountryProfile from './sections/gacc/CountryProfile';

// ─── CCC 专有区块 ────────────────────────────────────────────────
import CccCatalog from './sections/ccc/CccCatalog';
import CccStandards from './sections/ccc/CccStandards';
import CBReportGuide from './sections/ccc/CBReportGuide';
import FactoryAudit from './sections/ccc/FactoryAudit';
import TestingProcess from './sections/ccc/TestingProcess';

// ─── Label 专有区块 ──────────────────────────────────────────────
import MandatoryElements from './sections/label/MandatoryElements';
import NutritionLabeling from './sections/label/NutritionLabeling';
import AllergenDeclaration from './sections/label/AllergenDeclaration';
import TranslationGuide from './sections/label/TranslationGuide';
import LabelReview from './sections/label/LabelReview';

// ─── NMPA 专有区块 ───────────────────────────────────────────────
import FilingType from './sections/nmpa/FilingType';
import TestingReqs from './sections/nmpa/TestingReqs';
import GMPGuide from './sections/nmpa/GMPGuide';
import ChineseRPGuide from './sections/nmpa/ChineseRPGuide';
import AnimalTestingExempt from './sections/nmpa/AnimalTestingExempt';

// ─── Cross-Border 专有区块 ──────────────────────────────────────
import PlatformGuide from './sections/crossborder/PlatformGuide';
import LogisticsModel from './sections/crossborder/LogisticsModel';
import CustomsDocs from './sections/crossborder/CustomsDocs';
import PositiveList from './sections/crossborder/PositiveList';
import CSTaxGuide from './sections/crossborder/CSTaxGuide';

// ─── Trademark 专有区块 ──────────────────────────────────────────
import NiceClassification from './sections/trademark/NiceClassification';
import RegistrationProcess from './sections/trademark/RegistrationProcess';
import SquattingRisk from './sections/trademark/SquattingRisk';
import CustomsRecordal from './sections/trademark/CustomsRecordal';
import WatchService from './sections/trademark/WatchService';

// ─── 模块→专有区块映射 ──────────────────────────────────────────

type SectionComponent = React.ComponentType<{ result: any }>;

interface ModuleSectionGroup {
  /** 插入在 Channels 和 RiskMatrix 之间的区块（位置 A） */
  groupA: SectionComponent[];
  /** 插入在 RiskMatrix 和 MarketIntel 之间的区块（位置 B） */
  groupB: SectionComponent[];
}

const MODULE_SECTIONS: Record<string, ModuleSectionGroup> = {
  'GACC Food Registration': {
    groupA: [TariffTax, Classification],
    groupB: [LabTesting, LabelCompliance, CountryProfile],
  },
  'CCC Certification': {
    groupA: [CccCatalog, CccStandards],
    groupB: [CBReportGuide, FactoryAudit, TestingProcess],
  },
  'Chinese Label Compliance': {
    groupA: [MandatoryElements, NutritionLabeling],
    groupB: [AllergenDeclaration, TranslationGuide, LabelReview],
  },
  'Cosmetics Filing (NMPA)': {
    groupA: [FilingType, TestingReqs],
    groupB: [GMPGuide, ChineseRPGuide, AnimalTestingExempt],
  },
  'Cross-Border E-commerce': {
    groupA: [PlatformGuide, LogisticsModel],
    groupB: [CustomsDocs, PositiveList, CSTaxGuide],
  },
  'Brand Protection': {
    groupA: [NiceClassification, RegistrationProcess],
    groupB: [SquattingRisk, CustomsRecordal, WatchService],
  },
};

// ─── Props ───────────────────────────────────────────────────────

interface ReportShellProps {
  reportId: string;
  module: string;
  locale?: string;
  labels: ReportLabels;
  productInfo: {
    name: string;
    category: string;
    hsCode?: string;
    originCountry: string;
  };
  result: any;
  nextSteps?: string[];
  generatedAt: string;
}

function Section({ children, gold = false }: { children: React.ReactNode; gold?: boolean }) {
  return gold
    ? <div className="px-8 py-6 border-b border-gold/20 bg-gradient-to-r from-gold/[0.03] to-transparent last:border-b-0">{children}</div>
    : <div className="px-8 py-6 border-b border-gray-100 bg-white last:border-b-0 odd:bg-bg-ice/40">{children}</div>;
}

/** 预检组件是否渲染内容（无 hooks 的展示组件，直接调用安全） */
function hasContent(S: SectionComponent, result: any): boolean {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks — 纯展示组件无 hooks
    return (S as any)({ result }) !== null;
  } catch {
    return true; // 出错时渲染，宁可多也不漏
  }
}

function renderSection(S: SectionComponent, result: any) {
  return <S result={result} />;
}

// ─── Main Component ─────────────────────────────────────────────

export default function ReportShell(props: ReportShellProps) {
  const { reportId, module, locale, labels, productInfo, result, nextSteps, generatedAt } = props;
  const href = (path: string) => `/${locale || 'en'}${path}`;
  const glossary = result.glossary || getGlossary(module);
  const formattedDate = generatedAt ? new Date(generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : '—';

  const mod = MODULE_SECTIONS[module] || MODULE_SECTIONS['GACC Food Registration'];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none">
      {/* ═══ HEADER ═══ */}
      <div className="bg-primary-navy text-white px-8 pt-8 pb-6 print:bg-gray-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.03]">
          <svg viewBox="0 0 200 200"><path d="M100 0L200 100L100 200L0 100Z" fill="white"/></svg>
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-gold rounded-full"></span>
                <p className="text-gold text-sm font-semibold uppercase tracking-widest">{module}</p>
              </div>
              <h1 className="text-2xl font-bold">{labels.title}</h1>
            </div>
            <div className="text-right text-xs">
              <p className="text-white/60">Report #{reportId}</p>
              <p className="text-white/60">{formattedDate}</p>
              <p className="text-white/40 mt-1 uppercase tracking-wider">CONFIDENTIAL</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/70">
            <span>Prepared for: <strong className="text-white">{productInfo.name || 'Client'}</strong></span>
            <span>Category: <strong className="text-white">{productInfo.category}</strong></span>
            <span>Origin: <strong className="text-white">{productInfo.originCountry || '—'}</strong></span>
            {productInfo.hsCode && <span>HS Code: <strong className="text-white">{productInfo.hsCode}</strong></span>}
          </div>
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/10 group hover:bg-white/15 transition-all">
              <p className={`text-4xl font-bold mb-1 ${
                (result.riskScore || 0) >= 7 ? 'text-red-400' : (result.riskScore || 0) >= 4 ? 'text-amber-400' : 'text-green-400'
              }`}>{result.riskScore || 0}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Risk Score</p>
              <div className="mt-2 w-full bg-white/10 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${
                  (result.riskScore || 0) >= 7 ? 'bg-red-400 w-3/4' : (result.riskScore || 0) >= 4 ? 'bg-amber-400 w-1/2' : 'bg-green-400 w-1/4'
                }`}></div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/10 group hover:bg-white/15 transition-all">
              <p className={`text-lg font-bold mb-1 ${
                (result.riskScore || 0) >= 7 ? 'text-red-400' : (result.riskScore || 0) >= 4 ? 'text-amber-400' : 'text-green-400'
              }`}>{(result.riskScore || 0) >= 7 ? '🔴' : (result.riskScore || 0) >= 4 ? '🟡' : '🟢'}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Verdict</p>
              <p className="text-[9px] text-white/40 mt-1 leading-tight">{result.verdictLabel || '—'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/10 group hover:bg-white/15 transition-all">
              <p className="text-lg font-bold text-white mb-1">{result.estimatedTimeline || '—'}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Timeline</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/10 group hover:bg-white/15 transition-all">
              <p className="text-lg font-bold text-white mb-1">{result.totalCostRange || '—'}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Total Cost</p>
            </div>
          </div>

          {/* ── 风险维度条 ── */}
          {result.riskDimensions?.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
              {result.riskDimensions.slice(0, 5).map((d: any, i: number) => {
                const pct = Math.min(d.score * 10, 100);
                return (
                  <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-white/60 break-words max-w-[80%]">{d.dimension}</span>
                      <span className={`text-[10px] font-bold ${
                        d.score >= 7 ? 'text-red-400' : d.score >= 4 ? 'text-amber-400' : 'text-green-400'
                      }`}>{d.score}/10</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1">
                      <div className={`h-1 rounded-full transition-all ${
                        d.score >= 7 ? 'bg-red-400' : d.score >= 4 ? 'bg-amber-400' : 'bg-green-400'
                      }`} style={{width: pct + '%'}}></div>
                    </div>
                    <p className="text-[8px] text-white/40 mt-1 line-clamp-2">{d.note}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="space-y-0">
        {/* ── Shared: 策略层 ── */}
        {hasContent(DecisionSummary, result) && <Section><DecisionSummary result={result} /></Section>}
        {hasContent(Regulations, result) && <Section><Regulations result={result} /></Section>}
        {hasContent(RequiredDocuments, result) && <Section><RequiredDocuments result={result} /></Section>}
        {hasContent(DocumentGuide, result) && <Section><DocumentGuide result={result} /></Section>}
        {hasContent(CommonPitfalls, result) && <Section><CommonPitfalls result={result} /></Section>}
        {hasContent(ComplianceChecklist, result) && <Section><ComplianceChecklist result={result} /></Section>}
        {hasContent(Timeline, result) && <Section><Timeline result={result} /></Section>}
        {hasContent(CustomsClearance, result) && <Section><CustomsClearance result={result} /></Section>}
        {hasContent(Channels, result) && <Section><Channels result={result} /></Section>}

        {/* ── 模块 Group A（分类/目录/标准方向） ── */}
        {mod.groupA.map((S, i) => hasContent(S, result) && (
          <Section key={`gA-${i}`}>{renderSection(S, result)}</Section>
        ))}

        {hasContent(RiskMatrix, result) && <Section><RiskMatrix result={result} /></Section>}

        {/* ── 模块 Group B（测试/流程/实践方向） ── */}
        {mod.groupB.map((S, i) => hasContent(S, result) && (
          <Section key={`gB-${i}`}>{renderSection(S, result)}</Section>
        ))}

        {/* ── Shared: 深度层 ── */}
        {hasContent(MarketIntel, result) && <Section><MarketIntel result={result} /></Section>}
        {hasContent(CompetitiveBenchmark, result) && <Section gold><CompetitiveBenchmark result={result} /></Section>}
        {hasContent(IpBrandRisk, result) && <Section><IpBrandRisk result={result} /></Section>}
        {hasContent(PostApproval, result) && <Section><PostApproval result={result} /></Section>}
        {hasContent(EmergencyResponse, result) && <Section><EmergencyResponse result={result} /></Section>}
        {hasContent(CostEstimation, result) && <Section><CostEstimation result={result} /></Section>}
        {hasContent(HorizonScan, result) && <Section><HorizonScan result={result} /></Section>}
        <Section><Glossary glossary={glossary} /></Section>
        <Section><NextSteps steps={nextSteps || []} /></Section>
      </div>

      {/* 快速导航浮标 — 仅在窗口滚过 header 后显示 */}
      <QuickNav />

      {/* ═══ CTA ═══ */}
      <div className="bg-gradient-to-r from-primary-navy to-primary-navy/90 rounded-xl m-8 p-8 text-center">
        <h3 className="text-xl font-bold text-gold mb-2">{labels.ctaTitle}</h3>
        <p className="text-white/80 text-sm mb-6 max-w-lg mx-auto">{labels.ctaDesc}</p>
        <a href={href('/quote')} className="inline-block bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-8 py-3 rounded-md transition-all shadow-lg">
          {labels.ctaBtn}
        </a>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="bg-gray-900 text-white/60 px-8 py-6 text-xs flex flex-wrap justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-white">{labels.footerName}</span>
          <span>{labels.footerAddress}</span>
          <span>{labels.footerEmail}</span>
        </div>
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <span>CONFIDENTIAL</span>
          <span>Report #{reportId}</span>
        </div>
      </div>
    </div>
  );
}
