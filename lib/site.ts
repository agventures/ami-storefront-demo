import 'server-only'

import { cookies } from 'next/headers'

// The site's own address and the cookies that remember what this browser
// bought. The payment page sends the customer back to `return_url`, where Ami
// has put the order's reference in place of `{reference}`; the cookies are
// for «Mis pedidos», which lists this browser's orders and nobody else's.

export function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

const ORDER_COOKIE = 'ami_last_order'
const ORDERS_COOKIE = 'ami_orders'
const APPOINTMENT_COOKIE = 'ami_last_appointment'
const MAX_REMEMBERED = 20

const cookieOptions = {
  httpOnly: true,
  // `lax` so the cookie comes back on the top-level GET from Ami's payment page.
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

export async function rememberOrder(reference: string) {
  const jar = await cookies()
  jar.set(ORDER_COOKIE, reference, cookieOptions)
  const kept = [reference, ...(await rememberedOrders()).filter(r => r !== reference)]
  jar.set(ORDERS_COOKIE, kept.slice(0, MAX_REMEMBERED).join(','), {
    ...cookieOptions, maxAge: 60 * 60 * 24 * 180,
  })
}

/** The references this browser placed, newest first. */
export async function rememberedOrders(): Promise<string[]> {
  const raw = (await cookies()).get(ORDERS_COOKIE)?.value ?? ''
  return raw.split(',').map(r => r.trim()).filter(r => /^[A-Z0-9]{4,16}$/.test(r))
}

export async function lastOrder() {
  return (await cookies()).get(ORDER_COOKIE)?.value ?? null
}

export async function rememberAppointment(reference: string) {
  ;(await cookies()).set(APPOINTMENT_COOKIE, reference, cookieOptions)
}

export async function lastAppointment() {
  return (await cookies()).get(APPOINTMENT_COOKIE)?.value ?? null
}
