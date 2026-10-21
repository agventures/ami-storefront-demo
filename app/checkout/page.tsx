import type { Metadata } from 'next'
import Link from 'next/link'
import { getCatalog, getStore } from '@/lib/ami'
import { signedIn } from '@/lib/customer'
import { currencyFor } from '@/lib/currency-server'
import { productLookup } from '@/lib/catalog-lookup'
import { offeredFulfillment, pickupSlots } from '@/lib/store-options'
import { CheckoutForm } from '@/components/checkout-form'
import { ArrowLeftIcon } from '@/components/icons'
import { ClosedBanner } from '@/components/notices'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Finalizar compra' }

export default async function CheckoutPage() {
  const [store, catalog, account] = await Promise.all([getStore(), getCatalog(), signedIn()])
  const fulfillments = offeredFulfillment(store)
  const currency = await currencyFor(store)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
      <Link href="/cart" className="link-line inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeftIcon width={14} height={14} /> Volver al carrito
      </Link>
      <h1 className="text-3xl font-medium tracking-tight">Finalizar compra</h1>

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
          currency={currency}
          account={account}
        />
      )}
    </div>
  )
}
