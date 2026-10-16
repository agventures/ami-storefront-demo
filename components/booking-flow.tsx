'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { bookAppointment, findSlots } from '@/app/actions'
import { appointmentStatusCopy } from '@/lib/status'
import type { Appointment, BookingDay, BookingMenu, BookingService } from '@/lib/types'
import { CalendarIcon } from './icons'
import { Refusals } from './quote-summary'
import { StatusCard } from './status-card'

function newAttemptId() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** The professionals who do a service; the spec allows ids or objects here. */
function professionalsFor(service: BookingService, menu: BookingMenu) {
  const byId = new Map(menu.professionals.map((p) => [p.id, p]))
  return (service.professionals ?? [])
    .map((p) => (typeof p === 'string' ? byId.get(p) : p.name ? { id: p.id, name: p.name } : byId.get(p.id)))
    .filter((p): p is { id: string; name: string } => Boolean(p?.id && p.name))
}

export function BookingFlow({ menu, initialService }: { menu: BookingMenu; initialService: string | null }) {
  const [serviceId, setServiceId] = useState<string | null>(
    menu.services.some((s) => s.product_id === initialService) ? initialService : null,
  )
  const [staffId, setStaffId] = useState<string>('')
  const [days, setDays] = useState<BookingDay[] | null>(null)
  const [dayIndex, setDayIndex] = useState(0)
  const [slot, setSlot] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booked, setBooked] = useState<Appointment | null>(null)
  const attempt = useRef<string | null>(null)

  const service = menu.services.find((s) => s.product_id === serviceId) ?? null
  const professionals = service && menu.rules?.choose_professional ? professionalsFor(service, menu) : []

  useEffect(() => {
    if (!serviceId) return
    let live = true
    setLoadingSlots(true)
    setSlotsError(null)
    setSlot(null)
    findSlots({ productId: serviceId, staffId: staffId || null })
      .then((r) => {
        if (!live) return
        if (r.ok) {
          const open = r.slots.days.filter((d) => d.slots.length > 0)
          setDays(open)
          setDayIndex(0)
        } else {
          setDays(null)
          setSlotsError(r.message)
        }
      })
      .catch(() => live && setSlotsError('No pudimos cargar las horas. Intenta de nuevo.'))
      .finally(() => live && setLoadingSlots(false))
    return () => {
      live = false
    }
  }, [serviceId, staffId, reload])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!serviceId || !slot || submitting) return
    setSubmitting(true)
    setError(null)
    attempt.current ??= newAttemptId()
    try {
      const result = await bookAppointment({
        attemptId: attempt.current,
        productId: serviceId,
        staffId: staffId || null,
        start: slot,
        customer: { name, phone, email },
        note,
      })
      if (result.status === 'pay') {
        window.location.assign(result.paymentUrl)
        return
      }
      if (result.status === 'booked') {
        setBooked(result.appointment)
      } else if (result.status === 'slot_taken') {
        // Someone took that time: ask for fresh hours with a fresh key.
        attempt.current = null
        setError(result.message)
        setReload((n) => n + 1)
      } else {
        if (result.status === 'refused') attempt.current = null
        setError(result.message)
      }
    } catch {
      setError('No pudimos agendar tu cita. Revisa tu conexión e intenta de nuevo.')
    }
    setSubmitting(false)
  }

  if (booked) {
    return (
      <StatusCard copy={appointmentStatusCopy(booked.status)}>
        <p className="font-medium">{booked.when_text}</p>
        {booked.total_text && <p className="text-sm text-muted">Total: {booked.total_text}</p>}
        {booked.calendar_url && (
          <a href={booked.calendar_url} className="btn-secondary">
            <CalendarIcon width={18} height={18} /> Agregar a mi calendario
          </a>
        )}
      </StatusCard>
    )
  }

  const day = days?.[dayIndex]

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card space-y-3 p-5" aria-labelledby="servicio">
        <h2 id="servicio" className="text-lg font-bold">
          1. Elige el servicio
        </h2>
        <fieldset>
          <legend className="sr-only">Servicio</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {menu.services.map((s) => (
              <label
                key={s.product_id}
                className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm has-checked:border-brand has-checked:bg-brand-soft"
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="service"
                    checked={serviceId === s.product_id}
                    onChange={() => {
                      setServiceId(s.product_id)
                      setStaffId('')
                    }}
                    className="mt-0.5 size-4 accent-(--color-brand)"
                  />
                  <span>
                    <span className="block font-semibold">{s.name}</span>
                    {s.duration_text && <span className="block text-muted">{s.duration_text}</span>}
                  </span>
                </span>
                {s.price_text && <span className="shrink-0 font-medium">{s.price_text}</span>}
              </label>
            ))}
          </div>
        </fieldset>

        {professionals.length > 0 && (
          <div>
            <label htmlFor="staff" className="label">
              ¿Con quién?
            </label>
            <select id="staff" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="field">
              <option value="">Con quien esté disponible</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {serviceId && (
        <section className="card space-y-4 p-5" aria-labelledby="hora" aria-busy={loadingSlots}>
          <h2 id="hora" className="text-lg font-bold">
            2. Elige el día y la hora
          </h2>
          {loadingSlots ? (
            <div className="h-24 animate-pulse rounded-xl bg-brand-soft" aria-label="Buscando horas libres" />
          ) : slotsError ? (
            <Refusals refusals={[{ code: 'slots_failed', message: slotsError }]} />
          ) : !days?.length ? (
            <p className="text-sm text-muted">No hay horas libres en los próximos días. Prueba con otro servicio o vuelve más tarde.</p>
          ) : (
            <>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Días">
                {days.map((d, i) => (
                  <button
                    key={d.date}
                    type="button"
                    role="tab"
                    aria-selected={i === dayIndex}
                    onClick={() => {
                      setDayIndex(i)
                      setSlot(null)
                    }}
                    className={`shrink-0 rounded-2xl border px-4 py-2 text-sm font-medium whitespace-nowrap ${i === dayIndex ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'}`}
                  >
                    {d.label || d.date}
                  </button>
                ))}
              </div>
              {day && (
                <fieldset>
                  <legend className="sr-only">Horas del {day.label || day.date}</legend>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {day.slots.map((s) => (
                      <label
                        key={s.start}
                        className="flex cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-2 py-2.5 text-sm font-medium tabular-nums has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:ring-2 has-focus-visible:ring-brand"
                      >
                        <input type="radio" name="slot" value={s.start} checked={slot === s.start} onChange={() => setSlot(s.start)} className="sr-only" />
                        {s.time}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </>
          )}
        </section>
      )}

      {slot && (
        <section className="card space-y-4 p-5" aria-labelledby="tus-datos">
          <h2 id="tus-datos" className="text-lg font-bold">
            3. Tus datos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="b-name" className="label">
                Nombre y apellido
              </label>
              <input id="b-name" required autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="b-phone" className="label">
                Teléfono
              </label>
              <input
                id="b-phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={40}
                placeholder="0414 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field"
              />
            </div>
          </div>
          <div>
            <label htmlFor="b-email" className="label">
              Correo <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input id="b-email" type="email" autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="b-note" className="label">
              Nota <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea id="b-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="field resize-none" />
          </div>

          {error && <Refusals refusals={[{ code: 'booking_failed', message: error }]} />}

          <button type="submit" disabled={submitting || !name.trim() || !phone.trim()} className="btn-primary w-full sm:w-auto">
            {submitting ? 'Agendando…' : 'Agendar cita'}
          </button>
        </section>
      )}

      {!slot && error && <Refusals refusals={[{ code: 'booking_failed', message: error }]} />}
    </form>
  )
}
