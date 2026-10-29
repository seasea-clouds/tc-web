'use client';

import { useMemo, useState } from 'react';
import type { DocMeta } from '@/lib/documents';
import RegulationRows, { type RegulationRowTexts } from './RegulationRows';

export interface RegulationFilterTexts extends RegulationRowTexts {
  /** category slug → 本地化标签（Regulations.cat_<slug>，48 语言齐） */
  catLabels?: Record<string, string>;
  filterIssuer: string;
  filterCategory: string;
  filterYear: string;
  filterStatus: string;
  filterAll: string;
  filterReset: string;
  filterEmpty: string;
}

/**
 * 政策列表 + 筛选。
 *
 * 静态导出（output: export）下筛选只能在客户端跑，因此：
 * - 初始 SSR 输出的是「当页全部条目」，无 JS 也能看到完整列表（SEO 友好）
 * - 一旦选了任一筛选条件，改为在全量文档上过滤，并隐藏服务端分页器
 *   （分页是服务端页面概念，与客户端筛选混用会误导用户）
 */
export default function RegulationFilter({
  docs,
  pageDocs,
  locale,
  texts,
  children,
}: {
  /** 全量文档（用于筛选） */
  docs: DocMeta[];
  /** 当页文档（无筛选时展示） */
  pageDocs: DocMeta[];
  locale: string;
  texts: RegulationFilterTexts;
  /** 服务端分页器；有筛选条件时隐藏 */
  children?: React.ReactNode;
}) {
  const [issuer, setIssuer] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');

  const issuers = useMemo(
    () => Array.from(new Set(docs.map((d) => d.issuer).filter(Boolean))).sort(),
    [docs],
  );
  const categories = useMemo(
    () => Array.from(new Set(docs.map((d) => d.category).filter(Boolean))).sort(),
    [docs],
  );
  const statuses = useMemo(
    () => Array.from(new Set(docs.map((d) => d.status).filter(Boolean))),
    [docs],
  );
  /** 发布年份：取自 published_at，倒序（新的在前） */
  const years = useMemo(
    () =>
      Array.from(
        new Set(docs.map((d) => (d.publishedAt || '').slice(0, 4)).filter((y) => /^\d{4}$/.test(y))),
      ).sort().reverse(),
    [docs],
  );

  const active = Boolean(issuer || category || year || status);

  const filtered = useMemo(() => {
    if (!active) return pageDocs;
    return docs.filter(
      (d) =>
        (!issuer || d.issuer === issuer) &&
        (!category || d.category === category) &&
        (!year || (d.publishedAt || '').startsWith(year)) &&
        (!status || d.status === status),
    );
  }, [active, docs, pageDocs, issuer, category, year, status]);

  const selectClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#333333] focus:border-primary-navy focus:outline-none focus:ring-1 focus:ring-primary-navy';

  return (
    <>
      {/* 筛选栏：四个维度只要该字段有值就出现 —— 即便只有一个可选值也保留下拉
          （用户 2026-10-29 裁定：所有筛选只有一个值也要有下拉） */}
      {(issuers.length > 0 || categories.length > 0 || years.length > 0 || statuses.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {issuers.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-[#5F6F7F]">
              <span className="font-medium">{texts.filterIssuer}</span>
              <select className={selectClass} value={issuer} onChange={(e) => setIssuer(e.target.value)}>
                <option value="">{texts.filterAll}</option>
                {issuers.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          )}

          {categories.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-[#5F6F7F]">
              <span className="font-medium">{texts.filterCategory}</span>
              <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">{texts.filterAll}</option>
                {categories.map((v) => (
                  <option key={v} value={v}>
                    {texts.catLabels?.[v] || v}
                  </option>
                ))}
              </select>
            </label>
          )}

          {years.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-[#5F6F7F]">
              <span className="font-medium">{texts.filterYear}</span>
              <select className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">{texts.filterAll}</option>
                {years.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          )}

          {statuses.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-[#5F6F7F]">
              <span className="font-medium">{texts.filterStatus}</span>
              <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">{texts.filterAll}</option>
                {statuses.map((v) => (
                  <option key={v} value={v}>
                    {texts.statusLabels[v] || v}
                  </option>
                ))}
              </select>
            </label>
          )}

          {active && (
            <button
              type="button"
              onClick={() => {
                setIssuer('');
                setCategory('');
                setYear('');
                setStatus('');
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-primary-navy transition-colors hover:border-primary-navy"
            >
              {texts.filterReset}
            </button>
          )}
        </div>
      )}

      {active && filtered.length === 0 ? (
        <p className="py-16 text-center text-[#5F6F7F]">{texts.filterEmpty}</p>
      ) : (
        <RegulationRows docs={filtered} locale={locale} texts={texts} />
      )}

      {/* 有筛选条件时不展示服务端分页器 */}
      {children && <div className={active ? 'hidden' : ''}>{children}</div>}
    </>
  );
}
