-- ============================================================
-- MonacoSV · Precio de envío por paquetera (gratis desde el mínimo)
-- Ejecútalo DESPUÉS de auto_dispatch.sql. Se puede repetir.
--
-- · Cada paquetera tiene su "precio de envío".
-- · El costo del despacho ya no se escribe a mano: es el precio de la paquetera,
--   o $0 (gratis) cuando el pedido llega al mínimo de envío gratis de Ajustes
--   (por defecto $100).
-- · Se calcula solo al crear el despacho y al cambiar su paquetera.
-- ============================================================

alter table carriers add column if not exists shipping_price numeric(12, 2) not null default 0;

create or replace function shipment_cost(p_sale uuid, p_carrier uuid)
returns numeric
language plpgsql stable security definer set search_path = public
as $$
declare
  v_total numeric;
  v_min numeric;
  v_price numeric;
begin
  select total into v_total from sales where id = p_sale;
  select nullif(regexp_replace(value, '[^0-9.]', '', 'g'), '')::numeric into v_min from store_settings where key = 'free_shipping_min';
  v_min := coalesce(v_min, 100);
  if v_min > 0 and coalesce(v_total, 0) >= v_min then
    return 0;
  end if;
  select shipping_price into v_price from carriers where id = p_carrier;
  return coalesce(v_price, 0);
end;
$$;

-- El costo siempre sale del cálculo, venga lo que venga del formulario
create or replace function fn_shipment_cost()
returns trigger
language plpgsql
as $$
begin
  new.cost := shipment_cost(new.sale_id, new.carrier_id);
  return new;
end;
$$;

drop trigger if exists shipment_cost_trg on shipments;
create trigger shipment_cost_trg
  before insert or update of carrier_id, sale_id on shipments
  for each row execute function fn_shipment_cost();

-- Despachos que todavía no salieron: recalcula con las reglas nuevas
update shipments set cost = shipment_cost(sale_id, carrier_id) where status = 'preparando';

notify pgrst, 'reload schema';

-- El mínimo para envío gratis pasa de $45 a $100 (solo si seguía con el valor anterior)
update store_settings set value = '100' where key = 'free_shipping_min' and value in ('45', '45.00');
update store_settings set value = 'Envíos gratis en compras a partir de $100 USD' where key = 'topbar_text' and value like '%$45%';
