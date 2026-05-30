'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, List } from 'lucide-react';

interface Heading {
  level: number;
  text: string;
  id: string;
}

export default function MobileTOC({ headings, label }: { headings: Heading[]; label: string }) {
  const [open, setOpen] = useState(false);

  if (!headings.length) return null;

  return (
    <div className="lg:hidden mb-8">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 bg-[#F4F6F9] rounded-lg text-sm font-medium text-[#1B365D] hover:bg-[#E8ECF1] transition-colors"
        aria-expanded={open}
        aria-controls="mobile-toc-list"
      >
        <span className="flex items-center gap-2">
          <List className="w-4 h-4" />
          {label}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <nav
          id="mobile-toc-list"
          className="mt-2 bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          aria-label="Table of contents"
        >
          <ul className="space-y-2">
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={() => setOpen(false)}
                  className={`block py-1 transition-colors ${
                    h.level === 3
                      ? 'pl-4 text-sm text-[#5F6F7F] hover:text-[#B8960C]'
                      : 'text-sm font-medium text-[#333333] hover:text-[#B8960C]'
                  }`}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
