import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'
import { AmiError, getAccount } from './ami'
import type { CustomerAccount } from './types'

// «Entrar con Ami»: who is signed in to this site, if anybody. The token Ami
// gives the site (`ami_cs_…`) is kept in an httpOnly cookie and read only
// here, on the server — like the key, it never reaches the browser.

export const CUSTOMER_COOKIE = 'ami_customer'
export const VERIFIER_COOKIE = 'ami_verifier'

export const customerCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  // Ami keeps the session for 90 days from its last use.
  maxAge: 60 * 60 * 24 * 90,
}

export async function customerToken(): Promise<string | null> {
  return (await cookies()).get(CUSTOMER_COOKIE)?.value ?? null
}

/** The signed-in account, or null. A token Ami no longer takes — the customer
 *  signed out on their Ami account, or the session ran out — reads as
 *  signed out; the next sign-in replaces the cookie. */
export const signedIn = cache(async (): Promise<CustomerAccount | null> => {
  const token = await customerToken()
  if (!token) return null
  try {
    return await getAccount(token)
  } catch (error) {
    if (error instanceof AmiError && error.status === 401) return null
    console.error('[customer] could not read the account', error)
    return null
  }
})

/** Where to go after signing in: a path on this site and nowhere else, so
 *  `?next=` cannot send anybody to another site. */
export function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\')
    ? raw
    : '/my-orders'
}
