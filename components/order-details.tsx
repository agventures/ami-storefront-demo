import Link from 'next/link'
import { formatDateTime } from '@/lib/format'
import { isOrderMoving, orderStatusCopy } from '@/lib/status'
import type { Order, OrderLine } from '@/lib/types'
import { AutoRefresh } from './auto-refresh'
import { StatusCard } from './status-card'

// Everything shown here is what GET /orders/{reference} says now: the status,
// the lines and every amount, written by Ami.

function lineTotal(line: OrderLine) {
  return typeof line.line_total_text === 'string' ? line.line_total_text : typeof line.total_text === 'string' ? line.total_text : ''
}

function Row({ label, value, strong }: { label: string; value: string | undefined; strong?: boolean }) {
  if (!value) return null
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? 'text-base font-bold' : 'text-sm text-muted'}`}>
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

export function OrderDetails({ order }: { order: Order }) {
  const copy = orderStatusCopy(order)
  const moving = isOrderMoving(order.status)
  const expires = formatDateTime(order.payment_expires_at)

  return (
    <div className="space-y-5">
      <AutoRefresh active={moving} />

      <StatusCard copy={copy}>
        {order.stage_text && <p className="text-sm text-ink/75">{order.stage_text}</p>}
        {order.status === 'awaiting_payment' && order.payment_url && (
          <div className="flex flex-wrap items-center gap-3">
            <a href={order.payment_url} className="btn-primary">
              Ir a pagar
            </a>
            {expires && <span className="text-xs text-muted">El enlace de pago vence el {expires}.</span>}
          </div>
        )}
        {moving && <p className="text-xs text-muted">Esta página se actualiza sola.</p>}
      </StatusCard>

      <section className="card space-y-4 p-5" aria-labelledby="detalle">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="detalle" className="text-lg font-bold">
            Pedido {order.reference}
          </h2>
          {!order.livemode && <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white">Prueba</span>}
        </div>

        {order.fulfillment_text && <p className="text-sm text-muted">{order.fulfillment_text}</p>}

        {order.lines.length > 0 && (
          <ul className="divide-y divide-line text-sm">
            {order.lines.map((line, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span>
                  {typeof line.quantity === 'number' ? `${line.quantity} × ` : ''}
                  {typeof line.name === 'string' ? line.name : 'Producto'}
                </span>
                <span className="shrink-0 tabular-nums">{lineTotal(line)}</span>
              </li>
            ))}
          </ul>
        )}

        <dl className="space-y-2 border-t border-line pt-3">
          <Row label="Subtotal" value={order.subtotal_text} />
          <Row label="Descuento" value={order.discount_text} />
          <Row label="Delivery" value={order.delivery_text} />
          {order.taxes?.map((tax, i) => (
            <Row key={i} label={tax.label ?? 'Impuesto'} value={tax.amount_text} />
          ))}
          <Row label="IGTF" value={order.igtf_text} />
          <Row label="Total" value={order.total_text} strong />
        </dl>
      </section>

      <Link href="/" className="btn-secondary">
        Seguir comprando
      </Link>
    </div>
  )
}
