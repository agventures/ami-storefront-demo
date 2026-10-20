import Link from 'next/link'
import { getCatalog, getStore } from '@/lib/ami'
import { currencyFor } from '@/lib/currency-server'
import { LOOK, type Story } from '@/lib/look'
import { FULFILLMENT_LABEL, offeredFulfillment } from '@/lib/store-options'
import type { Category, Product } from '@/lib/types'
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

const anchor = (groups: Section[], name: string) => {
  const found = groups.find((g) => g.name.toLowerCase() === name.toLowerCase())
  return found ? `#cat-${found.id}` : '#coleccion'
}

export default async function StorePage() {
  const [store, catalog] = await Promise.all([getStore(), getCatalog()])
  const currency = await currencyFor(store)
  const groups = sections(catalog.categories, catalog.products)
  const fulfillment = offeredFulfillment(store)
  const bookable = (p: Product) => Boolean(store.modules?.booking) && p.kind === 'service'
  // The first products that have a photo: the row under the hero.
  const latest = catalog.products.filter((p) => p.image_url && !p.sold_out).slice(0, 4)

  return (
    <div>
      <section className="relative isolate h-[min(88svh,52rem)] min-h-[32rem] overflow-hidden bg-shade">
        <img
          src={LOOK.hero.image}
          alt={LOOK.hero.alt}
          fetchPriority="high"
          className="absolute inset-0 -z-10 size-full animate-[settle_1.1s_var(--ease-out-quint)_both] object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
        <div className="mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 text-white sm:px-6 sm:pb-16">
          {/* The page's one entrance: the hero's lines rise in turn, once. */}
          <p className="animate-rise text-[11px] font-medium tracking-[0.18em] text-white/80 uppercase [animation-delay:80ms]">
            <span className={`mr-2 inline-block size-1.5 rounded-full align-middle ${store.open ? 'bg-emerald-300' : 'bg-amber-300'}`} />
            {store.hours_text || LOOK.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-2xl animate-rise text-4xl leading-[1.05] font-medium tracking-tight text-balance [animation-delay:140ms] sm:text-6xl">
            {LOOK.hero.title}
          </h1>
          <p className="mt-4 max-w-md animate-rise text-sm text-white/80 [animation-delay:200ms] sm:text-base">{LOOK.hero.body}</p>
          <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:260ms]">
            <a href="#coleccion" className="btn bg-white text-ink hover:bg-white/85">
              {LOOK.hero.cta}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {!store.accepts_orders_now && (
          <div className="pt-6">
            <ClosedBanner store={store} />
          </div>
        )}

        {latest.length > 0 && (
          <section aria-labelledby="nuevo" className="pt-16 sm:pt-24">
            <div className="mb-8 flex items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Recién llegado</p>
                <h2 id="nuevo" className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">
                  Lo nuevo en {store.name}
                </h2>
              </div>
              <a href="#coleccion" className="link-line shrink-0 text-sm">
                Ver todo
              </a>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
              {latest.map((product) => (
                <ProductCard key={product.id} product={product} bookable={bookable(product)} currency={currency} />
              ))}
            </div>
          </section>
        )}

        <section aria-label="Historias" className="grid gap-4 pt-20 sm:grid-cols-2 sm:pt-28">
          {LOOK.stories.map((story) => (
            <StoryCard key={story.title} story={story} href={anchor(groups, story.category)} />
          ))}
        </section>

        <section id="coleccion" aria-labelledby="coleccion-titulo" className="pt-20 sm:pt-28">
          <div className="mb-6">
            <p className="eyebrow">Catálogo</p>
            <h2 id="coleccion-titulo" className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">
              La colección
            </h2>
          </div>

          {groups.length > 1 && (
            <nav
              aria-label="Categorías"
              className="sticky top-16 z-20 -mx-4 mb-10 overflow-x-auto border-b border-line/70 bg-paper/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
            >
              <ul className="flex w-max gap-2">
                {groups.map((g) => (
                  <li key={g.id}>
                    <a
                      href={`#cat-${g.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] whitespace-nowrap transition-colors hover:border-ink"
                    >
                      {g.name}
                      <span className="text-muted tabular-nums">{g.products.length}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {groups.length === 0 ? (
            <p className="card p-8 text-center text-muted">Esta tienda todavía no tiene productos publicados.</p>
          ) : (
            <div className="space-y-16">
              {groups.map((group) => (
                <section key={group.id} id={`cat-${group.id}`} aria-labelledby={`cat-${group.id}-title`} className="scroll-mt-32">
                  <h3 id={`cat-${group.id}-title`} className="mb-5 text-lg font-medium tracking-tight">
                    {group.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                    {group.products.map((product) => (
                      <ProductCard key={product.id} product={product} bookable={bookable(product)} currency={currency} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="taller" className="mt-24 grid overflow-hidden rounded-2xl bg-shade sm:mt-32 md:grid-cols-2">
          <img src={LOOK.workshop.image} alt={LOOK.workshop.alt} className="aspect-[4/3] size-full object-cover md:aspect-auto" />
          <div className="flex flex-col justify-center gap-4 p-8 sm:p-12">
            <p className="eyebrow">{LOOK.workshop.eyebrow}</p>
            <h2 id="taller" className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
              {LOOK.workshop.title}
            </h2>
            <p className="max-w-md text-sm text-ink/75 sm:text-base">{LOOK.workshop.body}</p>
          </div>
        </section>

        <section aria-label="Cómo compras" className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          <Fact title="Entrega">
            {fulfillment.map((f) => FULFILLMENT_LABEL[f]).join(' o ') || 'Consulta con la tienda'}
            {store.delivery_terms_text ? <span className="block text-muted">{store.delivery_terms_text}</span> : null}
          </Fact>
          <Fact title="Pago">
            Pagas en la página segura de Ami, en dólares o en bolívares.
            {store.exchange ? <span className="block text-muted">Tasa del día: {store.exchange.rate_text}.</span> : null}
          </Fact>
          <Fact title="Pedido mínimo">{store.min_order_text || 'Sin pedido mínimo'}</Fact>
        </section>
      </div>
    </div>
  )
}

function StoryCard({ story, href }: { story: Story; href: string }) {
  return (
    <Link href={href} className="group relative isolate block aspect-[4/5] overflow-hidden rounded-2xl bg-shade">
      <img
        src={story.image}
        alt={story.alt}
        loading="lazy"
        className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-500 ease-(--ease-out-soft) group-hover:scale-[1.025]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/50 to-transparent to-50%" />
      <div className="flex h-full flex-col justify-end p-6 text-white sm:p-8">
        <p className="text-[11px] font-medium tracking-[0.18em] text-white/80 uppercase">{story.eyebrow}</p>
        <p className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">{story.title}</p>
        <span className="mt-4 text-sm text-white/90 underline-offset-4 group-hover:underline">Ver más</span>
      </div>
    </Link>
  )
}

function Fact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper p-6 text-sm">
      <p className="eyebrow mb-2">{title}</p>
      <div className="text-ink/85">{children}</div>
    </div>
  )
}
