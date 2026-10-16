import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBookingMenu, getStore } from '@/lib/ami'
import { BookingFlow } from '@/components/booking-flow'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Agendar una cita' }

type Props = { searchParams: Promise<{ servicio?: string | string[] }> }

export default async function BookingPage({ searchParams }: Props) {
  const store = await getStore()
  // Without the module the booking routes answer 404: so does this page.
  if (!store.modules?.booking) notFound()

  const [menu, params] = await Promise.all([getBookingMenu(), searchParams])
  const service = Array.isArray(params.servicio) ? params.servicio[0] : params.servicio

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Agendar una cita</h1>
        <p className="mt-1 text-muted">Elige el servicio, el día y la hora que te queden mejor.</p>
      </div>
      {menu.services.length === 0 ? (
        <p className="card p-6 text-muted">Por ahora no hay servicios para agendar en línea.</p>
      ) : (
        <BookingFlow menu={menu} initialService={service ?? null} />
      )}
    </div>
  )
}
