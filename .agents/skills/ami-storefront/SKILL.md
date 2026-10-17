---
name: ami-storefront
description: Construye o modifica una tienda en línea propia que vende con Ami a través de la API de tiendas (api.amiagente.com/v1/storefront) — catálogo, carrito, cotización, pedidos con pago en la página de Ami, citas, reservas, suscripciones y webhooks. Úsalo cuando el proyecto use AMI_API_KEY, llame a api.amiagente.com, o te pidan una tienda, un checkout o un catálogo "conectado a Ami".
license: MIT
compatibility: Necesita acceso a api.amiagente.com, una llave de Ami (AMI_API_KEY) y Node.js para scripts/check-key-leak.mjs.
---

# Tienda propia conectada a Ami

Estás construyendo el sitio de un negocio que vende con **Ami**. Ami es el sistema del negocio: tiene su catálogo, su inventario, sus precios, sus impuestos, su agenda y sus cobros. **Tu sitio muestra; Ami decide.** Docs completas: https://docs.amiagente.com (versión para agentes: https://docs.amiagente.com/llms-full.txt).

## Reglas que no se rompen

1. **La llave es del servidor.** `AMI_API_KEY` (`ami_live_…` o `ami_test_…`) solo se lee en código de servidor: route handlers, server actions, server components, o tu backend. Nunca en un componente de cliente, nunca con prefijo `NEXT_PUBLIC_`/`VITE_`/`PUBLIC_`, nunca en el repositorio. En Next.js, el módulo que la usa empieza con `import 'server-only'`. Al terminar, corre `node <ruta-del-skill>/scripts/check-key-leak.mjs` y arregla lo que encuentre.
2. **No calcules dinero.** Nunca sumes precios, multipliques por cantidad, calcules envío, IVA, IGTF, descuentos ni bolívares. Muestra los textos que devuelve Ami: `price_text`, `line_total_text`, `subtotal_text`, `delivery.fee_text`, `taxes[].amount_text`, `total_text`, `total_ves.amount_text`. El total del carrito sale de `POST /quote`, no de tu código.
3. **El pago no es tuyo.** Crea el pedido con `POST /orders` y redirige al cliente a `payment_url`. No pidas datos bancarios, no subas comprobantes, no integres pasarelas. El cliente vuelve a `return_url`.
4. **El carrito se cotiza cada vez que cambia.** Muestra `refusals` (y el `refusal` de cada línea) con su `message`, que ya está en español para el cliente. Si `ok` es `false`, no dejes pagar.
5. **Respeta la tienda.** Si `GET /store` dice `accepts_orders_now: false`, muestra `hours_text` y no ofrezcas pagar. Ofrece solo las entregas de `store.fulfillment`. No dejes agregar productos con `sold_out: true`.
6. **El estado del pedido sale de Ami.** La página de retorno lee `GET /orders/{reference}`; no supongas que se pagó porque el cliente volvió.
7. **Textos para el cliente en español; código en inglés.**

## Cómo trabajar

1. Lee [references/api.md](references/api.md) (endpoints y campos). Si dudas de un campo, consulta https://docs.amiagente.com/docs/referencia o pide `GET https://api.amiagente.com/v1/storefront/openapi.json`.
2. Mira la tienda real con la llave de prueba antes de diseñar: `curl -H "Authorization: Bearer $AMI_API_KEY" https://api.amiagente.com/v1/storefront/store` y `/catalog`. Diseña para lo que el negocio vende (presentaciones, opciones, servicios, módulos).
3. Sigue [references/flujo-de-compra.md](references/flujo-de-compra.md) para el carrito, la cotización, el pedido y el retorno.
4. Si `store.modules` tiene `booking`, `hotel` o `subscriptions` y te piden eso, ver [references/modulos.md](references/modulos.md).
5. Webhooks: [references/webhooks.md](references/webhooks.md).
6. Prueba de punta a punta con la llave de prueba ([references/modo-de-prueba.md](references/modo-de-prueba.md)): crea un pedido, abre `payment_url`, pulsa **Simular pago aprobado**, vuelve a tu sitio y comprueba que muestra el pedido pagado.
7. Corre el chequeo de la llave y el build del proyecto.

## Rechazos que vas a ver (`refusals[].code`)

`closed` (tienda cerrada), `min_order`, `out_of_stock`, `unavailable` (el negocio lo apagó), `variant_required`, `missing_modifier`/`unknown_modifier` (opciones), `not_offered` (esa entrega no), `pin_required` (delivery sin ubicación, solo al crear), `name_required`, `phone_required`, `phone_invalid`, `cedula_required`, `code` (cupón), `empty`. Muestra siempre el `message`, que ya está en español.

## Errores comunes que debes evitar

- Guardar el precio en el carrito y sumarlo → usa `POST /quote`.
- Mandar `variant_id` de un producto sin presentaciones, u olvidarlo en uno que sí las tiene (`variant_required`).
- Crear un delivery sin `pin` (`pin_required`): pide la ubicación con `navigator.geolocation` en el cliente y mándala a tu servidor.
- Olvidar la cédula del cliente: `customer.name`, `customer.phone` y `customer.cedula` son obligatorios para crear el pedido.
- Pedir el catálogo en cada visita sin caché: usa `ETag`/`If-None-Match` o revalida con el webhook `catalog.changed`.
- Reintentar `POST /orders` sin `Idempotency-Key` y crear el pedido dos veces.
- Guardar la referencia del pedido en una cookie para la página de retorno: no hace falta, pon `{reference}` en `return_url` (`https://tusitio.com/order/{reference}`).
- Exponer `GET /orders?phone=` sin verificar al cliente (ver [references/flujo-de-compra.md](references/flujo-de-compra.md) § 6).
