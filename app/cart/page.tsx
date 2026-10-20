import type { Metadata } from 'next'
import { getCatalog, getStore } from '@/lib/ami'
import { currencyFor } from '@/lib/currency-server'
import { productLookup } from '@/lib/catalog-lookup'
import { offeredFulfillment } from '@/lib/store-options'
import { CartView } from '@/components/cart-view'
import { ClosedBanner } from '@/components/notices'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Tu carrito' }

export default async function CartPage() {
  const [store, catalog] = await Promise.all([getStore(), getCatalog()])
  // The cart is priced with the first way this store delivers; checkout
  // prices it again with the customer's real choice.
  const [fulfillment = null] = offeredFulfillment(store)
  const currency = await currencyFor(store)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-medium tracking-tight">Tu carrito</h1>
      <ClosedBanner store={store} />
      <CartView
        lookup={productLookup(catalog)}
        fulfillment={fulfillment}
        acceptsOrders={store.accepts_orders_now}
        discounts={Boolean(store.modules?.discounts)}
        minOrderText={store.min_order_text}
        currency={currency}
      />
    </div>
  )
}
