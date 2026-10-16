import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Store } from '@/lib/types'
import { AlertIcon, ClockIcon } from './icons'

/** Rule 5: when the store does not take orders, say when it does. */
export function ClosedBanner({ store }: { store: Pick<Store, 'accepts_orders_now' | 'hours_text'> }) {
  if (store.accepts_orders_now) return null
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <ClockIcon className="mt-0.5 shrink-0" />
      <p>
        <strong className="font-semibold">Cerrado</strong>
        {store.hours_text ? <> · {store.hours_text}</> : null}
        <span className="block text-amber-800/80">Puedes ver el catálogo y armar tu carrito; los pedidos se reciben en el horario de la tienda.</span>
      </p>
    </div>
  )
}

export function ErrorNotice({ children, title }: { children?: ReactNode; title: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
      <AlertIcon className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 text-red-800">{children}</div> : null}
      </div>
    </div>
  )
}

export type SetupProblem = 'missing_key' | 'bad_key' | 'unreachable'

/**
 * What the visitor sees when the store cannot be loaded. In development it
 * says how to fix it; in production a customer only reads that it is down.
 */
export function SetupNotice({ problem }: { problem: SetupProblem }) {
  const dev = process.env.NODE_ENV !== 'production'
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-xl font-bold">
          {problem === 'unreachable' ? 'No pudimos cargar la tienda' : 'La tienda no está disponible'}
        </h1>
        {problem === 'unreachable' || !dev ? (
          <p className="mt-2 text-muted">Intenta de nuevo en un momento.</p>
        ) : problem === 'missing_key' ? (
          <div className="mt-3 space-y-3 text-sm text-muted">
            <p>
              Falta <code className="rounded bg-brand-soft px-1.5 py-0.5 text-ink">AMI_API_KEY</code>. Copia{' '}
              <code className="rounded bg-brand-soft px-1.5 py-0.5 text-ink">.env.example</code> a{' '}
              <code className="rounded bg-brand-soft px-1.5 py-0.5 text-ink">.env.local</code>, pon la llave de prueba que te dio
              el dueño del negocio (Ajustes › Desarrolladores) y reinicia <code>pnpm dev</code>.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Ami no aceptó la llave de <code className="rounded bg-brand-soft px-1.5 py-0.5 text-ink">AMI_API_KEY</code>. Revisa que
            esté completa y que el dueño no la haya revocado.
          </p>
        )}
        <Link href="/" className="btn-secondary mt-6">
          Reintentar
        </Link>
      </div>
    </div>
  )
}
