# API de Ami para tiendas — resumen

Base: `https://api.amiagente.com/v1/storefront` · Encabezado: `Authorization: Bearer $AMI_API_KEY` · JSON.

Errores: `{"error": {"code": "...", "message": "..."}}` — `code` en inglés (para tu `if`), `message` en español (para el cliente).

## Tienda y catálogo

| Método | Ruta | Devuelve |
| --- | --- | --- |
| GET | `/store` | `name`, `currency`, `logo_url`, `color`, `open`, `hours_text`, `accepts_orders_now`, `fulfillment {pickup, delivery, shipping}`, `delivery_terms_text`, `min_order_text`, `pickup_slots`, `shipping`, `modules {booking, hotel, subscriptions, discounts}` |
| GET | `/catalog` | `currency`, `categories[] {id, name, position, parent_id}`, `products[]` (ver abajo). Con `ETag`; `If-None-Match` → `304`. |
| GET | `/products/{id}` | Un producto, por su `id` o por su código (SKU) |
| GET | `/payment-methods` | `methods[] {id, label, settles_in, is_cash, spidi}` — solo para mostrar; el pago es en `payment_url` |
| GET | `/shipping/offices?carrier=` | Agencias de una empresa de envío |

Producto: `id`, `name`, `brand`, `sku`, `description` (Markdown: ahí van la ficha técnica y la garantía), `category`, `category_id`, `kind` (`good`/`service`/`subscription`), `price_text`, `price_from` (escribe «desde»), `compare_at_text` (precio de antes, tachado; `null` si no hay oferta), `sold_out`, `backorder` (muestra «Por encargo» y deja comprarlo), `stock_left` («Quedan 2», o `null`), `variant_id`, `variants[] {variant_id, name, sku, price_text, compare_at_text, sold_out, backorder, stock_left, includes}`, `includes[] {name, variant_name, quantity, product_id}` (lo que trae un combo; `product_id` puede ser `null`), `accessories[]` y `related[]` (ids de productos del mismo catálogo: «Se lleva junto con», «También te puede servir»), `option_groups[] {id, name, min_select, max_select, options[] {id, name, delta_text, sold_out}}`, `image_url` (miniatura), `image_full_url`, `media[] {kind, url, thumb_url, poster_url}`.

Categorías en grupos: `parent_id` es el `id` del grupo (también en `categories`) o `null` en el primer nivel; un grupo puede no tener productos propios.

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
| POST | `/orders` | + `return_url` (en el sitio del negocio; `localhost` con llave de prueba), `metadata` (≤20 claves). Encabezado `Idempotency-Key`. `201` → pedido con `payment_url`. Rechazo: `422` `order_refused` con `error.quote`. |
| GET | `/orders/{reference}` | El pedido. Solo los que creó tu sitio. |
| GET | `/orders?phone=` | Pedidos de tu sitio para un teléfono. |
| GET | `/orders/{reference}/subscriptions` | Suscripciones que compró ese pedido. |

Pedido: `reference`, `status` (`awaiting_payment` → `pending_approval` → `in_progress` → `complete`; o `cancelled`, `returned`, `expired`), `payment_status` (`unpaid`, `sent`, `paid`, `receivable`, `void`), `stage_text`, `lines[]`, `subtotal_text`, `discount_text`, `delivery_text`, `taxes`, `igtf_text`, `total_text`, `fulfillment_text`, `payment_method`, `timeline[]`, `payment_url` (solo en `awaiting_payment`), `payment_expires_at`, `metadata`.

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
