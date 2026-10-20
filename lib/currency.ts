// Which currency the customer reads prices in. Ami writes every price in
// both — `price_text` in the store's dollars and `price_ves_text` in
// bolívares at the store's rate (GET /store → exchange) — so the switch only
// picks a text. Nothing here converts: a store with no rate today sends no
// bolívares, and the site shows dollars.
//
// Kept free of `server-only`: the server pages read the cookie, the client
// forms read the choice the page hands them.

export type Currency = 'USD' | 'VES'

/** The cookie the switch writes and every page reads. */
export const CURRENCY_COOKIE = 'moneda'

export function readCurrency(value: string | null | undefined): Currency {
  return value === 'VES' ? 'VES' : 'USD'
}

type Priced = { price_text?: string | null; price_ves_text?: string | null }
type Compared = { compare_at_text?: string | null; compare_at_ves_text?: string | null }

/** The price in the currency chosen, or in dollars when Ami sent no Bs. */
export function priceIn(item: Priced, currency: Currency): string {
  return (currency === 'VES' && item.price_ves_text) || item.price_text || ''
}

/** The price before an offer, in the same currency as `priceIn` chose. */
export function compareAtIn(item: Priced & Compared, currency: Currency): string | null {
  if (currency === 'VES' && item.price_ves_text) return item.compare_at_ves_text ?? null
  return item.compare_at_text ?? null
}
