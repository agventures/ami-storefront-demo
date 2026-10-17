import Link from 'next/link'
import type { Product } from '@/lib/types'
import { BalloonIcon } from './icons'

/** «desde» is written only when Ami says the price varies. */
export function PriceText({ product, className }: { product: Pick<Product, 'price_text' | 'price_from'>; className?: string }) {
  if (!product.price_text) return null
  return (
    <span className={className}>
      {product.price_from ? <span className="font-normal text-muted">desde </span> : null}
      {product.price_text}
    </span>
  )
}

export function ProductCard({ product, bookable }: { product: Product; bookable: boolean }) {
  // Images are plain <img>: their host belongs to the store and is not known
  // at build time, which next/image's remotePatterns would need.
  const image = product.image_url ?? product.media.find((m) => m.kind === 'image')?.thumb_url ?? null
  return (
    <Link
      href={`/product/${encodeURIComponent(product.id)}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-brand-soft">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className={`size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] ${product.sold_out ? 'opacity-60 grayscale' : ''}`}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-brand/40">
            <BalloonIcon width={40} height={40} />
          </div>
        )}
        {product.sold_out ? (
          <span className="absolute top-2 left-2 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-semibold text-white">Agotado</span>
        ) : bookable ? (
          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink">Con cita</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold sm:text-base">{product.name}</h3>
        <PriceText product={product} className="mt-auto text-sm font-bold text-brand-ink sm:text-base" />
      </div>
    </Link>
  )
}
