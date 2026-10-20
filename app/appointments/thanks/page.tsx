import type { Metadata } from 'next'
import Link from 'next/link'
import { getAppointment } from '@/lib/ami'
import { lastAppointment } from '@/lib/site'
import { appointmentStatusCopy } from '@/lib/status'
import { AutoRefresh } from '@/components/auto-refresh'
import { CalendarIcon } from '@/components/icons'
import { StatusCard } from '@/components/status-card'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Tu cita' }

// The `return_url` of every appointment: its status comes from Ami, not from
// the fact that the customer came back.
export default async function AppointmentThanksPage() {
  const reference = await lastAppointment()
  const appointment = reference ? await getAppointment(reference) : null

  if (!appointment) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-10 text-center">
        <h1 className="text-3xl font-medium tracking-tight">No encontramos tu cita en este navegador</h1>
        <Link href="/appointments" className="btn-primary">
          Agendar una cita
        </Link>
      </div>
    )
  }

  const moving = appointment.status === 'awaiting_payment' || appointment.status === 'pending_approval'

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-10">
      <AutoRefresh active={moving} />
      <h1 className="text-3xl font-medium tracking-tight">Tu cita</h1>
      <StatusCard copy={appointmentStatusCopy(appointment.status)}>
        <p className="font-medium">{appointment.when_text}</p>
        {appointment.total_text && <p className="text-sm text-muted">Total: {appointment.total_text}</p>}
        <div className="flex flex-wrap gap-3">
          {appointment.status === 'awaiting_payment' && appointment.payment_url && (
            <a href={appointment.payment_url} className="btn-primary">
              Ir a pagar
            </a>
          )}
          {appointment.calendar_url && (
            <a href={appointment.calendar_url} className="btn-secondary">
              <CalendarIcon width={18} height={18} /> Agregar a mi calendario
            </a>
          )}
        </div>
        {moving && <p className="text-xs text-muted">Esta página se actualiza sola.</p>}
      </StatusCard>
      <p className="text-sm text-muted">Referencia: {appointment.reference}</p>
    </div>
  )
}
