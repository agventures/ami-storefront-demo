import type { Metadata } from 'next'
import Link from 'next/link'
import { getCatalog, getStore } from '@/lib/ami'
import { productLookup } from '@/lib/catalog-lookup'
import { offeredFulfillment, pickupSlots } from '@/lib/store-options'
import { CheckoutForm } from '@/components/checkout-form'
import { ArrowLeftIcon } from '@/components/icons'
import { ClosedBanner } from '@/components/notices'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Finalizar compra' }

export default async function CheckoutPage() {
  const [store, catalog] = await Promise.all([getStore(), getCatalog()])
  const fulfillments = offeredFulfillment(store)

  return (
    <div className="space-y-5">
      <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeftIcon width={16} height={16} /> Volver al carrito
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Finalizar compra</h1>

      {/* Rule 5: a closed store shows its hours and offers no way to pay. */}
      {!store.accepts_orders_now ? (
        <ClosedBanner store={store} />
      ) : fulfillments.length === 0 ? (
        <p className="card p-6 text-muted">Esta tienda no tiene entregas disponibles en línea por ahora.</p>
      ) : (
        <CheckoutForm
          lookup={productLookup(catalog)}
          fulfillments={fulfillments}
          pickupSlots={pickupSlots(store)}
          deliveryTerms={store.delivery_terms_text}
          discounts={Boolean(store.modules?.discounts)}
        />
      )}
    </div>
  )
}
