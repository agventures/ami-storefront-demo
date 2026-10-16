# Instrucciones para agentes

Este proyecto es una tienda en línea que **vende con Ami**: el catálogo, los
precios, los impuestos, el envío y el cobro son de Ami; este sitio solo los
muestra.

1. Antes de cambiar cualquier cosa, lee y sigue
   `.agents/skills/ami-storefront/SKILL.md` (y sus `references/`). Sus
   «Reglas que no se rompen» no tienen excepciones: la llave solo en el
   servidor (`lib/ami.ts`), nada de cuentas con dinero, el pago en
   `payment_url`.
2. Textos para el cliente en español; código, nombres y comentarios en inglés.
3. Antes de terminar, corre y deja en verde:

   ```bash
   node .agents/skills/ami-storefront/scripts/check-key-leak.mjs
   pnpm build
   ```

Documentación de la API: https://docs.amiagente.com
