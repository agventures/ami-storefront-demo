import type { Order } from './types'

// What to tell the customer for each order state, from the table in
// .agents/skills/ami-storefront/references/flujo-de-compra.md.

export type StatusTone = 'waiting' | 'good' | 'done' | 'bad'

export type StatusCopy = { title: string; tone: StatusTone }

export function orderStatusCopy(order: Pick<Order, 'status' | 'payment_status'>): StatusCopy {
  switch (order.status) {
    case 'awaiting_payment':
      return { title: 'Todavía no recibimos tu pago', tone: 'waiting' }
    case 'pending_approval':
      if (order.payment_status === 'sent') {
        return { title: 'Recibimos tu comprobante; el negocio lo está revisando', tone: 'waiting' }
      }
      if (order.payment_status === 'paid') {
        return { title: '¡Pago recibido! El negocio está por confirmar tu pedido', tone: 'good' }
      }
      return { title: 'El negocio está revisando tu pedido', tone: 'waiting' }
    case 'in_progress':
      return { title: 'Estamos preparando tu pedido', tone: 'good' }
    case 'complete':
      return { title: 'Pedido entregado', tone: 'done' }
    case 'cancelled':
      return { title: 'Este pedido se canceló. No se cobró nada.', tone: 'bad' }
    case 'expired':
      return { title: 'Este pedido venció. No se cobró nada.', tone: 'bad' }
    case 'returned':
      return { title: 'Este pedido fue devuelto', tone: 'bad' }
    default:
      return { title: 'Tu pedido', tone: 'waiting' }
  }
}

/** While these hold, the page polls Ami for the next step. */
export const isOrderMoving = (status: string) => status === 'awaiting_payment' || status === 'pending_approval'

export function appointmentStatusCopy(status: string): StatusCopy {
  switch (status) {
    case 'awaiting_payment':
      return { title: 'Tu cita espera el pago para quedar apartada', tone: 'waiting' }
    case 'pending_approval':
      return { title: 'El negocio está por confirmar tu cita', tone: 'waiting' }
    case 'confirmed':
      return { title: '¡Tu cita está confirmada!', tone: 'good' }
    case 'completed':
      return { title: 'Cita realizada. ¡Gracias por venir!', tone: 'done' }
    case 'no_show':
      return { title: 'Esta cita se marcó como no asistida', tone: 'bad' }
    case 'cancelled':
    case 'canceled':
      return { title: 'Esta cita se canceló', tone: 'bad' }
    case 'expired':
      return { title: 'Esta cita venció sin pago', tone: 'bad' }
    default:
      return { title: 'Tu cita', tone: 'waiting' }
  }
}
