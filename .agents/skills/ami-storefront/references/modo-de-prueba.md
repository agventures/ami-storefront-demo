# Modo de prueba

Con `ami_test_…`: lecturas reales, escrituras simuladas. Referencias que empiezan con `T`, `livemode: false`. Nada llega al panel del negocio.

- «Entrar con Ami» es real con una llave de prueba (entras con tu cuenta; `redirect_uri` puede ser `http://localhost`). Lo que cambias en la cuenta cambia de verdad; los pedidos siguen siendo de prueba.
- La `payment_url` de un objeto de prueba muestra **Simular pago aprobado**, **Simular comprobante enviado** y **Simular rechazo del banco**.
- `POST /test/{tipo}/{reference}/advance` `{"to": paso}` hace lo que haría el negocio y envía el webhook:

| tipo | pasos |
| --- | --- |
| `orders` | `payment_sent`, `paid`, `in_progress`, `complete`, `cancelled`, `expired` |
| `appointments` | `payment_sent`, `paid`, `confirmed`, `completed`, `no_show`, `cancelled` |
| `stays` | `payment_sent`, `confirmed`, `checked_in`, `checked_out`, `cancelled` |
| `subscriptions` | `renewal_due`, `paid`, `canceled` |

Prueba de punta a punta antes de entregar:

1. Cotiza y crea un pedido con datos válidos (cédula incluida).
2. Abre `payment_url`, pulsa **Simular pago aprobado**, vuelve a tu sitio con **Volver a …**.
3. Tu página de retorno muestra `pending_approval` y pagado.
4. `advance` a `in_progress` y a `complete`: tu sitio (o tu webhook) lo refleja.
5. Repite con un pedido que Ami rechace (por ejemplo bajo la compra mínima) y verifica que tu sitio muestra el `message`.
