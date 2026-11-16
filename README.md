# MonacoSv

Tienda DUUMVIR (React + Vite + Supabase).

```bash
npm install
npm run dev
```

Necesita un archivo `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver `.env.example`).

## Base de datos (Supabase)

Cada archivo de `supabase/` se pega completo en **Supabase → SQL Editor → Run**. Casi todos se pueden
repetir sin romper nada (`renumber_from_1.sql` es la excepción: se ejecuta una sola vez).

Orden de instalación (cada uno indica en su cabecera de qué depende):

1. `schema.sql`
2. `roles_permissions.sql`
3. `orders.sql`
4. `customers.sql`
5. `accounts_and_settings.sql`
6. `categories.sql`, `storage.sql`, `product_fields.sql`, `branding.sql`
7. `unify_carriers.sql` → `auto_dispatch.sql` → `carrier_price.sql`
8. `my_orders.sql`
9. `place_order.sql`
10. **`guest_checkout.sql`** — pedidos sin cuenta (invitado)
11. **`product_experience.sql`** — guía de uso y valoraciones de clientes
12. `performance.sql` — **siempre al final**: índices, y la vista `products_public` (el catálogo sin costos)

Si ya tienes instalado lo anterior, lo pendiente del último cambio son solo los pasos 10, 11 y 12, en ese orden.

Qué pasa mientras falta cada uno (la tienda no se rompe, pero esa parte no funciona):

| Falta | Efecto |
| --- | --- |
| `guest_checkout.sql` | Quien compra sin cuenta recibe un aviso y puede enviar el pedido por WhatsApp. |
| `product_experience.sql` | La ficha muestra «las valoraciones se activarán próximamente» y no hay guía de uso. |
| `performance.sql` | El catálogo se lee de la tabla `products` (con un 404 en la consola) y `cost` sigue siendo legible con la clave pública. |

Importante: `place_order.sql` es el último que redefine el disparador `sanitize_public_sale()` (guarda la paquetera
elegida). Si vuelves a ejecutar `customers.sql` o `accounts_and_settings.sql`, ejecuta `place_order.sql` otra vez después.
