/** 折叠展开区块 */
'use client'
import { useState } from 'react'
interface Props { title: string; children: React.ReactNode; defaultOpen?: boolean }
export default function CollapsibleBox({ title, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details className="mt-2" open={open} onToggle={() => setOpen(!open)}>
      <summary className="text-xs text-gray-500 cursor-pointer hover:text-primary-navy font-semibold select-none">
        {open ? '−' : '+'} {title}
      </summary>
      <div className="mt-2 space-y-1.5">{children}</div>
    </details>
  )
}
