import type { ReactNode } from 'react'
import type { StatusCopy } from '@/lib/status'
import { AlertIcon, CheckIcon, ClockIcon, SparkleIcon } from './icons'

const TONES = {
  waiting: { ring: 'ring-amber-200', bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-700', Icon: ClockIcon },
  good: { ring: 'ring-emerald-200', bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700', Icon: CheckIcon },
  done: { ring: 'ring-sky-200', bg: 'bg-sky-50', icon: 'bg-sky-100 text-sky-700', Icon: SparkleIcon },
  bad: { ring: 'ring-red-200', bg: 'bg-red-50', icon: 'bg-red-100 text-red-700', Icon: AlertIcon },
} as const

export function StatusCard({ copy, children }: { copy: StatusCopy; children?: ReactNode }) {
  const tone = TONES[copy.tone]
  return (
    <section aria-live="polite" className={`rounded-3xl p-5 ring-1 sm:p-6 ${tone.bg} ${tone.ring}`}>
      <div className="flex items-start gap-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone.icon}`}>
          <tone.Icon width={22} height={22} />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <h2 className="text-lg leading-snug font-bold">{copy.title}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}
