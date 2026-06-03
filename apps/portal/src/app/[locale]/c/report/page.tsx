'use client';
import { useT } from '@trade/ui';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportViewer from '@/components/ReportViewer';
import { API_BASE } from '@/lib/constants';
import useSubsiteHref from '@/lib/useSubsiteHref';
import { checkGacc } from '../../../../../modules/gacc/rules';
import { checkCcc } from '../../../../../modules/ccc/rules';
import { checkCosmetics } from '../../../../../modules/nmpa/rules';
import { checkLabel } from '../../../../../modules/label/rules';
import { checkCrossborder } from '../../../../../modules/crossborder/rules';
import { checkTrademark } from '../../../../../modules/trademark/rules';
import { CATEGORY_LABELS as GACC_LABELS } from '../../../../../modules/gacc/rules';
import { CATEGORY_LABELS as CCC_LABELS } from '../../../../../modules/ccc/rules';
import { CATEGORY_LABELS as COSMETICS_LABELS } from '../../../../../modules/nmpa/rules';
import { CATEGORY_LABELS as LABEL_LABELS } from '../../../../../modules/label/rules';
import { CATEGORY_LABELS as CB_LABELS } from '../../../../../modules/crossborder/rules';
import { CATEGORY_LABELS as TM_LABELS } from '../../../../../modules/trademark/rules';

const CHECK_MAP: Record<string, (input: any) => any> = {
  'GACC Food Registration': checkGacc,
  'CCC Certification': checkCcc,
  'Cosmetics Filing (NMPA)': checkCosmetics,
  'Chinese Label Compliance': checkLabel,
  'Cross-Border E-commerce': checkCrossborder,
  'Brand Protection': checkTrademark,
};

const CATEGORY_LABELS_MAP: Record<string, Record<string, string>> = {
  GACC: GACC_LABELS,
  CCC: CCC_LABELS,
  COSMETICS: COSMETICS_LABELS,
  LABEL: LABEL_LABELS,
  CROSSBORDER: CB_LABELS,
  TRADEMARK: TM_LABELS,
};

function rebuildResult(stored: any): any {
  const fn = CHECK_MAP[stored.module];
  if (!fn) return stored.result || {};
  try {
    const input = {
      ...(stored.savedInput || {}),
      productName: stored.productInfo?.name || '',
      originCountry: stored.productInfo?.originCountry || '',
    };
    try { return fn(input); } catch { return stored.result || {}; }
  } catch (e) {
    console.error('Rebuild failed:', e);
    return stored.result || {};
  }
}

const MAX_RETRIES = 15;
const RETRY_DELAY = 2000;

function ReportContent() {
  const searchParams = useSearchParams();
  const subsiteHref = useSubsiteHref();
  const id = searchParams.get('id');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const retries = useRef(0);
  const t = useT('Report');

  useEffect(() => {
    if (!id) {
      setError('No report ID provided');
      setLoading(false);
      return;
    }

    // Fetch report from D1 API
    fetch('/api/report/' + encodeURIComponent(id))
      .then(res => {
        if (!res.ok) throw new Error('Report not found');
        return res.json();
      })
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        // Fallback: try rebuilding from savedInput
        try {
          const storedInput = localStorage.getItem('compli-report-input');
          if (storedInput) {
            const prefix = id.split('-')[0].toUpperCase();
            const map: Record<string, {label:string;fn:(i:any)=>any;nextSteps:string[]}> = {
              GACC: {label:'GACC Food Registration',fn:checkGacc,nextSteps:['Complete GACC registration','Prepare documentation','Submit application']},
              CCC: {label:'CCC Certification',fn:checkCcc,nextSteps:['Select certification body','Submit samples','Prepare factory audit']},
              COSMETICS: {label:'Cosmetics Filing (NMPA)',fn:checkCosmetics,nextSteps:['Designate responsible person','Complete safety assessment','File NMPA notification']},
              LABEL: {label:'Chinese Label Compliance',fn:checkLabel,nextSteps:['Submit label artwork','Verify mandatory elements','Obtain print-ready files']},
              CROSSBORDER: {label:'Cross-Border E-commerce',fn:checkCrossborder,nextSteps:['Select platform','Complete registration','Set up logistics']},
              TRADEMARK: {label:'Brand Protection',fn:checkTrademark,nextSteps:['CNIPA search','File trademark','Monitor opposition']},
            };
            const m = map[prefix];
            if (m) {
              const savedInput = JSON.parse(storedInput);
              const sr = m.fn(savedInput);
              setReport({id,module:m.label,
                productInfo:{name:savedInput.productName||savedInput.brandName||'Your Product',category:savedInput.category||'',originCountry:savedInput.originCountry||''},
                result:sr,nextSteps:m.nextSteps,generatedAt:new Date().toISOString()});
              setLoading(false);
              return;
            }
          }
        } catch {}
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="bg-bg-ice py-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="animate-spin h-8 w-8 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-primary-navy mb-2">{t('loadingTitle')}</h1>
            <p className="text-gray-500 text-sm">{t('loadingDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-bg-ice py-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-primary-navy mb-2">{t('notFoundTitle')}</h1>
            <p className="text-gray-500 text-sm mb-6">{error || 'Report not found.'}</p>
            <a href={subsiteHref('/')} className="inline-block bg-gold hover:bg-gold/90 text-primary-navy font-semibold px-6 py-2.5 rounded-md transition-all">
              &larr; Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <ReportViewer report={report} />;
}export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="bg-bg-ice flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4" />
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
