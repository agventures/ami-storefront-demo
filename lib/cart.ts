import type { CartLine } from './types'

// Shared by the browser (the cart in localStorage) and the server actions
// (which never trust what the browser sends). A line holds what the customer
// chose and nothing about money: prices come from POST /quote.

export const MAX_LINES = 40
export const MAX_QUANTITY = 99
const MAX_OPTIONS = 12

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** Coerces anything into a valid API line, or null when it cannot be one. */
export function toCartLine(value: unknown): CartLine | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const productId = text(raw.product_id, 64)
  if (!productId) return null
  const variantId = text(raw.variant_id, 64)
  const options = Array.isArray(raw.options)
    ? raw.options.map((o) => text(o, 64)).filter(Boolean).slice(0, MAX_OPTIONS)
    : []
  const quantity = Math.trunc(Number(raw.quantity))
  if (!Number.isFinite(quantity) || quantity < 1) return null
  return {
    product_id: productId,
    variant_id: variantId || null,
    options,
    note: text(raw.note, 200),
    quantity: Math.min(quantity, MAX_QUANTITY),
  }
}

export function toCartLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return []
  return value
    .map(toCartLine)
    .filter((line): line is CartLine => line !== null)
    .slice(0, MAX_LINES)
}

/** Two lines are the same thing when everything but the quantity matches. */
export function sameChoice(a: CartLine, b: CartLine) {
  return (
    a.product_id === b.product_id &&
    a.variant_id === b.variant_id &&
    a.note === b.note &&
    a.options.length === b.options.length &&
    [...a.options].sort().join('|') === [...b.options].sort().join('|')
  )
}

/** How many units are in the cart, for the header badge (not money). */
export function countUnits(lines: CartLine[]) {
  let units = 0
  for (const line of lines) units += line.quantity
  return units
}
