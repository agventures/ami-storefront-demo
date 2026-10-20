import Link from 'next/link'
import { type Currency, compareAtIn, priceIn } from '@/lib/currency'
import type { Product } from '@/lib/types'

/** «desde» is written only when Ami says the price varies, and the price
 *  before an offer only when Ami sends one — struck through, after it. Both
 *  in the currency the customer chose, in the text Ami wrote for it. */
export function PriceText({ product, currency, className }: {
  product: Pick<Product, 'price_text' | 'price_ves_text' | 'price_from' | 'compare_at_text' | 'compare_at_ves_text'>
  currency: Currency
  className?: string
}) {
  const price = priceIn(product, currency)
  if (!price) return null
  const before = compareAtIn(product, currency)
  return (
    <span className={className}>
      {product.price_from ? <span className="text-muted">desde </span> : null}
      {price}
      {before ? (
        <s className="ml-2 text-muted">
          <span className="sr-only">antes </span>
          {before}
        </s>
      ) : null}
    </span>
  )
}

/** «Por encargo», «Última unidad», «Quedan 2» — or nothing. Ami decides
 *  when each is true; the site only says it. */
export function stockLabel(item: Pick<Product, 'sold_out' | 'backorder' | 'stock_left'>): string | null {
  if (item.sold_out) return null
  if (item.backorder) return 'Por encargo'
  if (item.stock_left === 1) return 'Última unidad'
  if (item.stock_left) return `Quedan ${item.stock_left}`
  return null
}

/** The sizes a product comes in, as the store named them: «S · M · L». */
function sizesOf(product: Product): string | null {
  const names = product.variants.filter((v) => !v.sold_out).map((v) => v.name.replace(/^Talla\s+/i, ''))
  return names.length > 1 ? names.join(' · ') : null
}

export function ProductCard({ product, bookable, currency }: { product: Product; bookable: boolean; currency: Currency }) {
  // Images are plain <img>: their host belongs to the store and is not known
  // at build time, which next/image's remotePatterns would need.
  const image = product.image_full_url ?? product.image_url ?? product.media.find((m) => m.kind === 'image')?.url ?? null
  const badge = product.sold_out ? 'Agotado' : (stockLabel(product) ?? (bookable ? 'Con cita' : null))
  const sizes = sizesOf(product)
  return (
    <Link href={`/product/${encodeURIComponent(product.id)}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-shade">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className={`size-full object-cover transition-transform duration-[400ms] ease-(--ease-out-soft) group-hover:scale-[1.03] ${product.sold_out ? 'opacity-50 grayscale' : ''}`}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted">Sin foto</div>
        )}
        {badge ? (
          <span className="absolute top-3 left-3 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
            {badge}
          </span>
        ) : null}
        {sizes ? (
          <span className="absolute inset-x-3 bottom-3 translate-y-2 rounded-full bg-paper/90 px-3 py-1.5 text-center text-[11px] text-ink/80 opacity-0 backdrop-blur transition-[opacity,transform] duration-200 ease-(--ease-out-soft) group-hover:translate-y-0 group-hover:opacity-100">
            {sizes}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{product.name}</h3>
          <p className="truncate text-xs text-muted">{product.brand || product.category}</p>
        </div>
        <PriceText product={product} currency={currency} className="shrink-0 text-right tabular-nums" />
      </div>
    </Link>
  )
}
