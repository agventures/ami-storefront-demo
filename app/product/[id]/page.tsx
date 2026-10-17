import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProduct, getStore } from '@/lib/ami'
import { AddToCart } from '@/components/add-to-cart'
import { Description } from '@/components/description'
import { ArrowLeftIcon, CalendarIcon } from '@/components/icons'
import { MediaGallery } from '@/components/media-gallery'
import { ClosedBanner } from '@/components/notices'
import { PriceText } from '@/components/product-card'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).id).catch(() => null)
  return product ? { title: product.name } : {}
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const [store, product] = await Promise.all([getStore(), getProduct(id)])
  if (!product) notFound()

  const bookable = Boolean(store.modules?.booking) && product.kind === 'service'

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
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{product.name}</h1>
            <p className="flex items-center gap-3 text-xl font-bold">
              <PriceText product={product} />
              {product.sold_out && (
                <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">Agotado</span>
              )}
            </p>
          </div>

          <Description markdown={product.description} />

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
    </div>
  )
}
