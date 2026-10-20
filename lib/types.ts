// Types for the Ami storefront API, written from its OpenAPI document
// (https://api.amiagente.com/v1/storefront/openapi.json) and the skill's
// reference. Fields the OpenAPI document leaves as open objects are typed
// from references/api.md and marked optional, so a missing one never breaks
// a page.
//
// Every `*_text` field is money already written by Ami. This project never
// does arithmetic on money: it shows these strings as they come.

export type Fulfillment = 'pickup' | 'delivery' | 'shipping'

// ---------------------------------------------------------------- store

/** The rate a dollar store crosses to bolívares at: the one every
 *  `price_ves_text` and the quote's `total_ves` were written with. */
export type Exchange = {
  rate: string
  rate_text: string
  source: string
  as_of: string | null
}

/** One day of the week as the store writes it: «Lunes», «10:00 AM – 7:00 PM». */
export type WeekDay = {
  day: string
  today: boolean
  /** Empty on a day it does not open. */
  hours: string[]
}

export type Store = {
  object: 'store'
  livemode: boolean
  name: string
  currency: string
  logo_url: string | null
  color: string | null
  open: boolean
  hours_text: string
  week?: WeekDay[]
  accepts_orders_now: boolean
  fulfillment: Partial<Record<Fulfillment, unknown>> & Record<string, unknown>
  delivery_terms_text: string
  min_order: string
  min_order_text: string
  /** Null for a store that sells in bolívares, or with no rate today. */
  exchange?: Exchange | null
  address?: string | null
  contact_phone?: string | null
  whatsapp?: string | null
  // The spec types the items as `{}`; `pickup_at` takes "one of them".
  pickup_slots: unknown[]
  modules: {
    booking?: boolean
    hotel?: boolean
    subscriptions?: boolean
    discounts?: boolean
    [key: string]: unknown
  }
  shipping?: unknown
}

// ---------------------------------------------------------------- catalog

export type Category = {
  id: string
  name: string
  position: number
  /** The group it sits in, or null on the first level. */
  parent_id?: string | null
}

/** One product a combo hands over. `product_id` links it, or is null when
 *  the store does not sell it on its own. */
export type Part = {
  name: string
  variant_name: string | null
  quantity: string
  product_id: string | null
  variant_id: string | null
}

export type Variant = {
  variant_id: string
  name: string
  sku?: string | null
  price: string
  price_text: string
  /** The same price in bolívares, written by Ami; null with no rate. */
  price_ves_text?: string | null
  /** The price before an offer, to strike through; null when none. */
  compare_at_text?: string | null
  compare_at_ves_text?: string | null
  sold_out: boolean
  /** None now, but it can be ordered: «Por encargo». */
  backorder?: boolean
  /** How many are left, only when few and the store shows it. */
  stock_left?: number | null
  includes?: Part[]
}

export type Option = {
  id: string
  name: string
  price_delta: string
  delta_text: string
  sold_out: boolean
}

export type OptionGroup = {
  id: string
  name: string
  min_select: number
  max_select: number | null
  options: Option[]
}

export type Media = {
  id: string
  kind: 'image' | 'video'
  url: string | null
  thumb_url: string | null
  poster_url: string | null
}

export type ProductKind = 'good' | 'service' | 'subscription'

export type Product = {
  object: 'product'
  id: string
  name: string
  description: string
  category: string
  category_id: string
  kind: ProductKind | (string & {})
  brand?: string | null
  sku?: string | null
  price: string | null
  price_text: string
  price_ves_text?: string | null
  price_from: boolean
  compare_at_text?: string | null
  compare_at_ves_text?: string | null
  sold_out: boolean
  backorder?: boolean
  stock_left?: number | null
  variant_id: string | null
  variants: Variant[]
  /** What a combo hands over («Qué incluye»). */
  includes?: Part[]
  /** Ids in the same catalogue: bought with it, and instead of it. */
  accessories?: string[]
  related?: string[]
  option_groups: OptionGroup[]
  image_url: string | null
  image_full_url: string | null
  media: Media[]
}

export type Catalog = {
  object: 'catalog'
  livemode: boolean
  currency: string
  categories: Category[]
  products: Product[]
}

// ---------------------------------------------------------------- cart

/** One cart line as the API takes it. No prices: Ami prices it. */
export type CartLine = {
  product_id: string
  variant_id: string | null
  options: string[]
  note: string
  quantity: number
}

export type Pin = { latitude: number; longitude: number }

export type Customer = {
  name: string
  phone: string
  cedula: string
  email: string
}

/** The body shared by POST /quote and POST /orders. */
export type CartRequest = {
  lines: CartLine[]
  fulfillment: Fulfillment
  pickup_at?: string
  pin?: Pin | null
  address?: string
  reference_point?: string
  code?: string
  customer?: Partial<Customer>
  note?: string
  payment_method_id?: string | null
}

export type OrderRequest = CartRequest & {
  return_url: string
  metadata?: Record<string, string>
}

// ---------------------------------------------------------------- quote

export type Refusal = { code: string; message: string }

export type QuoteLine = {
  key: string
  name: string
  quantity: number
  unit_price_text: string
  line_total_text: string
  refusal: Refusal | null
}

export type Tax = { label?: string; amount_text?: string; [key: string]: unknown }

export type Quote = {
  object: 'quote'
  livemode: boolean
  ok: boolean
  currency: string
  lines: QuoteLine[]
  subtotal_text: string
  discount_text: string
  delivery: {
    fee_text?: string
    pending?: boolean
    journey_text?: string
    [key: string]: unknown
  }
  free_delivery_missing_text?: string
  taxes: Tax[]
  igtf_text: string
  total: string | null
  total_text: string
  total_ves: { amount_text?: string; [key: string]: unknown } | null
  refusals: Refusal[]
}

// ---------------------------------------------------------------- orders

export type OrderStatus =
  | 'awaiting_payment'
  | 'pending_approval'
  | 'in_progress'
  | 'complete'
  | 'cancelled'
  | 'returned'
  | 'expired'

export type PaymentStatus = 'unpaid' | 'sent' | 'paid' | 'receivable' | 'void'

/** The spec types order lines as open objects; these are the likely fields. */
export type OrderLine = {
  name?: string
  quantity?: number
  line_total_text?: string
  total_text?: string
  [key: string]: unknown
}

export type Order = {
  object: 'order'
  livemode: boolean
  reference: string
  status: OrderStatus
  payment_status: PaymentStatus
  lines: OrderLine[]
  total_text: string
  payment_url: string | null
  metadata: Record<string, unknown>
  // Documented in references/api.md, not in the OpenAPI schema.
  stage_text?: string
  subtotal_text?: string
  discount_text?: string
  delivery_text?: string
  taxes?: Tax[]
  igtf_text?: string
  fulfillment_text?: string
  payment_expires_at?: string | null
  timeline?: unknown[]
}

export type OrderList = { orders: Order[] }

// ---------------------------------------------------------------- errors

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    // Present on 422 order_refused.
    quote?: Quote
    [key: string]: unknown
  }
}

// ---------------------------------------------------------------- booking

export type BookingProfessional = {
  id: string
  name: string
  photo_url?: string | null
  [key: string]: unknown
}

export type BookingService = {
  product_id: string
  name: string
  duration_text?: string
  price_text?: string
  // Ids or objects: the spec leaves it open.
  professionals?: Array<string | { id: string; name?: string }>
  [key: string]: unknown
}

export type BookingMenu = {
  object: 'booking_menu'
  services: BookingService[]
  professionals: BookingProfessional[]
  rules: {
    prepay?: unknown
    confirm?: unknown
    combos?: unknown
    choose_professional?: boolean
    [key: string]: unknown
  }
}

export type BookingItem = { product_id: string; staff_id?: string }

export type BookingSlot = { start: string; time: string }

export type BookingDay = { date: string; label: string; slots: BookingSlot[] }

export type BookingSlots = {
  object: 'booking_slots'
  timezone: string
  days: BookingDay[]
}

export type Appointment = {
  object: 'appointment'
  livemode: boolean
  reference: string
  status: string
  payment_status: string
  starts_at: string
  ends_at: string
  when_text: string
  lines: OrderLine[]
  total_text: string
  payment_url: string | null
  calendar_url?: string | null
  can_cancel?: boolean
  can_move?: boolean
}
