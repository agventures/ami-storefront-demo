import type { Metadata } from 'next'
import Link from 'next/link'
import { getOrder } from '@/lib/ami'
import { rememberedOrders } from '@/lib/site'
import { orderStatusCopy } from '@/lib/status'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Mis pedidos' }

// The orders placed from this browser, read fresh from Ami. Not a search by
// phone: anybody can type somebody else's number (see the skill's
// references/flujo-de-compra.md, «Mis pedidos»).
export default async function MyOrdersPage() {
  const references = await rememberedOrders()
  const orders = (await Promise.all(references.map(r => getOrder(r).catch(() => null))))
    .filter((o): o is Order => o !== null)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Mis pedidos</h1>
      {orders.length === 0 ? (
        <p className="card p-6 text-center text-muted">
          Todavía no has hecho pedidos desde este navegador.
        </p>
      ) : (
        <ul className="card divide-y divide-line">
          {orders.map((order) => (
            <li key={order.reference}>
              <Link
                href={`/order/${encodeURIComponent(order.reference)}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-brand-soft/50"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">Pedido {order.reference}</span>
                  <span className="block truncate text-sm text-muted">{orderStatusCopy(order).title}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{order.total_text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
