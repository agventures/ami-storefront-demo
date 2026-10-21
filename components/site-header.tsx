import Link from 'next/link'
import type { Currency } from '@/lib/currency'
import type { CustomerAccount, Store } from '@/lib/types'
import { CartLink } from './cart-link'
import { CurrencySelect } from './currency-select'

export function SiteHeader({
  store,
  currency,
  customer,
}: {
  store: Store | null
  currency: Currency
  /** «Entrar con Ami»: who is signed in, or null. */
  customer: CustomerAccount | null
}) {
  const name = store?.name ?? 'Tienda de ejemplo'
  const link = 'link-line hidden py-1 sm:inline'
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {store?.logo_url ? (
            <img src={store.logo_url} alt="" className="hidden size-8 shrink-0 rounded-full object-cover ring-1 ring-line sm:block" />
          ) : null}
          <span className="truncate text-[13px] font-semibold tracking-[0.12em] uppercase sm:text-sm sm:tracking-[0.2em]">{name}</span>
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-5 text-[13px] text-ink/80">
          <Link href="/#coleccion" className={link}>
            Tienda
          </Link>
          {store?.modules?.booking && (
            <Link href="/appointments" className={link}>
              Citas
            </Link>
          )}
          <Link href="/my-orders" className={link}>
            Mis pedidos
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {store?.exchange ? <CurrencySelect currency={currency} exchange={store.exchange} /> : null}
          {customer ? (
            <Link href="/my-orders" className="link-line max-w-32 truncate px-2 py-1 text-[13px] text-ink/80">
              {customer.name.split(' ')[0] || 'Mi cuenta'}
            </Link>
          ) : (
            // A plain link: the route sends the browser to Ami's sign-in page.
            <a href="/auth/ami" className="link-line px-2 py-1 text-[13px] text-ink/80">
              Entrar
            </a>
          )}
          <CartLink />
        </div>
      </div>
    </header>
  )
}
