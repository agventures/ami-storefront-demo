# Cuentas de clientes — «Entrar con Ami»

El cliente entra a tu sitio con la cuenta que ya usa en las tiendas de Ami (correo y llave de acceso). Tu sitio no guarda contraseñas ni envía códigos. Docs: https://docs.amiagente.com/docs/guias/cuentas

## El flujo (todo en tu servidor)

1. **Entrar** → `POST /customer/sign-in` `{redirect_uri}` → `{url, verifier, expires_at}`. `redirect_uri` tiene que estar en el sitio de **Ajustes › Desarrolladores** (`https://`; `http://localhost` con llave de prueba) y puede llevar parámetros tuyos (`?next=/cart`).
2. Guarda `verifier` en una cookie `httpOnly` (15 minutos) y redirige el navegador a `url`.
3. El cliente vuelve a `redirect_uri?code=…` (o `?error=access_denied` si no quiso).
4. `POST /customer/session` `{code, verifier}` → `{token: "ami_cs_…", customer}`. El código sirve una vez y por un minuto.
5. Guarda el token en una cookie `httpOnly` y mándalo en cada solicitud por ese cliente: `Ami-Customer-Token: ami_cs_…` (además de `Authorization`).

## Reglas

- **El token es tan privado como la llave**: cookie `httpOnly` o tu base de datos. Nunca en `localStorage`, en una cookie que lea JavaScript, en el HTML ni en un componente de cliente.
- `401 invalid_customer_token` = la sesión terminó (el cliente cerró sesión en su cuenta de Ami, o pasaron 90 días sin uso): borra la cookie y trátalo como invitado.
- Un `POST /orders` con un token que ya no sirve **no** se crea como invitado: responde `401`. Borra la cookie y deja reintentar.
- `next`/`redirect` después de entrar: solo rutas de tu sitio (empiezan con `/`, no con `//`).
- Cerrar sesión es un `POST` en tu sitio → `DELETE /customer/session` y borras la cookie. Cierra la sesión en todo ese navegador (tu sitio, su cuenta de Ami, las tiendas de Ami).

## Lo que ves

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `/customer` | `id` (`cus_…`, el mismo cada vez en tu sitio; otra tienda ve otro), `email`, `name`, `phone`, `document`, `addresses[]` |
| PATCH | `/customer` | `{name?, phone?, document?}` — el correo no cambia |
| GET · POST | `/customer/addresses` | `{label, address, reference_point, pin, is_default}`; hasta 20 |
| PATCH · DELETE | `/customer/addresses/{id}` | |
| GET | `/customer/orders` | Lo que compró en **esta** tienda: tu sitio y la tienda de Ami del negocio. Misma forma que `GET /orders/{reference}` |
| GET | `/customer/orders/{reference}` | Uno de ellos; `404` si es de otro |
| DELETE | `/customer/session` | Cerrar sesión |

## En el checkout

- Llena nombre, teléfono, cédula (`document`) y correo con `GET /customer`. Si `customer` va vacío en `POST /orders`, Ami lo llena con la cuenta.
- Delivery a una dirección guardada: manda su `address`, `reference_point` y `pin` como siempre, más `saved_address_id`.
- Dirección nueva que el cliente quiere guardar: `save_address_label` («Casa»).
- `Ami-Customer-Token` también en `POST /booking/appointments` y `/hotel/stays`.

## «Mis pedidos» y la página del pedido

Con sesión: `GET /customer/orders` (cualquier dispositivo) y `GET /customer/orders/{reference}`. Sin sesión: solo los pedidos guardados en el navegador. Nunca `GET /orders?phone=` sin verificar al cliente.

## Con llave de prueba

El inicio de sesión es real (con tu cuenta); lo que cambias en la cuenta cambia de verdad. Los pedidos siguen siendo de prueba y aparecen en `GET /customer/orders` de esa llave.
