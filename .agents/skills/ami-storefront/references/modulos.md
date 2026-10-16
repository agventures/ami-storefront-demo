# Citas, Reservas y Suscripciones

Solo si `GET /store` → `modules` lo tiene en `true`. Si no, esas rutas responden `404`.

## Citas (`modules.booking`)

1. `GET /booking` → servicios (`product_id`, `name`, `duration_text`, `price_text`, `professionals`: lista de `{staff_id, price, …}`), profesionales (objetos `{id, name, title, photo_url}`) y reglas: `rules.prepay` (`none` | `deposit` | `full`, con `deposit_text`), `rules.confirm` (`auto` | `approval`), `rules.combos` (`one` | `same` | `many`), `rules.choose_professional` (sí/no), `rules.cutoff_hours`.
2. El cliente elige servicio(s) y, si `rules.choose_professional`, profesional.
3. `POST /booking/slots` `{items: [{product_id, staff_id?}], start: 'AAAA-MM-DD', days: 7}` → días con horas (`slots[].start`, `slots[].time`).
4. `POST /booking/appointments` `{items, start: slot.start, customer: {name, phone, email, cedula?}, note, return_url}` con `Idempotency-Key`. Nombre y teléfono son obligatorios; correo y cédula, no.
   - `confirmed`: listo, muestra `when_text` y `calendar_url`.
   - `pending_approval`: el negocio la confirma.
   - `awaiting_payment`: redirige a `payment_url` (abono o total por adelantado).
   - `409 slot_taken`: alguien tomó la hora; vuelve a pedir horas.
5. `GET /booking/appointments/{ref}`; `POST …/cancel {reason}`; `POST …/reschedule {start}` (busca horas con `reschedule_reference`).
6. Estados: `held` (apartada mientras se completa), `awaiting_payment`, `pending_approval`, `confirmed`, `checked_in` (llegó), `completed` (atendida), `cancelled`, `no_show` (no vino). `payment_status`: `not_required`, `unpaid`, `sent`, `paid`, `void`.

## Reservas (`modules.hotel`)

1. `POST /hotel/search` `{check_in, check_out, adults, children}` → `types[]` con `resource_type_id`, `name`, `nights[]`, `total_text`, `deposit_text`.
2. `POST /hotel/stays` `{resource_type_id, check_in, check_out, adults, children, guest: {name, phone, email}, return_url}` → `awaiting_payment` + `payment_url`. La habitación queda apartada 45 minutos.
3. `GET /hotel/stays/{ref}`: `pending_approval` cuando el huésped envió el abono, `confirmed` cuando el hotel lo verificó.

## Suscripciones (`modules.subscriptions`)

- En el catálogo: productos con `kind: 'subscription'`; sus `variants` son los planes. Se compran con un pedido normal.
- Cuando el pedido se paga: `GET /orders/{ref}/subscriptions` (o el webhook `subscription.created`).
- `GET /subscriptions/{ref}` → `status`, `current_period_end`, `owed_text`, `payable`, `plans`.
- Pagar lo que debe: `POST /subscriptions/{ref}/payments {return_url}` → `payment_url`.
- `POST …/cancel {reason}` (al final del período), `POST …/keep`, `POST …/plan {variant_id}`.
