-- ============================================================
-- MonacoSV · Pedido listo → pasa solo a Logística
-- (También agrega shipments.ship_date: el día en que sale cada paquete.)
-- Ejecútalo DESPUÉS de orders.sql y unify_carriers.sql.
-- Se puede ejecutar más de una vez.
--
-- Un pedido está "listo" cuando está confirmado, es con envío y ya tiene
-- encomendista/paquetera. En ese momento se crea su despacho en Logística
-- (estado "Preparando", con esa paquetera). Si luego se cambia la paquetera
-- del pedido y el despacho sigue en "Preparando", se actualiza también.
-- Los pedidos con retiro en tienda no necesitan despacho.
-- ============================================================

-- Día planeado de envío (para el calendario semanal de Logística → Envíos)
alter table shipments add column if not exists ship_date date;

create or replace function fn_sale_to_shipment()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'confirmada'
     and coalesce(new.delivery_method, 'envio') = 'envio'
     and new.courier_id is not null then
    if exists (select 1 from shipments where sale_id = new.id) then
      update shipments set carrier_id = new.courier_id
      where sale_id = new.id and status = 'preparando' and carrier_id is distinct from new.courier_id;
    else
      insert into shipments (sale_id, carrier_id, status, ship_date) values (new.id, new.courier_id, 'preparando', new.delivery_date);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sale_to_shipment_trg on sales;
create trigger sale_to_shipment_trg
  after insert or update of status, courier_id, delivery_method on sales
  for each row execute function fn_sale_to_shipment();

-- Pedidos que ya estaban listos y todavía no tienen despacho
insert into shipments (sale_id, carrier_id, status, ship_date)
select s.id, s.courier_id, 'preparando', s.delivery_date
from sales s
where s.status = 'confirmada'
  and coalesce(s.delivery_method, 'envio') = 'envio'
  and s.courier_id is not null
  and not exists (select 1 from shipments h where h.sale_id = s.id);

notify pgrst, 'reload schema';
