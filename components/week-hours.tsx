import type { WeekDay } from '@/lib/types'

/** «Horario»: the week as the store wrote it, today marked. Nothing is
 *  computed — `week` comes from GET /store, already in words. */
export function WeekHours({ week, className = '' }: { week: WeekDay[]; className?: string }) {
  if (!week.length) return null
  return (
    <dl className={`space-y-1 text-sm ${className}`}>
      {week.map((d) => (
        <div key={d.day} className={`flex justify-between gap-4 ${d.today ? 'font-medium text-ink' : 'text-ink/70'}`}>
          <dt>
            {d.day}
            {d.today ? <span className="sr-only"> (hoy)</span> : null}
          </dt>
          <dd className="text-right tabular-nums">{d.hours.length ? d.hours.join(', ') : 'Cerrado'}</dd>
        </div>
      ))}
    </dl>
  )
}
