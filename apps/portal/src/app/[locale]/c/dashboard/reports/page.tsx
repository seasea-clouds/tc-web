'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { API_BASE } from '@/lib/constants';

interface Report {
  id: string;
  module: string;
  product_name: string;
  payment_status: string;
  created_at: string;
}

function ReportsContent() {
  const t = useTranslations('Dashboard');
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/reports/list`, {
      headers: { credentials: 'include' },
    })
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-[#1B365D] mb-8">{t('myReports')}</h1>

      {loading && (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      )}

      {!loading && reports.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-lg border p-8">
          <p className="text-lg mb-2">No reports yet</p>
          <p className="text-sm">Complete a compliance check to see your reports here.</p>
        </div>
      )}

      {/* Report list */}
      {reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : r)}
              className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-[#D4AF37] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1B365D]">{r.module}</p>
                  <p className="text-sm text-gray-500">{r.product_name}</p>
                  <p className="text-xs text-gray-400">{r.created_at}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  r.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {r.payment_status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReport(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#1B365D]">{selectedReport.module}</h2>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <p className="font-semibold text-gray-800">{selectedReport.product_name}</p>
            <p className="text-xs text-gray-400 mt-1">ID: {selectedReport.id}</p>
            <p className="text-xs text-gray-400 mb-4">{selectedReport.created_at}</p>
            <span className={`inline-block text-xs px-2 py-1 rounded-full ${
              selectedReport.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {selectedReport.payment_status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}
