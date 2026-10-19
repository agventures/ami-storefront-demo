import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCatalog, getProduct, getStore } from '@/lib/ami'
import type { Part, Product } from '@/lib/types'
import { AddToCart } from '@/components/add-to-cart'
import { Description } from '@/components/description'
import { ArrowLeftIcon, CalendarIcon } from '@/components/icons'
import { MediaGallery } from '@/components/media-gallery'
import { ClosedBanner } from '@/components/notices'
import { PriceText, ProductCard, stockLabel } from '@/components/product-card'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).id).catch(() => null)
  return product ? { title: product.name } : {}
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  // `id` may be the store's own code (SKU): Ami finds the product by either.
  const [store, product, catalog] = await Promise.all([getStore(), getProduct(id), getCatalog()])
  if (!product) notFound()

  const bookable = Boolean(store.modules?.booking) && product.kind === 'service'
  // What the page offers beside it, from the catalogue already cached — the
  // ids Ami sends are always products in it.
  const byId = new Map(catalog.products.map((p) => [p.id, p]))
  const pick = (ids?: string[]) => (ids ?? []).flatMap((i) => byId.get(i) ?? []).slice(0, 4)
  const accessories = pick(product.accessories)
  const related = pick(product.related)
  // A combo sold one way says what it hands over on the product; a sized
  // one on each size, so the first size's list stands for the page.
  const parts = product.includes?.length ? product.includes : (product.variants[0]?.includes ?? [])

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeftIcon width={16} height={16} /> Volver a la tienda
      </Link>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <MediaGallery media={product.media} fallback={product.image_full_url ?? product.image_url} name={product.name} />

        <div className="space-y-6">
          <div className="space-y-2">
            {product.category && <p className="text-xs font-semibold tracking-wide text-brand-ink uppercase">{product.category}</p>}
            {product.brand ? <p className="text-sm text-muted">{product.brand}</p> : null}
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{product.name}</h1>
            <p className="flex items-center gap-3 text-xl font-bold">
              <PriceText product={product} />
              {product.sold_out && (
                <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">Agotado</span>
              )}
              {stockLabel(product) ? (
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-ink">{stockLabel(product)}</span>
              ) : null}
            </p>
          </div>

          <Description markdown={product.description} />

          {parts.length > 0 && <Includes parts={parts} />}

          {bookable ? (
            <Link href={`/appointments?service=${encodeURIComponent(product.id)}`} className="btn-primary w-full sm:w-auto">
              <CalendarIcon width={18} height={18} /> Agendar cita
            </Link>
          ) : (
            <>
              <ClosedBanner store={store} />
              <AddToCart product={product} />
            </>
          )}
        </div>
      </div>

      <Shelf title="Se lleva junto con" products={accessories} store={store} />
      <Shelf title="También te puede servir" products={related} store={store} />
    </div>
  )
}

/** «Qué incluye»: what a combo hands over, each linked when the store sells
 *  it on its own. */
function Includes({ parts }: { parts: Part[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">Qué incluye</h2>
      <ul className="space-y-1 text-sm">
        {parts.map((part) => {
          const name = part.variant_name ? `${part.name} · ${part.variant_name}` : part.name
          return (
            <li key={`${part.product_id ?? part.name}-${part.variant_id ?? ''}`} className="flex gap-2">
              <span className="w-8 text-muted tabular-nums">{part.quantity} ×</span>
              {part.product_id ? (
                <Link href={`/product/${encodeURIComponent(part.product_id)}`} className="font-medium hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="font-medium">{name}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** A row of products the store lists beside this one. */
function Shelf({ title, products, store }: {
  title: string
  products: Product[]
  store: Awaited<ReturnType<typeof getStore>>
}) {
  if (!products.length) return null
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p}
                       bookable={Boolean(store.modules?.booking) && p.kind === 'service'} />
        ))}
      </div>
    </section>
  )
}
