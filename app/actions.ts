'use server'

import {
  AmiError,
  createAppointment,
  createOrder,
  getBookingSlots,
  getStore,
  quote as quoteApi,
} from '@/lib/ami'
import { toCartLines } from '@/lib/cart'
import { rememberAppointment, rememberOrder, siteUrl } from '@/lib/site'
import { offeredFulfillment } from '@/lib/store-options'
import type { Appointment, BookingSlots, CartRequest, Fulfillment, Pin, Quote, Refusal } from '@/lib/types'

// Server actions are public endpoints: everything that arrives here is
// re-validated before it reaches Ami, and the key never leaves this side.

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

function toPin(value: unknown): Pin | null {
  if (!value || typeof value !== 'object') return null
  const { latitude, longitude } = value as Record<string, unknown>
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { latitude: lat, longitude: lng }
}

const FULFILLMENTS: Fulfillment[] = ['pickup', 'delivery', 'shipping']

export type CartInput = {
  lines: unknown
  fulfillment: string
  pickupAt?: string
  pin?: unknown
  address?: string
  referencePoint?: string
  code?: string
}

/** The body POST /quote and POST /orders share, with only the fields that apply. */
function cartRequest(input: CartInput): CartRequest {
  const fulfillment = FULFILLMENTS.includes(input.fulfillment as Fulfillment)
    ? (input.fulfillment as Fulfillment)
    : 'pickup'
  const request: CartRequest = { lines: toCartLines(input.lines), fulfillment }
  if (fulfillment === 'pickup') {
    const pickupAt = text(input.pickupAt, 60)
    if (pickupAt) request.pickup_at = pickupAt
  }
  if (fulfillment === 'delivery') {
    const pin = toPin(input.pin)
    if (pin) request.pin = pin
    request.address = text(input.address, 400)
    request.reference_point = text(input.referencePoint, 100)
  }
  const code = text(input.code, 40)
  if (code) request.code = code
  return request
}

/** The message to show for an error, customer-ready. */
function customerMessage(error: unknown) {
  if (error instanceof AmiError) {
    if (error.code === 'missing_api_key' || error.status === 401 || error.status === 403) {
      return 'La tienda no está disponible en este momento.'
    }
    if (error.status === 429) return 'Hay muchas solicitudes ahora mismo. Espera unos segundos e intenta de nuevo.'
    return error.message
  }
  console.error('[actions] unexpected error', error)
  return 'Algo salió mal. Intenta de nuevo.'
}

// ------------------------------------------------------------------ quote

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; message: string }

export async function quoteCart(input: CartInput): Promise<QuoteResult> {
  const request = cartRequest(input)
  if (!request.lines.length) return { ok: false, message: 'Tu carrito está vacío.' }
  try {
    return { ok: true, quote: await quoteApi(request) }
  } catch (error) {
    return { ok: false, message: customerMessage(error) }
  }
}

// ------------------------------------------------------------------ order

export type PlaceOrderInput = CartInput & {
  attemptId: string
  customer: { name?: string; phone?: string; cedula?: string; email?: string }
  note?: string
}

export type PlaceOrderResult =
  | { status: 'created'; reference: string; paymentUrl: string | null }
  // Ami (or this site) said no: show why, and the next attempt gets a new key.
  | { status: 'refused'; message: string; refusals: Refusal[]; quote: Quote | null }
  // Could not reach Ami: retrying with the same key cannot create a second order.
  | { status: 'error'; message: string }

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const attemptId = text(input.attemptId, 200)
  if (!/^[A-Za-z0-9_-]{8,200}$/.test(attemptId)) {
    return { status: 'error', message: 'Recarga la página e intenta de nuevo.' }
  }

  const request = cartRequest(input)
  const customer = {
    name: text(input.customer?.name, 120),
    phone: text(input.customer?.phone, 40),
    cedula: text(input.customer?.cedula, 20),
    email: text(input.customer?.email, 200),
  }
  const refuse = (message: string): PlaceOrderResult => ({ status: 'refused', message, refusals: [], quote: null })

  if (!request.lines.length) return refuse('Tu carrito está vacío.')
  if (!customer.name || !customer.phone || !customer.cedula) {
    return refuse('Escribe tu nombre, tu teléfono y tu cédula para continuar.')
  }

  // The store decides whether it takes orders right now, and how it delivers.
  let store
  try {
    store = await getStore()
  } catch (error) {
    return { status: 'error', message: customerMessage(error) }
  }
  if (!store.accepts_orders_now) {
    return refuse(`La tienda no está recibiendo pedidos ahora. ${store.hours_text}`.trim())
  }
  if (!offeredFulfillment(store).includes(request.fulfillment)) {
    return refuse('Elige una forma de entrega disponible.')
  }
  if (request.fulfillment === 'delivery' && !request.pin) {
    return refuse('Comparte tu ubicación para calcular el delivery.')
  }

  try {
    const order = await createOrder(
      {
        ...request,
        customer,
        note: text(input.note, 300),
        // Ami puts the order's reference where `{reference}` is.
        return_url: `${siteUrl()}/order/{reference}`,
        metadata: { checkout_attempt: attemptId },
      },
      attemptId,
    )
    await rememberOrder(order.reference)
    return { status: 'created', reference: order.reference, paymentUrl: order.payment_url }
  } catch (error) {
    if (error instanceof AmiError && error.code === 'order_refused') {
      const quote = (error.body as { error?: { quote?: Quote } } | null)?.error?.quote ?? null
      return { status: 'refused', message: error.message, refusals: quote?.refusals ?? [], quote }
    }
    if (error instanceof AmiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
      return refuse(customerMessage(error))
    }
    return { status: 'error', message: customerMessage(error) }
  }
}

// ------------------------------------------------------------------ booking

async function bookingEnabled() {
  try {
    return Boolean((await getStore()).modules?.booking)
  } catch {
    return false
  }
}

const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

export type SlotsResult = { ok: true; slots: BookingSlots } | { ok: false; message: string }

export async function findSlots(input: { productId: string; staffId?: string | null; start?: string | null }): Promise<SlotsResult> {
  const productId = text(input.productId, 64)
  if (!productId) return { ok: false, message: 'Elige un servicio.' }
  if (!(await bookingEnabled())) return { ok: false, message: 'Esta tienda no agenda citas en línea.' }
  const staffId = text(input.staffId, 64)
  try {
    const slots = await getBookingSlots(
      [{ product_id: productId, ...(staffId ? { staff_id: staffId } : {}) }],
      isDate(input.start) ? input.start : null,
      14,
    )
    return { ok: true, slots }
  } catch (error) {
    return { ok: false, message: customerMessage(error) }
  }
}

export type BookResult =
  | { status: 'pay'; reference: string; paymentUrl: string }
  | { status: 'booked'; appointment: Appointment }
  | { status: 'slot_taken'; message: string }
  | { status: 'refused'; message: string }
  | { status: 'error'; message: string }

export async function bookAppointment(input: {
  attemptId: string
  productId: string
  staffId?: string | null
  start: string
  customer: { name?: string; phone?: string; email?: string }
  note?: string
}): Promise<BookResult> {
  const attemptId = text(input.attemptId, 200)
  if (!/^[A-Za-z0-9_-]{8,200}$/.test(attemptId)) {
    return { status: 'error', message: 'Recarga la página e intenta de nuevo.' }
  }
  const productId = text(input.productId, 64)
  const start = text(input.start, 64)
  const customer = {
    name: text(input.customer?.name, 120),
    phone: text(input.customer?.phone, 40),
    email: text(input.customer?.email, 200),
  }
  if (!productId || !start) return { status: 'refused', message: 'Elige un servicio y una hora.' }
  if (!customer.name || !customer.phone) return { status: 'refused', message: 'Escribe tu nombre y tu teléfono.' }
  if (!(await bookingEnabled())) return { status: 'refused', message: 'Esta tienda no agenda citas en línea.' }

  const staffId = text(input.staffId, 64)
  try {
    const appointment = await createAppointment(
      {
        items: [{ product_id: productId, ...(staffId ? { staff_id: staffId } : {}) }],
        start,
        customer,
        note: text(input.note, 500),
        return_url: `${siteUrl()}/appointments/thanks`,
      },
      attemptId,
    )
    await rememberAppointment(appointment.reference)
    if (appointment.status === 'awaiting_payment' && appointment.payment_url) {
      return { status: 'pay', reference: appointment.reference, paymentUrl: appointment.payment_url }
    }
    return { status: 'booked', appointment }
  } catch (error) {
    if (error instanceof AmiError && error.code === 'slot_taken') {
      return { status: 'slot_taken', message: error.message }
    }
    if (error instanceof AmiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
      return { status: 'refused', message: customerMessage(error) }
    }
    return { status: 'error', message: customerMessage(error) }
  }
}
