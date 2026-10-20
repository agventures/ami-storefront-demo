'use client'

import Link from 'next/link'
import { type FormEvent, useRef, useState } from 'react'
import { placeOrder } from '@/app/actions'
import { type ProductLookup, lineDetails } from '@/lib/catalog-lookup'
import { FULFILLMENT_LABEL, type PickupSlot } from '@/lib/store-options'
import type { Fulfillment, Pin, Refusal } from '@/lib/types'
import { cartActions, useCart } from './cart-store'
import { CheckIcon, PinIcon, SparkleIcon } from './icons'
import type { Currency } from '@/lib/currency'
import { QuoteTotals, Refusals, globalRefusals } from './quote-summary'
import { useQuote } from './use-quote'

/** One key per checkout attempt. Works on plain http too, unlike randomUUID. */
function newAttemptId() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

type Failure = { message: string; refusals: Refusal[] }

export function CheckoutForm({
  lookup,
  fulfillments,
  pickupSlots,
  deliveryTerms,
  discounts,
  currency,
}: {
  lookup: ProductLookup
  fulfillments: Fulfillment[]
  pickupSlots: PickupSlot[]
  deliveryTerms: string
  discounts: boolean
  currency: Currency
}) {
  const { lines, code, hydrated } = useCart()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cedula, setCedula] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [fulfillment, setFulfillment] = useState<Fulfillment>(fulfillments[0])
  const [pickupAt, setPickupAt] = useState('ahora')
  const [pin, setPin] = useState<Pin | null>(null)
  const [address, setAddress] = useState('')
  const [referencePoint, setReferencePoint] = useState('')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [nonce, setNonce] = useState(0)
  // Kept across retries of the same attempt, so a lost answer can never
  // become a second order; dropped once Ami gives a definite "no".
  const attempt = useRef<string | null>(null)

  const cart = {
    lines,
    fulfillment,
    pickupAt,
    pin,
    address,
    referencePoint,
    code: discounts ? code : '',
  }
  const { quote, error: quoteError, loading, fresh } = useQuote(lines.length ? cart : null, { nonce })

  const needsPin = fulfillment === 'delivery' && !pin
  const needsAddress = fulfillment === 'delivery' && !address.trim()
  const required = Boolean(name.trim() && phone.trim() && cedula.trim())
  // Rule 4: only a fresh quote that Ami says is ok can be paid.
  const canPay = Boolean(fresh && quote?.ok && required && !needsPin && !needsAddress && !submitting)
  // The location prompt below already says what `pin_required` says.
  const refusals = quote && fresh ? globalRefusals(quote, (r) => r.code === 'pin_required' && needsPin) : []

  function locate() {
    if (!('geolocation' in navigator)) {
      setGeoError('Tu navegador no puede compartir la ubicación. Prueba desde otro navegador o elige retiro en la tienda.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ latitude: p.coords.latitude, longitude: p.coords.longitude })
        setLocating(false)
      },
      () => {
        setGeoError('Necesitamos tu ubicación para calcular el delivery. Actívala en tu navegador e intenta de nuevo.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canPay) return
    setSubmitting(true)
    setFailure(null)
    attempt.current ??= newAttemptId()
    try {
      const result = await placeOrder({
        ...cart,
        attemptId: attempt.current,
        customer: { name, phone, cedula, email },
        note,
      })
      if (result.status === 'created') {
        // The order exists: the cart has done its job.
        cartActions.clear()
        window.location.assign(result.paymentUrl ?? `/order/${encodeURIComponent(result.reference)}`)
        return
      }
      if (result.status === 'refused') {
        attempt.current = null
        setFailure({ message: result.message, refusals: result.refusals })
        setNonce((n) => n + 1)
      } else {
        setFailure({ message: result.message, refusals: [] })
      }
    } catch {
      setFailure({ message: 'No pudimos enviar tu pedido. Revisa tu conexión e intenta de nuevo.', refusals: [] })
    }
    setSubmitting(false)
  }

  if (!hydrated) {
    return <div className="card h-64 animate-pulse" aria-busy="true" aria-label="Cargando" />
  }

  if (!lines.length) {
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
        <SparkleIcon width={40} height={40} className="text-brand" />
        <p className="text-lg font-semibold">Tu carrito está vacío</p>
        <Link href="/" className="btn-primary">
          Ver productos
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="space-y-6">
        <section className="card space-y-4 p-5" aria-labelledby="datos">
          <h2 id="datos" className="text-lg font-medium tracking-tight">
            Tus datos
          </h2>
          <div>
            <label htmlFor="name" className="label">
              Nombre y apellido
            </label>
            <input id="name" required autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="label">
                Teléfono
              </label>
              <input
                id="phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={40}
                placeholder="0414 123 4567"
                aria-describedby="phone-hint"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field"
              />
              <p id="phone-hint" className="mt-1 text-xs text-muted">
                Si no es de Venezuela, con el código del país (+57…).
              </p>
            </div>
            <div>
              <label htmlFor="cedula" className="label">
                Cédula o RIF
              </label>
              <input
                id="cedula"
                required
                maxLength={20}
                autoComplete="off"
                placeholder="V-12345678"
                aria-describedby="cedula-hint"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="field"
              />
              <p id="cedula-hint" className="mt-1 text-xs text-muted">
                Para tu factura.
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="email" className="label">
              Correo <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input id="email" type="email" autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </div>
        </section>

        <section className="card space-y-4 p-5" aria-labelledby="entrega">
          <h2 id="entrega" className="text-lg font-medium tracking-tight">
            Entrega
          </h2>
          {fulfillments.length > 1 && (
            <fieldset>
              <legend className="sr-only">Forma de entrega</legend>
              <div className="grid grid-cols-2 gap-2">
                {fulfillments.map((f) => (
                  <label
                    key={f}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line bg-white px-3 py-3 text-sm font-medium has-checked:border-brand has-checked:bg-brand-soft"
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      value={f}
                      checked={fulfillment === f}
                      onChange={() => setFulfillment(f)}
                      className="size-4 accent-(--color-brand)"
                    />
                    {FULFILLMENT_LABEL[f]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {fulfillments.length === 1 && <p className="text-sm font-medium">{FULFILLMENT_LABEL[fulfillment]}</p>}

          {fulfillment === 'pickup' && (
            <div>
              <label htmlFor="pickup-at" className="label">
                ¿Cuándo pasas a buscarlo?
              </label>
              <select id="pickup-at" value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} className="field">
                <option value="ahora">Lo antes posible</option>
                {pickupSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {fulfillment === 'delivery' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <button type="button" onClick={locate} disabled={locating} className="btn-secondary w-full sm:w-auto">
                  <PinIcon width={18} height={18} />
                  {locating ? 'Buscando tu ubicación…' : pin ? 'Actualizar mi ubicación' : 'Usar mi ubicación'}
                </button>
                <p aria-live="polite" className="text-sm">
                  {pin ? (
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <CheckIcon width={16} height={16} /> Ubicación lista para calcular el delivery.
                    </span>
                  ) : geoError ? (
                    <span className="text-red-700">{geoError}</span>
                  ) : (
                    <span className="text-muted">La necesitamos para calcular el costo del delivery.</span>
                  )}
                </p>
              </div>
              <div>
                <label htmlFor="address" className="label">
                  Dirección
                </label>
                <textarea
                  id="address"
                  required
                  rows={2}
                  maxLength={400}
                  autoComplete="street-address"
                  placeholder="Urbanización, calle, casa o edificio, piso y apartamento"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="field resize-none"
                />
              </div>
              <div>
                <label htmlFor="reference-point" className="label">
                  Punto de referencia <span className="font-normal text-muted">(opcional)</span>
                </label>
                <input
                  id="reference-point"
                  maxLength={100}
                  placeholder="Frente a la panadería"
                  value={referencePoint}
                  onChange={(e) => setReferencePoint(e.target.value)}
                  className="field"
                />
              </div>
              {deliveryTerms && <p className="text-xs text-muted">{deliveryTerms}</p>}
            </div>
          )}

          <div>
            <label htmlFor="note" className="label">
              Nota para el pedido <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea id="note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className="field resize-none" />
          </div>
        </section>
      </div>

      <aside className="card space-y-4 p-5 lg:sticky lg:top-20" aria-labelledby="resumen" aria-busy={loading}>
        <h2 id="resumen" className="text-lg font-medium tracking-tight">
          Tu pedido
        </h2>
        <ul className="space-y-2 text-sm">
          {lines.map((line, i) => {
            const quoteLine = quote?.lines[i]
            const details = lineDetails(line, lookup)
            return (
              <li key={`${line.product_id}-${i}`} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-medium">
                    {line.quantity} × {quoteLine?.name || lookup[line.product_id]?.name || 'Producto'}
                  </span>
                  {details && <span className="block text-xs text-muted">{details}</span>}
                  {quoteLine?.refusal && fresh && <span className="block text-xs text-red-700">{quoteLine.refusal.message}</span>}
                </span>
                <span className={`shrink-0 tabular-nums ${loading ? 'opacity-50' : ''}`}>{quoteLine?.line_total_text ?? '…'}</span>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-line pt-4">
          {quote ? (
            <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
              <QuoteTotals quote={quote} fulfillment={fulfillment} currency={currency} />
            </div>
          ) : (
            <div className="h-24 animate-pulse rounded-xl bg-brand-soft" aria-label="Calculando el total" />
          )}
        </div>

        <Refusals refusals={refusals} />
        {quoteError && <Refusals refusals={[{ code: 'quote_failed', message: quoteError }]} />}
        {failure && (
          <div className="space-y-2" role="alert">
            {failure.refusals.length ? <Refusals refusals={failure.refusals} /> : <Refusals refusals={[{ code: 'order_failed', message: failure.message }]} />}
          </div>
        )}

        <button type="submit" disabled={!canPay} className="btn-primary w-full">
          {submitting ? 'Creando tu pedido…' : loading ? 'Calculando…' : fresh && quote?.ok ? `Ir a pagar · ${quote.total_text}` : 'Ir a pagar'}
        </button>
        {!required && <p className="text-center text-xs text-muted">Completa tu nombre, teléfono y cédula.</p>}
        {required && (needsPin || needsAddress) && (
          <p className="text-center text-xs text-muted">Comparte tu ubicación y escribe tu dirección para el delivery.</p>
        )}
        <p className="text-center text-xs text-muted">Pagas en la página segura de Ami y vuelves aquí.</p>
      </aside>
    </form>
  )
}
