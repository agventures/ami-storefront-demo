import type { Fulfillment, Store } from './types'

// Small readers over GET /store that both the server pages and the client
// forms need, kept free of `server-only` so either side can import them.

export type PickupSlot = { value: string; label: string }

/**
 * The spec types `pickup_slots` items as `{}` and says `pickup_at` takes
 * "one of them". Strings are used as they are; objects are read defensively.
 */
export function pickupSlots(store: Pick<Store, 'pickup_slots'>): PickupSlot[] {
  const slots: PickupSlot[] = []
  for (const slot of store.pickup_slots ?? []) {
    if (typeof slot === 'string' && slot) {
      slots.push({ value: slot, label: slot })
    } else if (slot && typeof slot === 'object') {
      const raw = slot as Record<string, unknown>
      const value = [raw.value, raw.id, raw.start, raw.at].find((v) => typeof v === 'string' && v) as string | undefined
      if (!value) continue
      const label = [raw.label, raw.text, raw.name].find((v) => typeof v === 'string' && v) as string | undefined
      slots.push({ value, label: label ?? value })
    }
  }
  return slots
}

/**
 * The ways this store delivers that this site offers. National shipping
 * (`shipping`) is left out of the demo: it needs a carrier and an agency
 * picker on top of GET /shipping/offices.
 */
export function offeredFulfillment(store: Pick<Store, 'fulfillment'>): Fulfillment[] {
  const offered: Fulfillment[] = []
  if (store.fulfillment?.pickup) offered.push('pickup')
  if (store.fulfillment?.delivery) offered.push('delivery')
  return offered
}

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  pickup: 'Retiro en la tienda',
  delivery: 'Delivery',
  shipping: 'Envío nacional',
}

/** A safe CSS colour from `store.color`, or the demo's own. */
export function brandColor(color: string | null | undefined) {
  return color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#e11d74'
}
