import { getCatalog, getStore } from '@/lib/ami'
import { FULFILLMENT_LABEL, offeredFulfillment } from '@/lib/store-options'
import type { Category, Product } from '@/lib/types'
import { ClockIcon } from '@/components/icons'
import { ClosedBanner } from '@/components/notices'
import { ProductCard } from '@/components/product-card'

export const dynamic = 'force-dynamic'

type Section = { id: string; name: string; products: Product[] }

/** Categories in the store's order; products without a known one go last. */
function sections(categories: Category[], products: Product[]): Section[] {
  const ordered = [...categories].sort((a, b) => a.position - b.position)
  const byId = new Map<string, Section>(ordered.map((c) => [c.id, { id: c.id, name: c.name, products: [] }]))
  const other: Section = { id: 'otros', name: 'Otros', products: [] }
  for (const product of products) (byId.get(product.category_id) ?? other).products.push(product)
  return [...byId.values(), other].filter((s) => s.products.length > 0)
}

export default async function StorePage() {
  const [store, catalog] = await Promise.all([getStore(), getCatalog()])
  const groups = sections(catalog.categories, catalog.products)
  const fulfillment = offeredFulfillment(store)
  const bookable = (p: Product) => Boolean(store.modules?.booking) && p.kind === 'service'

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-brand px-6 py-8 text-white sm:px-10 sm:py-12">
        <div aria-hidden="true" className="confetti absolute inset-0 opacity-60 mix-blend-screen" />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <span className={`size-2 rounded-full ${store.open ? 'bg-emerald-300' : 'bg-amber-300'}`} aria-hidden="true" />
            {store.open ? 'Abierto ahora' : 'Cerrado ahora'}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{store.name}</h1>
          {store.hours_text && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
              <ClockIcon width={16} height={16} />
              {store.hours_text}
            </p>
          )}
          <ul className="mt-5 flex flex-wrap gap-2 text-xs font-medium" aria-label="Formas de entrega">
            {fulfillment.map((f) => (
              <li key={f} className="rounded-full bg-white px-3 py-1.5 text-brand-ink">
                {FULFILLMENT_LABEL[f]}
              </li>
            ))}
            {store.min_order_text && <li className="rounded-full bg-white/15 px-3 py-1.5">{store.min_order_text}</li>}
          </ul>
        </div>
      </section>

      <ClosedBanner store={store} />

      {groups.length > 1 && (
        <nav aria-label="Categorías" className="sticky top-16 z-20 -mx-4 overflow-x-auto bg-paper/90 px-4 py-2 backdrop-blur">
          <ul className="flex w-max gap-2">
            {groups.map((g) => (
              <li key={g.id}>
                <a
                  href={`#cat-${g.id}`}
                  className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-medium whitespace-nowrap hover:border-brand hover:text-brand-ink"
                >
                  {g.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {groups.length === 0 ? (
        <p className="card p-8 text-center text-muted">Esta tienda todavía no tiene productos publicados.</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} id={`cat-${group.id}`} aria-labelledby={`cat-${group.id}-title`}>
            <h2 id={`cat-${group.id}-title`} className="mb-3 text-xl font-bold tracking-tight">
              {group.name}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {group.products.map((product) => (
                <ProductCard key={product.id} product={product} bookable={bookable(product)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
