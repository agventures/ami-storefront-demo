# Webhooks

El dueño agrega tu URL en **Ajustes › Desarrolladores › Webhooks** y te da el secreto (`whsec_…`) → `AMI_WEBHOOK_SECRET`.

Evento: `{id, object: 'event', type, created, livemode, data: {object, previous?}}`. `data.object` tiene la forma de la API (pedido, cita, reserva, suscripción).

Tipos: `order.created`, `order.updated`, `appointment.created`, `appointment.updated`, `stay.created`, `stay.updated`, `subscription.created`, `subscription.updated`, `catalog.changed`, `ping`.

## Verificar (obligatorio)

Encabezado `Ami-Signature: t=<unix>,v1=<hex>`; `v1 = HMAC-SHA256(secret, "<t>.<cuerpo crudo>")`. Rechaza firmas que no coincidan y `t` de hace más de 5 minutos.

```ts
// app/api/ami/webhook/route.ts
import crypto from 'node:crypto'
import { revalidateTag } from 'next/cache'

export async function POST(req: Request) {
  const raw = await req.text()                       // el cuerpo crudo, antes de JSON.parse
  const parts = Object.fromEntries((req.headers.get('ami-signature') ?? '').split(',')
    .map(p => p.split('=') as [string, string]))
  const expected = crypto.createHmac('sha256', process.env.AMI_WEBHOOK_SECRET!)
    .update(`${parts.t}.${raw}`).digest('hex')
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300
  const ok = fresh && parts.v1?.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
  if (!ok) return new Response('invalid signature', { status: 400 })

  const event = JSON.parse(raw)
  if (event.type === 'catalog.changed') revalidateTag('catalog', { expire: 0 })  // Next 16
  return new Response('ok')
}
```

Responde `2xx` en menos de 10 s. Reintentos: 1 min, 5 min, 30 min, 2 h, 6 h, 12 h, 24 h. Puede llegar dos veces: deduplica por `event.id`.
