'use client'

import Link from 'next/link'
import { useState } from 'react'
import { type ProductLookup, lineDetails } from '@/lib/catalog-lookup'
import type { Fulfillment, QuoteLine, Refusal } from '@/lib/types'
import { cartActions, useCart } from './cart-store'
import { BagIcon, TrashIcon } from './icons'
import { QuantityStepper } from './quantity-stepper'
import type { Currency } from '@/lib/currency'
import { QuoteTotals, Refusals, globalRefusals } from './quote-summary'
import { useQuote } from './use-quote'

// Before checkout there is no location yet, so a delivery-only store's quote
// asks for one. That is the next step's job, not a reason to stop here.
const waitsForCheckout = (r: Refusal) => r.code === 'pin_required'

export function CartView({
  lookup,
  fulfillment,
  acceptsOrders,
  discounts,
  minOrderText,
  currency,
}: {
  lookup: ProductLookup
  fulfillment: Fulfillment | null
  acceptsOrders: boolean
  discounts: boolean
  minOrderText: string
  currency: Currency
}) {
  const { lines, code, hydrated } = useCart()
  const { quote, error, loading, fresh } = useQuote(
    lines.length && fulfillment ? { lines, fulfillment, code: discounts ? code : '' } : null,
  )

  if (!hydrated) {
    return <div className="card h-48 animate-pulse" aria-busy="true" aria-label="Cargando tu carrito" />
  }

  if (!lines.length) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
        <BagIcon width={36} height={36} className="text-muted" />
        <p className="text-lg font-semibold">Tu carrito está vacío</p>
        <Link href="/" className="btn-primary">
          Ver productos
        </Link>
      </div>
    )
  }

  const blocking = quote ? globalRefusals(quote, waitsForCheckout) : []
  const lineRefused = quote?.lines.some((l) => l.refusal) ?? false
  const onlyWaitsForCheckout = quote ? quote.refusals.every(waitsForCheckout) : false
  const canContinue = acceptsOrders && fresh && !!quote && !lineRefused && (quote.ok || onlyWaitsForCheckout)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <ul className="card divide-y divide-line" aria-label="Productos en tu carrito">
        {lines.map((line, i) => (
          <CartLineRow
            key={`${line.product_id}-${i}`}
            index={i}
            lookup={lookup}
            quoteLine={quote?.lines[i]}
            stale={loading}
          />
        ))}
      </ul>

      <aside className="card space-y-4 p-5 lg:sticky lg:top-20" aria-label="Resumen" aria-busy={loading}>
        <h2 className="text-lg font-medium tracking-tight">Resumen</h2>

        {discounts && <DiscountCode code={code} />}

        {quote ? (
          <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
            <QuoteTotals quote={quote} fulfillment={fulfillment ?? 'pickup'} currency={currency} />
          </div>
        ) : fulfillment ? (
          <div className="h-24 animate-pulse rounded-xl bg-brand-soft" aria-label="Calculando el total" />
        ) : null}

        {fresh && <Refusals refusals={blocking} />}
        {fresh && quote && !quote.ok && onlyWaitsForCheckout && (
          <p className="text-xs text-muted">El costo del delivery se calcula con tu ubicación en el siguiente paso.</p>
        )}
        {error && <Refusals refusals={[{ code: 'quote_failed', message: error }]} />}
        {!fulfillment && (
          <Refusals refusals={[{ code: 'no_fulfillment', message: 'Esta tienda no tiene entregas disponibles en línea por ahora.' }]} />
        )}
        {minOrderText && <p className="text-xs text-muted">{minOrderText}</p>}

        {acceptsOrders ? (
          canContinue ? (
            <Link href="/checkout" className="btn-primary w-full">
              Continuar
            </Link>
          ) : (
            <button type="button" disabled className="btn-primary w-full">
              {loading ? 'Calculando…' : 'Continuar'}
            </button>
          )
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            La tienda está cerrada ahora. Podrás pedir cuando abra.
          </p>
        )}
      </aside>
    </div>
  )
}

function CartLineRow({
  index,
  lookup,
  quoteLine,
  stale,
}: {
  index: number
  lookup: ProductLookup
  quoteLine: QuoteLine | undefined
  stale: boolean
}) {
  const { lines } = useCart()
  const line = lines[index]
  if (!line) return null
  const product = lookup[line.product_id]
  const name = quoteLine?.name || product?.name || 'Producto'
  const details = lineDetails(line, lookup)

  return (
    <li className="flex gap-3 p-4 sm:gap-4">
      <div className="h-24 w-18 shrink-0 overflow-hidden rounded-lg bg-shade">
        {product?.image ? <img src={product.image} alt="" className="size-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{name}</p>
            {details && <p className="text-sm text-muted">{details}</p>}
            {line.note && <p className="text-sm text-muted italic">«{line.note}»</p>}
          </div>
          <p className={`shrink-0 text-right font-semibold tabular-nums ${stale ? 'opacity-50' : ''}`}>
            {quoteLine?.line_total_text ?? '…'}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            onChange={(q) => cartActions.setQuantity(index, q)}
            label={`Cantidad de ${name}`}
          />
          {quoteLine && line.quantity > 1 && (
            <span className="text-xs text-muted tabular-nums">{quoteLine.unit_price_text} c/u</span>
          )}
          <button
            type="button"
            onClick={() => cartActions.remove(index)}
            aria-label={`Quitar ${name} del carrito`}
            className="ml-auto flex size-9 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-700"
          >
            <TrashIcon width={18} height={18} />
          </button>
        </div>
        {quoteLine?.refusal && !stale && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            {quoteLine.refusal.message}
          </p>
        )}
      </div>
    </li>
  )
}

function DiscountCode({ code }: { code: string }) {
  const [draft, setDraft] = useState(code)
  if (code) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-soft px-3 py-2 text-sm">
        <span>
          Código <strong className="font-semibold">{code}</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            cartActions.setCode('')
            setDraft('')
          }}
          className="font-medium text-brand-ink underline underline-offset-2"
        >
          Quitar
        </button>
      </div>
    )
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        cartActions.setCode(draft)
      }}
      className="flex gap-2"
    >
      <label htmlFor="discount-code" className="sr-only">
        Código de descuento
      </label>
      <input
        id="discount-code"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={40}
        autoComplete="off"
        placeholder="Código de descuento"
        className="field py-2"
      />
      <button type="submit" className="btn-secondary shrink-0" disabled={!draft.trim()}>
        Aplicar
      </button>
    </form>
  )
}
