import Link from 'next/link'
import type { Store } from '@/lib/types'
import { WeekHours } from './week-hours'

/** What a customer looks for at the bottom of a shop: where it is, when it
 *  opens, how to reach it — all from GET /store, nothing typed here. */
export function SiteFooter({ store }: { store: Store | null }) {
  const name = store?.name ?? 'Tienda de ejemplo'
  const heading = 'eyebrow mb-3'
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase">{name}</p>
          {store?.exchange ? (
            <p className="text-xs text-muted">Tasa del día: {store.exchange.rate_text}.</p>
          ) : null}
        </div>

        {store?.address || store?.contact_phone ? (
          <div>
            <p className={heading}>Contacto</p>
            <ul className="space-y-1.5 text-sm">
              {store.address ? <li className="text-ink/80">{store.address}</li> : null}
              {store.contact_phone ? (
                <li>
                  <a href={`tel:${store.contact_phone.replace(/\s/g, '')}`} className="link-line">
                    {store.contact_phone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {store?.week?.length ? (
          <div>
            <p className={heading}>Horario</p>
            <WeekHours week={store.week} className="max-w-60" />
          </div>
        ) : store?.hours_text ? (
          <div>
            <p className={heading}>Horario</p>
            <p className="text-sm text-ink/80">{store.hours_text}</p>
          </div>
        ) : null}

        <div>
          <p className={heading}>Tu compra</p>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link href="/my-orders" className="link-line">
                Mis pedidos
              </Link>
            </li>
            {store?.modules?.booking && (
              <li>
                <Link href="/appointments" className="link-line">
                  Citas
                </Link>
              </li>
            )}
            <li>
              <Link href="/cart" className="link-line">
                Carrito
              </Link>
            </li>
            {/* The shop's own policies (Ajustes › Políticas), from GET /store. */}
            {store?.policies?.map((policy) => (
              <li key={policy.key}>
                <Link href={`/policies/${encodeURIComponent(policy.key)}`} className="link-line">
                  {policy.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6">
          {name} · Vende con{' '}
          <a href="https://amiagente.com" className="link-line text-ink">
            Ami
          </a>
        </p>
      </div>
    </footer>
  )
}
