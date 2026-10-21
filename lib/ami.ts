import 'server-only'

import { cache } from 'react'
import type {
  Appointment,
  BookingItem,
  BookingMenu,
  BookingSlots,
  Catalog,
  CartRequest,
  Customer,
  CustomerAccount,
  CustomerSession,
  Order,
  OrderList,
  OrderRequest,
  Policy,
  Product,
  Quote,
  SignIn,
  Store,
} from './types'

// The only module that reads the API key. `server-only` makes the build fail
// if a client component ever imports it.

const API_URL = (process.env.AMI_API_URL || 'https://api.amiagente.com/v1/storefront').replace(/\/+$/, '')

/** An error answered by Ami: `code` is for `if`s, `message` is for the customer. */
export class AmiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body: unknown,
  ) {
    super(message)
    this.name = 'AmiError'
  }
}

/** Customer-facing text for an error that did not come with one. */
const GENERIC_MESSAGE = 'No pudimos comunicarnos con la tienda. Intenta de nuevo en un momento.'

type AmiInit = Omit<RequestInit, 'body'> & {
  body?: unknown
  idempotencyKey?: string
  /** The signed-in customer's token (`ami_cs_…`), sent as Ami-Customer-Token. */
  customerToken?: string | null
}

async function ami<T>(
  path: string,
  { body, idempotencyKey, customerToken, headers, ...init }: AmiInit = {},
): Promise<T> {
  const key = process.env.AMI_API_KEY
  if (!key) {
    throw new AmiError(0, 'missing_api_key', 'AMI_API_KEY is not set in the server environment', null)
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(customerToken ? { 'Ami-Customer-Token': customerToken } : {}),
        ...(headers as Record<string, string> | undefined),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (cause) {
    console.error(`[ami] ${init.method ?? 'GET'} ${path} failed to connect`, cause)
    throw new AmiError(0, 'network_error', GENERIC_MESSAGE, null)
  }

  // Errors are JSON, but a proxy in between may answer with HTML.
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    const error = (json as { error?: { code?: string; message?: string } } | null)?.error
    if (res.status >= 500 || !error) {
      console.error(`[ami] ${init.method ?? 'GET'} ${path} answered ${res.status}`)
    }
    throw new AmiError(res.status, error?.code ?? `http_${res.status}`, error?.message ?? GENERIC_MESSAGE, json)
  }
  return json as T
}

/** Why the store could not be loaded, for the notice the layout shows. */
export function setupProblem(error: unknown): 'missing_key' | 'bad_key' | 'unreachable' {
  if (error instanceof AmiError && error.code === 'missing_api_key') return 'missing_key'
  if (error instanceof AmiError && (error.status === 401 || error.status === 403)) return 'bad_key'
  console.error('[ami] could not load the store', error)
  return 'unreachable'
}

/** True when this AmiError means the thing does not exist (or is not ours). */
export const isNotFound = (error: unknown) => error instanceof AmiError && error.status === 404

// ------------------------------------------------------------------ reads

/** The store right now: never cached, it says whether it takes orders. */
export const getStore = cache(() => ami<Store>('/store', { cache: 'no-store' }))

/** The catalogue, cached and revalidated by the `catalog.changed` webhook. */
export const getCatalog = cache(() => ami<Catalog>('/catalog', { next: { tags: ['catalog'], revalidate: 300 } }))

export const getProduct = cache(async (id: string): Promise<Product | null> => {
  try {
    return await ami<Product>(`/products/${encodeURIComponent(id)}`, {
      next: { tags: ['catalog'], revalidate: 300 },
    })
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
})

// ------------------------------------------------------------------ cart and orders

export const quote = (cart: CartRequest) => ami<Quote>('/quote', { method: 'POST', body: cart, cache: 'no-store' })

export const createOrder = (order: OrderRequest, idempotencyKey: string, customerToken?: string | null) =>
  ami<Order>('/orders', { method: 'POST', body: order, idempotencyKey, customerToken, cache: 'no-store' })

export async function getOrder(reference: string): Promise<Order | null> {
  try {
    return await ami<Order>(`/orders/${encodeURIComponent(reference)}`, { cache: 'no-store' })
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

// Every order this site made for a phone. Never put this behind a form that
// takes any phone number: whoever knows somebody's number would see their
// orders. Use it only once the customer proved the phone is theirs.
export const listOrders = (phone: string) =>
  ami<OrderList>(`/orders?phone=${encodeURIComponent(phone)}&limit=20`, { cache: 'no-store' })

// ---------------------------------------------------------------- policies

/** One of the shop's policies, by the `key` GET /store lists it under. */
export async function getPolicy(key: string): Promise<Policy | null> {
  try {
    return await ami<Policy>(`/policies/${encodeURIComponent(key)}`, { next: { revalidate: 300 } })
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

// ------------------------------------------------------------------ accounts
// «Entrar con Ami». The customer's token is as private as the key: it lives
// in an httpOnly cookie this server set (lib/customer.ts) and only ever
// travels from here to Ami.

export const startSignIn = (redirectUri: string) =>
  ami<SignIn>('/customer/sign-in', { method: 'POST', body: { redirect_uri: redirectUri }, cache: 'no-store' })

export const redeemSignIn = (code: string, verifier: string) =>
  ami<CustomerSession>('/customer/session', { method: 'POST', body: { code, verifier }, cache: 'no-store' })

export const getAccount = (customerToken: string) =>
  ami<CustomerAccount>('/customer', { customerToken, cache: 'no-store' })

export const getAccountOrders = (customerToken: string) =>
  ami<OrderList>('/customer/orders?limit=20', { customerToken, cache: 'no-store' })

/** One of the account's orders at this shop, or null — including for an
 *  order that is somebody else's, or a token Ami no longer takes. */
export async function getAccountOrder(customerToken: string, reference: string): Promise<Order | null> {
  try {
    return await ami<Order>(`/customer/orders/${encodeURIComponent(reference)}`, {
      customerToken,
      cache: 'no-store',
    })
  } catch (error) {
    if (isNotFound(error) || (error instanceof AmiError && error.status === 401)) return null
    throw error
  }
}

export const signOutAccount = (customerToken: string) =>
  ami<{ revoked: boolean }>('/customer/session', { method: 'DELETE', customerToken, cache: 'no-store' })

// ------------------------------------------------------------------ booking

export const getBookingMenu = () => ami<BookingMenu>('/booking', { cache: 'no-store' })

export const getBookingSlots = (items: BookingItem[], start: string | null, days: number) =>
  ami<BookingSlots>('/booking/slots', {
    method: 'POST',
    body: { items, start, days },
    cache: 'no-store',
  })

export const createAppointment = (
  request: {
    items: BookingItem[]
    start: string
    customer: Partial<Customer>
    note: string
    return_url: string
  },
  idempotencyKey: string,
) => ami<Appointment>('/booking/appointments', { method: 'POST', body: request, idempotencyKey, cache: 'no-store' })

export async function getAppointment(reference: string): Promise<Appointment | null> {
  try {
    return await ami<Appointment>(`/booking/appointments/${encodeURIComponent(reference)}`, { cache: 'no-store' })
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}
