'use client';

import { useState, useEffect } from 'react';

const SECTIONS = [
  'Assessment', 'Regulations', 'Documents', 'Doc Guide', 'Pitfalls',
  'Checklist', 'Timeline', 'Customs', 'Channels',
  'Module A', 'Risk Matrix', 'Module B',
  'Market Intel', 'Benchmark', 'IP Risk', 'Post-Approval', 'Emergency',
  'Cost', 'Horizon', 'Glossary', 'Next Steps',
]

export default function QuickNav() {
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past the header (first 500px)
      setVisible(window.scrollY > 500)

      // Find which section is in view
      const headings = document.querySelectorAll('h2')
      let current = 0
      headings.forEach((h, i) => {
        const rect = h.getBoundingClientRect()
        if (rect.top < 200) current = i
      })
      setActive(Math.min(current, SECTIONS.length - 1))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  const scrollTo = (idx: number) => {
    const headings = document.querySelectorAll('h2')
    if (headings[idx]) {
      headings[idx].scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5">
      {SECTIONS.map((label, i) => (
        <button
          key={i}
          onClick={() => scrollTo(i)}
          className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
            i === active ? 'bg-gold scale-125 shadow-sm' : 'bg-gray-300 hover:bg-gray-400'
          }`}
          title={label}
          aria-label={label}
        />
      ))}
    </div>
  )
}
