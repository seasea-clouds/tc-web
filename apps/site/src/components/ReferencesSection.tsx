'use client';

import { BlogReference } from '@/lib/blog';

export default function ReferencesSection({
  references,
  heading,
}: {
  references: BlogReference[];
  heading: string;
}) {
  if (!references.length) return null;

  return (
    <section className="mt-16 pt-8 border-t border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{heading}</h2>
      <ol className="space-y-3">
        {references.map((ref, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center">
              {i + 1}
            </span>
            {ref.url ? (
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline break-all"
              >
                {ref.title}
              </a>
            ) : (
              <span>{ref.title}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
