-- ============================================================
-- MonacoSV · Numeración desde 1
-- Pedidos: #1, #2, #3…   Facturas: FAC-A1, FAC-A2…
-- Pega este archivo en Supabase → SQL Editor → Run.
--
-- · Renumera los pedidos y facturas que ya existen (en orden de fecha).
-- · Los nuevos continúan desde el último número.
-- Ejecútalo una sola vez: si lo repites, los números se vuelven a ordenar
-- por fecha (los que ya estén bien quedan igual).
-- ============================================================

-- Pedidos (se pasa por negativos para no chocar con el índice único)
update sales set order_number = -order_number where order_number is not null;

with ordered as (
  select id, row_number() over (order by created_at, id) as n from sales
)
update sales s set order_number = o.n from ordered o where s.id = o.id;

select setval(pg_get_serial_sequence('sales', 'order_number'), greatest(coalesce((select max(order_number) from sales), 0), 1), (select count(*) > 0 from sales));

-- Facturas
with ordered as (
  select id, row_number() over (order by coalesce(invoiced_at, created_at), id) as n
  from sales where invoice_number is not null
)
update sales s set invoice_number = 'FAC-A' || o.n from ordered o where s.id = o.id;

select setval('invoice_seq', greatest((select count(*) from sales where invoice_number is not null), 1), (select count(*) > 0 from sales where invoice_number is not null));

notify pgrst, 'reload schema';
