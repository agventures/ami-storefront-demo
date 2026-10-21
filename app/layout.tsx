import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import type { CSSProperties, ReactNode } from 'react'
import { getStore, setupProblem } from '@/lib/ami'
import { currencyFor } from '@/lib/currency-server'
import { signedIn } from '@/lib/customer'
import { brandColor } from '@/lib/store-options'
import type { Store } from '@/lib/types'
import { SetupNotice, type SetupProblem } from '@/components/notices'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

// Every page reads the store live (open or closed right now), so nothing is
// rendered at build time and the build never needs the API.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const store = await getStore()
    return {
      title: { default: store.name, template: `%s · ${store.name}` },
      description: `Compra en línea en ${store.name}.`,
    }
  } catch {
    return { title: 'Tienda de ejemplo' }
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f5f2',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  let store: Store | null = null
  let problem: SetupProblem | null = null
  try {
    store = await getStore()
  } catch (error) {
    problem = setupProblem(error)
  }
  const currency = await currencyFor(store)
  const customer = store ? await signedIn() : null

  return (
    <html lang="es-VE" className={inter.variable}>
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
        {store && !store.livemode && (
          <p className="bg-ink px-4 py-1.5 text-center text-[11px] tracking-wide text-paper/90">
            Modo de prueba: los pedidos son simulados y no llegan al negocio.
          </p>
        )}
        <SiteHeader store={store} currency={currency} customer={customer} />
        <main id="contenido" className="pb-24">
          {problem ? (
            <div className="mx-auto max-w-3xl px-4 pt-10">
              <SetupNotice problem={problem} />
            </div>
          ) : (
            children
          )}
        </main>
        <SiteFooter store={store} />
      </body>
    </html>
  )
}
