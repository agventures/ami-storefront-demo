import crypto from 'node:crypto'
import { revalidateTag } from 'next/cache'

// Ami's webhooks. The owner adds this URL in Ajustes › Desarrolladores ›
// Webhooks and hands over the secret (`whsec_…`) → AMI_WEBHOOK_SECRET.
//
// `Ami-Signature: t=<unix>,v1=<hex>`, where
// v1 = HMAC-SHA256(secret, "<t>.<raw body>"). Anything that does not match,
// or is older than five minutes, is rejected.

export const dynamic = 'force-dynamic'

const TOLERANCE_SECONDS = 300

type AmiEvent = {
  id: string
  object: 'event'
  type: string
  created: string
  livemode: boolean
  data: { object: Record<string, unknown>; previous?: Record<string, unknown> }
}

function parseSignature(header: string) {
  const parts: Record<string, string> = {}
  for (const piece of header.split(',')) {
    const at = piece.indexOf('=')
    if (at > 0) parts[piece.slice(0, at).trim()] = piece.slice(at + 1).trim()
  }
  return parts
}

function verify(raw: string, header: string, secret: string) {
  const { t, v1 } = parseSignature(header)
  if (!t || !v1 || !/^\d+$/.test(t)) return false
  if (Math.abs(Date.now() / 1000 - Number(t)) >= TOLERANCE_SECONDS) return false
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')
  return v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
}

// The same event can arrive twice. This in-memory set is enough for one
// process; with several instances, keep the ids in your database instead.
const seen = new Map<string, number>()
function firstTime(id: string) {
  const now = Date.now()
  for (const [key, at] of seen) if (now - at > 24 * 3600_000) seen.delete(key)
  if (seen.has(id)) return false
  seen.set(id, now)
  return true
}

export async function POST(request: Request) {
  const secret = process.env.AMI_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook] AMI_WEBHOOK_SECRET is not set; refusing the event so Ami retries it later')
    return new Response('webhook secret not configured', { status: 500 })
  }

  // The raw body, exactly as it arrived: the signature is over these bytes.
  const raw = await request.text()
  if (!verify(raw, request.headers.get('ami-signature') ?? '', secret)) {
    return new Response('invalid signature', { status: 400 })
  }

  let event: AmiEvent
  try {
    event = JSON.parse(raw) as AmiEvent
  } catch {
    return new Response('invalid body', { status: 400 })
  }
  if (!event.id || !firstTime(event.id)) return new Response('ok')

  const object = event.data?.object ?? {}
  switch (event.type) {
    case 'catalog.changed':
      // Expire now rather than serve stale: a stale catalogue can still
      // offer something that just sold out.
      revalidateTag('catalog', { expire: 0 })
      console.info(`[webhook] ${event.id} catalog.changed: catalogue revalidated`)
      break
    case 'order.created':
    case 'order.updated':
      console.info(
        `[webhook] ${event.id} ${event.type} ${String(object.reference)}: status=${String(object.status)} payment=${String(object.payment_status)}${event.livemode ? '' : ' (test)'}`,
      )
      break
    case 'appointment.created':
    case 'appointment.updated':
      console.info(`[webhook] ${event.id} ${event.type} ${String(object.reference)}: status=${String(object.status)}`)
      break
    case 'ping':
      console.info(`[webhook] ${event.id} ping`)
      break
    default:
      console.info(`[webhook] ${event.id} ${event.type} (not handled by this site)`)
  }

  // Answer within 10 seconds: anything slow belongs in a queue.
  return new Response('ok')
}
