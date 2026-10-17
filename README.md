# Tienda de ejemplo con Ami

Una tienda en línea completa —catálogo, carrito, checkout, pago y seguimiento
del pedido— hecha con Next.js, que vende a través de la
[API de tiendas de Ami](https://docs.amiagente.com). Está pensada para una
tienda de artículos de fiesta, pero muestra lo que tenga la tienda de la llave
que uses: sus productos, presentaciones, opciones, horarios y formas de
entrega.

La idea que la sostiene: **tu sitio muestra; Ami decide.** Los precios, el
inventario, el envío, los impuestos, el IGTF, el descuento y los bolívares los
calcula Ami. El sitio pinta los textos que Ami devuelve y lleva al cliente a la
página de pago de Ami. No guarda precios, no suma nada y no toca datos
bancarios.

## Qué trae

| Ruta | Qué hace |
| --- | --- |
| `/` | La tienda: nombre, logo y horario (`GET /store`, sin caché), aviso de «Cerrado» y el catálogo por categorías (`GET /catalog`, con caché de 5 minutos que el webhook invalida). |
| `/producto/[id]` | El producto: fotos y videos, descripción, presentaciones, opciones con sus mínimos y máximos, cantidad y nota. |
| `/carrito` | El carrito (solo las líneas, en `localStorage`), cotizado con `POST /quote` cada vez que cambia; muestra los totales y los motivos de rechazo tal como los escribe Ami, y el código de descuento si la tienda lo usa. |
| `/checkout` | Datos del cliente (nombre, teléfono y cédula obligatorios), retiro con horario o delivery con «Usar mi ubicación», y `POST /orders` con `Idempotency-Key`. Al crearse el pedido, el cliente va a `payment_url`. |
| `/pedido/[reference]` | La página a la que vuelve el cliente después de pagar (`return_url` es `SITE_URL/pedido/{reference}`): lee el pedido en Ami (`GET /orders/{reference}`) y se actualiza sola mientras espera el pago o la aprobación. Solo muestra pedidos hechos desde este navegador. |
| `/mis-pedidos` | Los pedidos hechos desde este navegador. No busca por teléfono a propósito: cualquiera puede escribir el teléfono de otra persona. |
| `/citas` | Solo si la tienda tiene el módulo de citas: servicio, día y hora, datos y `POST /booking/appointments`. |
| `/api/ami/webhook` | Recibe los webhooks de Ami, verifica la firma `Ami-Signature` e invalida el catálogo con `catalog.changed`. |

Toda llamada a Ami sale del servidor, desde `lib/ami.ts`, el único archivo que
lee `AMI_API_KEY`.

## Requisitos

- Node.js 22 o más reciente.
- pnpm (`corepack enable` lo instala con la versión de `package.json`).
- Una llave de prueba de la tienda.

## Cómo correrla

1. **Pide una llave de prueba al dueño del negocio (Ajustes › Desarrolladores).**
   Empieza con `ami_test_`. Con ella lees la tienda real, pero los pedidos son
   simulados y no llegan al panel del negocio.
2. Instala y configura:

   ```bash
   pnpm install
   cp .env.example .env.local
   ```

3. Abre `.env.local` y pon la llave en `AMI_API_KEY`. Deja `SITE_URL` en
   `http://localhost:3000` mientras pruebas en tu computadora.
4. Arranca:

   ```bash
   pnpm dev
   ```

   y abre http://localhost:3000.

`pnpm check` revisa que la llave no se filtre al navegador y los tipos;
`pnpm build` compila para producción.

## Cómo funciona el pago

1. El checkout crea el pedido con `POST /orders` y una `Idempotency-Key` por
   intento: si la conexión falla y el cliente reintenta, Ami devuelve el mismo
   pedido en lugar de crear otro.
2. Ami responde con `payment_url`, la página de pago de Ami. El cliente paga
   allí con los métodos de la tienda; este sitio nunca ve datos bancarios ni
   comprobantes.
3. Al terminar, el cliente vuelve a `return_url`
   (`SITE_URL/pedido/{reference}`: Ami pone la referencia del pedido en lugar
   de `{reference}`). El checkout además guarda la referencia en una cookie
   `httpOnly`, para «Mis pedidos».
4. La página de retorno **no supone** que se pagó porque el cliente volvió:
   pregunta el estado a Ami y se actualiza cada 5 segundos mientras el pedido
   está en `awaiting_payment` o `pending_approval`.

Con una llave de prueba, la página de pago muestra **Simular pago aprobado**,
**Simular comprobante enviado** y **Simular rechazo del banco**. Para probar
de punta a punta: arma un carrito, completa el checkout, pulsa **Simular pago
aprobado**, vuelve con **Volver a …** y comprueba que la página dice «¡Pago
recibido!». También puedes avanzar el pedido como lo haría el negocio:

```bash
curl -X POST "$AMI_API_URL/test/orders/TXXXXXX/advance" \
  -H "Authorization: Bearer $AMI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "in_progress"}'
```

## Webhooks en tu computadora

Ami necesita una dirección pública para enviarte eventos. Abre un túnel hacia
tu puerto 3000, por ejemplo con
[cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/):

```bash
cloudflared tunnel --url http://localhost:3000
# o: ngrok http 3000
```

Pídele al dueño que agregue `https://<tu-túnel>/api/ami/webhook` en
**Ajustes › Desarrolladores › Webhooks** y pon el secreto que le muestra Ami
(`whsec_…`) en `AMI_WEBHOOK_SECRET`. El sitio verifica la firma de cada
evento, rechaza los de más de 5 minutos, ignora los repetidos e invalida el
catálogo cuando llega `catalog.changed`. Los eventos de pedidos quedan en la
consola de `pnpm dev`.

El túnel también sirve para probar desde el teléfono: el navegador solo
comparte la ubicación (para el delivery) en `https` o en `localhost`.

## Publicarla

- Configura en el servidor las mismas variables de `.env.example`, con la
  llave `ami_live_…` cuando estés listo para vender de verdad. Nunca las
  pongas en el repositorio ni con prefijo `NEXT_PUBLIC_`.
- `SITE_URL` debe ser el dominio que el dueño registró en
  **Ajustes › Desarrolladores › Tu sitio**: Ami solo devuelve al cliente a ese
  dominio después de pagar.
- Cambia la URL del webhook en Ami por la de tu dominio.
- Si corres varias instancias, guarda los `event.id` de los webhooks en tu
  base de datos para no procesar dos veces el mismo evento.

## Construir con un agente

Este proyecto trae el skill de Ami para agentes de programación en
`.agents/skills/ami-storefront` (y en `.claude/skills/ami-storefront` para
Claude Code), con las reglas de la API, el flujo de compra, los webhooks y el
modo de prueba. `AGENTS.md` le dice al agente que lo lea antes de tocar nada
y que termine con:

```bash
node .agents/skills/ami-storefront/scripts/check-key-leak.mjs
pnpm build
```

El skill se publica en
[agventures/ami-skills](https://github.com/agventures/ami-skills). Para traer
su última versión, corre `npx skills add agventures/ami-skills`.

La referencia completa de la API está en https://docs.amiagente.com (y en
https://docs.amiagente.com/llms-full.txt, en un solo archivo para agentes).

## Licencia

MIT. Ver [LICENSE](./LICENSE).
