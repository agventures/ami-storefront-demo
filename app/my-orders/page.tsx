import type { Metadata } from 'next'
import Link from 'next/link'
import { getAccountOrders, getOrder } from '@/lib/ami'
import { customerToken, signedIn } from '@/lib/customer'
import { rememberedOrders } from '@/lib/site'
import { orderStatusCopy } from '@/lib/status'
import type { Order } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Mis pedidos' }

// Signed in with «Entrar con Ami»: the account's orders at this shop, from any
// device (GET /customer/orders). Signed out: the orders placed from this
// browser, read fresh from Ami. Never a search by phone: anybody can type
// somebody else's number (see the skill's references/flujo-de-compra.md).
export default async function MyOrdersPage() {
  const customer = await signedIn()
  const token = customer ? await customerToken() : null
  let orders: Order[]
  if (customer && token) {
    orders = (await getAccountOrders(token).catch(() => ({ orders: [] }))).orders
  } else {
    const references = await rememberedOrders()
    orders = (await Promise.all(references.map(r => getOrder(r).catch(() => null))))
      .filter((o): o is Order => o !== null)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-medium tracking-tight">Mis pedidos</h1>
        {customer ? (
          <form action="/auth/sign-out" method="post" className="text-[13px] text-muted">
            {customer.email} ·{' '}
            <button type="submit" className="link-line text-ink">
              Cerrar sesión
            </button>
          </form>
        ) : null}
      </div>
      {!customer ? (
        <p className="text-sm text-muted">
          <a href="/auth/ami?next=/my-orders" className="link-line text-ink">
            Entra con tu cuenta de Ami
          </a>{' '}
          para ver tus pedidos en cualquier dispositivo y usar tus direcciones guardadas.
        </p>
      ) : null}
      {orders.length === 0 ? (
        <p className="card p-6 text-center text-muted">
          {customer ? 'Todavía no has hecho pedidos en esta tienda.' : 'Todavía no has hecho pedidos desde este navegador.'}
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
