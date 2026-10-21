# API de Ami para tiendas — resumen

Base: `https://api.amiagente.com/v1/storefront` · Encabezado: `Authorization: Bearer $AMI_API_KEY` · JSON.

Errores: `{"error": {"code": "...", "message": "..."}}` — `code` en inglés (para tu `if`), `message` en español (para el cliente). Un `429 rate_limited` trae `Retry-After` (segundos).

## Tienda y catálogo

| Método | Ruta | Devuelve |
| --- | --- | --- |
| GET | `/store` | `name`, `currency`, `logo_url`, `color`, `open`, `hours_text`, `accepts_orders_now`, `fulfillment {pickup, delivery, shipping}`, `delivery_terms_text`, `min_order_text`, `exchange {rate, rate_text, source, as_of}` (la tasa a la que la tienda pasa sus dólares a bolívares; `null` si vende en bolívares o no tiene tasa hoy), `pickup_slots`, `shipping`, `modules {booking, hotel, subscriptions, discounts}`, `policies[] {key, title}` |
| GET | `/policies` · `/policies/{key}` | Las políticas del negocio (devoluciones, privacidad, términos): `{object: 'policy', key, title, body}`. `body` es texto plano con párrafos separados por líneas en blanco. |
| GET | `/catalog` | `currency`, `categories[] {id, name, position, parent_id}`, `products[]` (ver abajo). Con `ETag`; `If-None-Match` → `304`. |
| GET | `/products/{id}` | Un producto, por su `id` o por su código (SKU) |
| GET | `/payment-methods` | `methods[] {id, label, settles_in, is_cash, spidi}` — solo para mostrar; el pago es en `payment_url` |
| GET | `/shipping/offices?carrier=` | Agencias de una empresa de envío |

Producto: `id`, `name`, `brand`, `sku`, `description` (Markdown: ahí van la ficha técnica y la garantía), `category` y `category_id` (la categoría de primer nivel), `subcategory` y `subcategory_id` (su subcategoría, o `null`), `kind` (`good`/`service`/`subscription`), `price_text`, `price_ves_text` (el mismo precio en bolívares a la tasa de `exchange`, o `null`), `price_from` (escribe «desde»), `compare_at_text` (precio de antes, tachado; `null` si no hay oferta), `compare_at_ves_text`, `sold_out`, `backorder` (muestra «Por encargo» y deja comprarlo), `stock_left` («Quedan 2», o `null`), `variant_id`, `variants[] {variant_id, name, sku, price_text, price_ves_text, compare_at_text, compare_at_ves_text, sold_out, backorder, stock_left, includes}`, `includes[] {name, variant_name, quantity, product_id}` (lo que trae un combo; `product_id` puede ser `null`), `accessories[]` y `related[]` (ids de productos del mismo catálogo: «Se lleva junto con», «También te puede servir»), `option_groups[] {id, name, min_select, max_select, options[] {id, name, delta_text, sold_out}}`, `image_url` (miniatura), `image_full_url`, `media[] {kind, url, thumb_url, poster_url}`.

Categorías y subcategorías: dos niveles. En `categories`, `parent_id` es `null` en una categoría y el `id` de su categoría en una subcategoría; vienen en el orden del negocio, cada categoría seguida de sus subcategorías, solo las que tienen productos. Un producto está en una sola. El `id` de una categoría no cambia aunque la renombren: úsalo en tus URLs.

## Carrito y pedidos

Cuerpo del carrito (igual en `/quote` y `/orders`):

```json
{
  "lines": [{ "product_id": "…", "variant_id": "…|null", "options": ["…"], "note": "", "quantity": 1 }],
  "fulfillment": "pickup | delivery | shipping",
  "pickup_at": "ahora | una de store.pickup_slots",
  "pin": { "latitude": 10.49, "longitude": -66.85 },
  "address": "", "reference_point": "",
  "shipping": { "carrier": "zoom", "office": { "id": "…" }, "recipient": { "name": "", "cedula": "", "phone": "" } },
  "code": "CUPON",
  "customer": { "name": "", "phone": "", "cedula": "", "email": "" },
  "note": "",
  "payment_method_id": null
}
```

Campos desconocidos → `422 invalid_request`.

| Método | Ruta | Notas |
| --- | --- | --- |
| POST | `/quote` | `ok`, `lines[] {key, name, quantity, unit_price_text, line_total_text, refusal}`, `subtotal_text`, `discount_text`, `delivery {fee_text, pending, journey_text}`, `free_delivery_missing_text`, `taxes[] {label, amount_text}`, `igtf_text`, `total_text`, `total_ves {amount_text}`, `refusals[] {code, message}`. No guarda nada. |
| POST | `/orders` | + `return_url` (en el sitio del negocio; `localhost` con llave de prueba), `metadata` (≤20 claves). Encabezado `Idempotency-Key`. Con `Ami-Customer-Token` (ver `cuentas.md`): queda en la cuenta del cliente, y acepta `saved_address_id` y `save_address_label`. `201` → pedido con `payment_url`. Rechazo: `422` `order_refused` con `error.quote`. |
| GET | `/orders/{reference}` | El pedido. Solo los que creó tu sitio. |
| GET | `/orders?phone=` | Pedidos de tu sitio para un teléfono. |
| GET | `/orders/{reference}/subscriptions` | Suscripciones que compró ese pedido. |

Pedido: `reference`, `status` (`awaiting_payment` → `pending_approval` → `in_progress` → `complete`; o `cancelled`, `returned`, `expired`), `payment_status` (`unpaid`, `sent`, `paid`, `receivable`, `void`), `stage_text`, `lines[]`, `subtotal_text`, `discount_text`, `delivery_text`, `taxes`, `igtf_text`, `total_text`, `fulfillment_text`, `payment_method`, `timeline[]`, `payment_url` (solo en `awaiting_payment`), `payment_expires_at`, `metadata`.

## Clientes («Entrar con Ami», ver `cuentas.md`)

| Método | Ruta | Notas |
| --- | --- | --- |
| POST | `/customer/sign-in` | `{redirect_uri}` → `{url, verifier}` |
| POST | `/customer/session` | `{code, verifier}` → `{token, customer}` |
| DELETE | `/customer/session` | Cerrar sesión |
| GET · PATCH | `/customer` | La cuenta: `id`, `email`, `name`, `phone`, `document`, `addresses[]` |
| GET · POST · PATCH · DELETE | `/customer/addresses[/{id}]` | Sus direcciones |
| GET | `/customer/orders[/{reference}]` | Sus pedidos en esta tienda |

Todas, menos las dos primeras, con `Ami-Customer-Token: ami_cs_…`.

## Citas (si `store.modules.booking`)

| Método | Ruta | Notas |
| --- | --- | --- |
| POST | `/booking/slots` | `{items: [{product_id, staff_id?}], mode, start: "AAAA-MM-DD", days}` → `days[] {date, label, slots[] {start, time}}` |
| GET | `/booking` | `services[]`, `professionals[]`, `rules {prepay, confirm, combos…}` |
| POST | `/booking/appointments` | `{items, start, customer {name, phone, email}, note, return_url}` → `status` `confirmed`/`pending_approval`/`awaiting_payment` (+`payment_url`) |
| GET | `/booking/appointments/{ref}` | `when_text`, `calendar_url`, `can_cancel`, `can_move` |
| POST | `/booking/appointments/{ref}/cancel` · `/reschedule` | `{reason}` · `{start}` |

## Reservas (si `store.modules.hotel`)

| Método | Ruta | Notas |
| --- | --- | --- |
| POST | `/hotel/search` | `{check_in, check_out, adults, children}` → `types[] {resource_type_id, name, total_text, deposit_text, nights[]}` |
| POST | `/hotel/stays` | `{resource_type_id, check_in, check_out, adults, children, guest {name, phone, email}, return_url}` → `awaiting_payment` + `payment_url` (45 min) |
| GET | `/hotel/stays/{ref}` | La reserva |

## Suscripciones (si `store.modules.subscriptions`)

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `/subscriptions/{ref}` | `status`, `current_period_end`, `owed_text`, `payable`, `plans[]` |
| POST | `/subscriptions/{ref}/payments` | `{return_url}` → `payment_url` para el período que debe (`409 nothing_owed` si no debe) |
| POST | `/subscriptions/{ref}/cancel` · `/keep` · `/plan` | `{reason}` · — · `{variant_id}` |

## Pruebas (solo `ami_test_…`)

`POST /test/{orders|appointments|stays|subscriptions}/{reference}/advance` con `{"to": "…"}` — ver `modo-de-prueba.md`.
