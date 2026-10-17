import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { getStore, setupProblem } from '@/lib/ami'
import { brandColor } from '@/lib/store-options'
import type { Store } from '@/lib/types'
import { SetupNotice, type SetupProblem } from '@/components/notices'
import { SiteHeader } from '@/components/site-header'
import './globals.css'

// Every page reads the store live (open or closed right now), so nothing is
// rendered at build time and the build never needs the API.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const store = await getStore()
    return {
      title: { default: store.name, template: `%s · ${store.name}` },
      description: `Haz tu pedido en ${store.name}.`,
    }
  } catch {
    return { title: 'Tienda de ejemplo' }
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fffaf5',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  let store: Store | null = null
  let problem: SetupProblem | null = null
  try {
    store = await getStore()
  } catch (error) {
    problem = setupProblem(error)
  }

  return (
    <html lang="es-VE">
      <body
        className="min-h-dvh font-sans"
        style={{ '--brand': brandColor(store?.color) } as CSSProperties}
      >
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow"
        >
          Saltar al contenido
        </a>
        <SiteHeader store={store} />
        {store && !store.livemode && (
          <p className="bg-ink px-4 py-1.5 text-center text-xs font-medium text-white">
            Modo de prueba: los pedidos son simulados y no llegan al negocio.
          </p>
        )}
        <main id="contenido" className="mx-auto w-full max-w-6xl px-4 pt-6 pb-24">
          {problem ? <SetupNotice problem={problem} /> : children}
        </main>
        <footer className="border-t border-line py-8 text-center text-xs text-muted">
          <p>
            {store?.name ?? 'Tienda de ejemplo'} · Vende con{' '}
            <a href="https://amiagente.com" className="underline underline-offset-2 hover:text-ink">
              Ami
            </a>
          </p>
          <p className="mt-2 flex justify-center gap-4 sm:hidden">
            {store?.modules?.booking && (
              <Link href="/appointments" className="underline underline-offset-2">
                Citas
              </Link>
            )}
            <Link href="/my-orders" className="underline underline-offset-2">
              Mis pedidos
            </Link>
          </p>
        </footer>
      </body>
    </html>
  )
}
