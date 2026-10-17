import Link from 'next/link'
import type { Store } from '@/lib/types'
import { CartLink } from './cart-link'

export function SiteHeader({ store }: { store: Store | null }) {
  const name = store?.name ?? 'Tienda de ejemplo'
  return (
    <header className="confetti sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-full pr-2">
          {store?.logo_url ? (
            <img src={store.logo_url} alt="" className="size-10 shrink-0 rounded-full bg-white object-cover ring-1 ring-line" />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
            >
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate text-base font-bold tracking-tight">{name}</span>
        </Link>

        <nav aria-label="Principal" className="ml-auto flex items-center gap-1 text-sm font-medium">
          {store?.modules?.booking && (
            <Link href="/appointments" className="hidden rounded-full px-3 py-2 hover:bg-brand-soft sm:inline-flex">
              Citas
            </Link>
          )}
          <Link href="/my-orders" className="hidden rounded-full px-3 py-2 hover:bg-brand-soft sm:inline-flex">
            Mis pedidos
          </Link>
          <CartLink />
        </nav>
      </div>
    </header>
  )
}
