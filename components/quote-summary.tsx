import type { Fulfillment, Quote, Refusal } from '@/lib/types'
import { AlertIcon } from './icons'

// Renders Ami's quote exactly as it comes. Every amount below is a string
// Ami wrote; this file never adds, multiplies or formats money.

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? 'text-base font-bold text-ink' : 'text-sm text-muted'}`}>
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

export function QuoteTotals({ quote, fulfillment }: { quote: Quote; fulfillment: Fulfillment }) {
  const delivery = quote.delivery ?? {}
  return (
    <dl className="space-y-2">
      <Row label="Subtotal" value={quote.subtotal_text} />
      {quote.discount_text ? <Row label="Descuento" value={quote.discount_text} /> : null}
      {fulfillment === 'delivery' &&
        (delivery.pending ? (
          <Row label="Delivery" value={delivery.journey_text || 'Se calcula con tu ubicación'} />
        ) : delivery.fee_text ? (
          <Row label="Delivery" value={delivery.fee_text} />
        ) : null)}
      {fulfillment === 'delivery' && !delivery.pending && delivery.journey_text ? (
        <p className="text-right text-xs text-muted">{delivery.journey_text}</p>
      ) : null}
      {quote.taxes?.map((tax, i) =>
        tax.amount_text ? <Row key={`${tax.label}-${i}`} label={tax.label ?? 'Impuesto'} value={tax.amount_text} /> : null,
      )}
      {quote.igtf_text ? <Row label="IGTF" value={quote.igtf_text} /> : null}
      <div className="border-t border-line pt-2">
        <Row label="Total" value={quote.total_text} strong />
        {quote.total_ves?.amount_text ? (
          <p className="text-right text-xs text-muted tabular-nums">{quote.total_ves.amount_text}</p>
        ) : null}
      </div>
      {quote.free_delivery_missing_text ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{quote.free_delivery_missing_text}</p>
      ) : null}
    </dl>
  )
}

/** Ami's reasons, already in Spanish for the customer. */
export function Refusals({ refusals }: { refusals: Refusal[] }) {
  if (!refusals.length) return null
  return (
    <ul role="alert" className="space-y-2">
      {refusals.map((r, i) => (
        <li key={`${r.code}-${i}`} className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertIcon width={18} height={18} className="mt-0.5 shrink-0" />
          {r.message}
        </li>
      ))}
    </ul>
  )
}

/** Global refusals, without the ones a line already shows next to itself. */
export function globalRefusals(quote: Quote, hide: (r: Refusal) => boolean = () => false) {
  const onLines = new Set(quote.lines.map((l) => l.refusal?.message).filter(Boolean))
  return quote.refusals.filter((r) => !onLines.has(r.message) && !hide(r))
}
