-- ============================================================
-- MonacoSV · Rendimiento y datos protegidos (plan Free de Supabase)
-- Ejecútalo AL FINAL, después de todos los demás archivos. Se puede repetir.
--
-- 1) Índices en las columnas por las que se busca y se une (pedidos, productos,
--    despachos…). Sin ellos Postgres lee la tabla completa en cada consulta:
--    más lento y más CPU en el plan Free (CPU compartida).
-- 2) products_public: lo que ve la tienda SIN el costo de compra. Antes la tabla
--    `products` era legible por cualquiera y exponía `cost` (tu margen). Ahora la
--    tienda lee la vista y la tabla queda solo para el equipo.
-- ============================================================

-- ---------- 1) Índices ----------
create index if not exists sales_created_idx on sales (created_at desc);
create index if not exists sales_courier_idx on sales (courier_id);
create index if not exists sale_items_sale_idx on sale_items (sale_id);
create index if not exists sale_items_product_idx on sale_items (product_id);
create index if not exists purchases_product_idx on purchases (product_id);
create index if not exists purchases_date_idx on purchases (purchased_at desc);
create index if not exists shipments_carrier_idx on shipments (carrier_id);
create index if not exists shipments_created_idx on shipments (created_at desc);
create index if not exists shipments_ship_date_idx on shipments (ship_date);
create index if not exists products_active_name_idx on products (name) where active;
create index if not exists products_category_idx on products (category);
create index if not exists coupons_code_idx on coupons (lower(code));
create index if not exists quotes_created_idx on quotes (created_at desc);
create index if not exists user_roles_role_idx on user_roles (role_id);

-- ---------- 2) Catálogo público sin costos ----------
create or replace view products_public as
select id, name, volume, category, price, sale_price, tags, brand, kind, fixation,
       highlight, code, stock, active, color, image_url, description
from products
where active;

grant select on products_public to anon, authenticated;

-- La tabla completa (con costo y stock mínimo) ya no es pública
drop policy if exists "products_public_read" on products;
drop policy if exists "products_staff_read" on products;
create policy "products_staff_read" on products
  for select to authenticated using (has_permission('products.view'));

-- Que Postgres actualice sus estadísticas con los índices nuevos
analyze sales;
analyze sale_items;
analyze products;
analyze shipments;

notify pgrst, 'reload schema';
