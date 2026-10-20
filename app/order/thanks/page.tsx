import type { Metadata } from 'next'
import Link from 'next/link'
import { getOrder } from '@/lib/ami'
import { lastOrder } from '@/lib/site'
import { OrderDetails } from '@/components/order-details'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Tu pedido' }

// The `return_url` of every order. Coming back here proves nothing (rule 6):
// the page asks Ami for the order the checkout remembered in a cookie.
export default async function ThanksPage() {
  const reference = await lastOrder()
  const order = reference ? await getOrder(reference) : null

  if (!order) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-10 text-center">
        <h1 className="text-3xl font-medium tracking-tight">No encontramos tu pedido en este navegador</h1>
        <p className="text-muted">Si ya pagaste, puedes buscarlo con tu número de teléfono.</p>
        <Link href="/my-orders" className="btn-primary">
          Buscar mis pedidos
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-10">
      <h1 className="text-3xl font-medium tracking-tight">¡Gracias por tu pedido!</h1>
      <OrderDetails order={order} />
    </div>
  )
}
