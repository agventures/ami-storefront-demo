import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAccountOrder, getOrder } from '@/lib/ami'
import { customerToken } from '@/lib/customer'
import { rememberedOrders } from '@/lib/site'
import { OrderDetails } from '@/components/order-details'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ reference: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Pedido ${(await params).reference}` }
}

// The `return_url` of every order (`/order/{reference}`), and «Mis pedidos»'
// link. Coming back here proves nothing (rule 6): the page asks Ami. And a
// reference is not a password: the site's key reads every order the site
// made, so the page shows only the ones this browser placed — or, signed in
// with «Entrar con Ami», the account's own (GET /customer/orders/{reference}).
export default async function OrderPage({ params }: Props) {
  const reference = (await params).reference.toUpperCase()
  const token = await customerToken()
  const mine = token ? await getAccountOrder(token, reference) : null
  if (mine) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-10">
        <h1 className="text-3xl font-medium tracking-tight">Tu pedido</h1>
        <OrderDetails order={mine} />
      </div>
    )
  }
  if (!(await rememberedOrders()).includes(reference)) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-10 text-center">
        <h1 className="text-3xl font-medium tracking-tight">Este pedido se hizo desde otro navegador</h1>
        <p className="text-muted">Ábrelo desde el teléfono o la computadora con la que compraste.</p>
        <Link href="/" className="btn-primary">Volver a la tienda</Link>
      </div>
    )
  }
  const order = await getOrder(reference)
  if (!order) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-10">
      <h1 className="text-3xl font-medium tracking-tight">Tu pedido</h1>
      <OrderDetails order={order} />
    </div>
  )
}
