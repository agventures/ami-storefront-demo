# El flujo de compra

Ejemplos para Next.js (App Router). La misma idea sirve en cualquier framework con servidor: **toda llamada a Ami sale del servidor**.

## 1. El cliente de la API (solo servidor)

```ts
// lib/ami.ts
import 'server-only'

const BASE = process.env.AMI_API_URL ?? 'https://api.amiagente.com/v1/storefront'

export class AmiError extends Error {
  constructor(public status: number, public code: string, message: string, public body: any) {
    super(message)
  }
}

export async function ami<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const { idempotencyKey, ...rest } = init
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${process.env.AMI_API_KEY}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...rest.headers,
    },
  })
  // A 304 (your If-None-Match still holds) has no body; an error from a
  // proxy may not be JSON. Neither must crash the page.
  const body = res.status === 304 ? null : await res.json().catch(() => null)
  if (!res.ok && res.status !== 304) {
    throw new AmiError(res.status, body?.error?.code ?? 'http_error',
                       body?.error?.message ?? `Ami respondió ${res.status}`, body)
  }
  return body as T
}
```

## 2. Catálogo con caché

```ts
export const getCatalog = () =>
  ami<Catalog>('/catalog', { next: { tags: ['catalog'], revalidate: 300 } })
```

Revalida con `revalidateTag('catalog', { expire: 0 })` cuando llegue el webhook `catalog.changed` (Next.js 16 pide el segundo argumento; `{ expire: 0 }` lo vence ya, para no mostrar algo agotado como disponible). `GET /store` va sin caché (`cache: 'no-store'`): dice si la tienda está abierta ahora.

## 3. El carrito

El carrito vive en el cliente (localStorage o una cookie) como **líneas**, sin precios:

```ts
type CartLine = { product_id: string; variant_id: string | null; options: string[]; note: string; quantity: number }
```

Las líneas no llevan precios. `variant_id` va solo si el producto tiene `variants` (si no, `null`); `options` son los `id` de las opciones elegidas. Los productos `kind: 'service'` se piden igual que los demás; los que se **agendan** van por Citas (`modulos.md`).

Para mostrar totales, una server action (o route handler) cotiza:

```ts
'use server'
export async function quote(lines: CartLine[], delivery: DeliveryChoice) {
  return ami<Quote>('/quote', { method: 'POST', body: JSON.stringify({ lines, ...delivery }) })
}
```

**Con qué entrega cotizar antes del checkout**: con `pickup` si la tienda lo ofrece; si solo ofrece `delivery`, cotiza `delivery` sin `pin` — la cotización no lo rechaza, solo deja el envío pendiente (`delivery.pending: true`). `pin_required` solo aparece al crear el pedido.

Llámala cuando cambie el carrito (con un pequeño debounce) y pinta exactamente lo que devuelve: `lines[i].line_total_text`, `subtotal_text`, `discount_text`, `delivery.fee_text`, `taxes`, `igtf_text`, `total_text`. Las líneas vienen en el mismo orden que mandaste. Muestra cada `refusal.message`.

## 4. El checkout

Un formulario con nombre, teléfono y cédula (obligatorios), correo (opcional), forma de entrega (solo las de `store.fulfillment`) y, para delivery, la ubicación (obligatoria) y la dirección con un punto de referencia (opcionales, pero el repartidor las agradece):

```ts
// In the browser: the location for a delivery
navigator.geolocation.getCurrentPosition(
  p => setPin({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
  () => setError('Necesitamos tu ubicación para calcular el delivery'),
)
```

La server action crea el pedido y redirige a la página de pago:

```ts
'use server'
import { redirect } from 'next/navigation'

export async function placeOrder(input: CheckoutInput) {
  const order = await ami<Order>('/orders', {
    method: 'POST',
    idempotencyKey: input.attemptId,          // one per checkout attempt
    body: JSON.stringify({
      lines: input.lines,
      fulfillment: input.fulfillment,
      pickup_at: input.pickupAt,
      pin: input.pin,
      address: input.address,
      customer: { name: input.name, phone: input.phone, cedula: input.cedula, email: input.email },
      note: input.note,
      // Ami replaces `{reference}` with the order's reference.
      return_url: `${process.env.SITE_URL}/pedido/{reference}`,
    }),
  })
  redirect(order.payment_url ?? `/pedido/${order.reference}`)
}
```

Un `AmiError` con `code === 'order_refused'` trae `body.error.quote.refusals`: muéstralos y no redirijas.

**Idempotency-Key**: Ami guarda solo las creaciones que salieron bien (`201`). Si repites la misma clave con el mismo cuerpo, recibes el mismo pedido; con otro cuerpo, `409 idempotency_mismatch`. Un rechazo (`422`) no se guarda: después de que el cliente corrija el carrito, usa una clave nueva. Ante un error de red, reintenta con la misma.

## 5. El retorno

`return_url` es una página tuya. Lee el pedido y muestra su estado:

```ts
const order = await ami<Order>(`/orders/${reference}`, { cache: 'no-store' })
```

| `status` / `payment_status` | Qué decir |
| --- | --- |
| `awaiting_payment` | «Todavía no recibimos tu pago» + botón a `order.payment_url` |
| `pending_approval` + `sent` | «Recibimos tu comprobante; el negocio lo está revisando» |
| `pending_approval` + `paid` | «¡Pago recibido! El negocio está por confirmar tu pedido» |
| `pending_approval` + `unpaid` | «Pedido recibido. Pagas en efectivo al recibirlo / retirarlo» |
| `in_progress` | «Estamos preparando tu pedido» |
| `complete` | «Pedido entregado» |
| `receivable` (en `payment_status`) | «El negocio lo dejó por cobrar» — un acuerdo entre ustedes |
| `cancelled` | «Este pedido se canceló.» Si `payment_status` era `paid` o `sent` antes, añade «El negocio te contacta para devolverte el pago» |
| `returned` | «Este pedido se devolvió» |
| `expired` | «Este pedido venció sin pagarse. No se cobró nada.» |

Usa `order.stage_text`, `order.lines`, `order.total_text` y `order.fulfillment_text` para el resumen.

## 6. «Mis pedidos»

`GET /orders?phone=` lista los pedidos de tu sitio para un teléfono. **No lo expongas a cualquiera que escriba un número**: quien conozca el teléfono de otra persona vería sus pedidos. Pide antes que el cliente demuestre que es suyo (tu propio inicio de sesión, o un código que le envías), o muestra solo los pedidos que guardaste en su navegador. Actualiza la página cada pocos segundos mientras esté en `awaiting_payment` o `pending_approval`.
