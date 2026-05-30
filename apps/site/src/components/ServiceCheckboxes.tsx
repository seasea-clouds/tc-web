'use client';

import { useSearchParams } from 'next/navigation';

const serviceIds = ['gacc', 'label', 'ccc', 'cosmetics', 'ecommerce', 'brand'];

const packageMap: Record<string, Set<string>> = {
  basic: new Set(['gacc']),
  advanced: new Set(['gacc', 'label', 'ccc']),
  premium: new Set(['gacc', 'label', 'ccc', 'cosmetics', 'ecommerce', 'brand']),
};

interface ServiceLabel {
  id: string;
  icon: string;
  label: string;
}

export default function ServiceCheckboxes({
  labels,
}: {
  labels: ServiceLabel[];
}) {
  const searchParams = useSearchParams();
  const pkg = searchParams?.get('package')?.toLowerCase() || '';
  const preSelected = packageMap[pkg] || new Set();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {serviceIds.map((id) => {
        const svc = labels.find((l) => l.id === id);
        if (!svc) return null;
        return (
          <label
            key={id}
            className="flex items-center gap-2 p-2 sm:p-3 rounded-lg border border-gray-200 hover:border-[#1B365D] hover:bg-[#F4F6F9] transition-all cursor-pointer"
          >
            <input
              type="checkbox"
              name="services[]"
              value={id}
              defaultChecked={preSelected.has(id)}
              className="w-4 h-4 text-[#1B365D] focus:ring-[#1B365D] rounded flex-shrink-0"
            />
            <span className="text-xl flex-shrink-0">{svc.icon}</span>
            <span className="text-xs sm:text-sm font-medium text-[#333333] break-words leading-tight">
              {svc.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
