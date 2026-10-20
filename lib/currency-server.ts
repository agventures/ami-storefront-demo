import 'server-only'

import { cookies } from 'next/headers'
import { CURRENCY_COOKIE, type Currency, readCurrency } from './currency'
import type { Store } from './types'

/** The currency this request reads prices in: the customer's choice, while
 *  the store has a rate to write bolívares with. */
export async function currencyFor(store: Pick<Store, 'exchange'> | null): Promise<Currency> {
  if (!store?.exchange) return 'USD'
  return readCurrency((await cookies()).get(CURRENCY_COOKIE)?.value)
}
