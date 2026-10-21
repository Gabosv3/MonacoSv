-- ============================================================
-- MonacoSV · Etiquetas y precio con descuento en productos
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
--   tags        etiquetas libres del producto (notas, ocasión, estilo…):
--               se muestran en la tienda y sirven para filtrar.
--   sale_price  precio con descuento (opcional). Si existe y es menor que
--               "price", la tienda muestra el precio normal tachado.
-- ============================================================

alter table products add column if not exists tags text[] not null default '{}';
alter table products add column if not exists sale_price numeric(12, 2);

alter table products drop constraint if exists products_sale_price_check;
alter table products add constraint products_sale_price_check
  check (sale_price is null or (sale_price >= 0 and sale_price < price));

create index if not exists products_tags_idx on products using gin (tags);

notify pgrst, 'reload schema';
