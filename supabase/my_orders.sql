-- ============================================================
-- MonacoSV · "Mis pedidos" con detalle y seguimiento para el cliente
-- Ejecútalo DESPUÉS de orders.sql, customers.sql y unify_carriers.sql.
-- Pega este archivo en Supabase → SQL Editor → Run. Se puede repetir.
--
-- my_orders() devuelve los pedidos de quien tiene la sesión iniciada, con sus
-- productos y, si ya salió, el despacho (paquetera y código de seguimiento).
-- Es una función aparte porque el cliente no puede leer la tabla de despachos.
-- ============================================================

create or replace function my_orders()
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
begin
  if uid is null then
    return '[]'::json;
  end if;
  select id into cid from customers where user_id = uid;
  if cid is null then
    return '[]'::json;
  end if;

  return coalesce((
    select json_agg(o order by o.created_at desc)
    from (
      select
        s.id, s.order_number, s.created_at, s.status, s.delivery_method,
        s.department, s.municipality, s.address, s.delivery_date, s.delivery_window,
        s.subtotal, s.discount_total, s.coupon_code, s.total, s.shipping_total, s.invoice_number,
        coalesce((
          select json_agg(json_build_object(
            'product_name', i.product_name, 'quantity', i.quantity,
            'unit_price', i.unit_price, 'subtotal', i.subtotal) order by i.product_name)
          from sale_items i where i.sale_id = s.id
        ), '[]'::json) as items,
        (
          select json_build_object(
            'status', h.status, 'carrier', k.name, 'tracking_number', h.tracking_number,
            'cost', h.cost, 'tracking_url', k.tracking_url, 'shipped_at', h.shipped_at, 'delivered_at', h.delivered_at)
          from shipments h left join carriers k on k.id = h.carrier_id
          where h.sale_id = s.id
          order by h.created_at desc limit 1
        ) as shipment
      from sales s
      where s.customer_id = cid
    ) o
  ), '[]'::json);
end;
$$;

revoke execute on function my_orders() from public, anon;
grant execute on function my_orders() to authenticated;

notify pgrst, 'reload schema';
