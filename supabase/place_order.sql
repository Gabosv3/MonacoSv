-- ============================================================
-- MonacoSV · Pedidos de la tienda registrados en el sistema
-- (También: elegir paquetera en el pago, con su precio de envío. Necesita carrier_price.sql.)
-- Ejecútalo DESPUÉS de roles_permissions.sql, orders.sql, customers.sql
-- y accounts_and_settings.sql.
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
-- place_order() recibe el carrito del cliente y, EN EL SERVIDOR:
--   · toma los precios de la base de datos (nadie puede alterarlos),
--   · aplica descuentos activos y el cupón,
--   · revisa que haya stock,
--   · crea el pedido y sus productos de una sola vez,
--   · liga el pedido a su cliente (por cuenta o por teléfono),
--   · devuelve el número de pedido.
-- Así el cliente (con cuenta iniciada) hace su pedido directamente en la
-- tienda, sin depender de WhatsApp. Sin sesión no se aceptan pedidos.
-- ============================================================

-- ---------- Envío: el cliente elige con quién quiere recibir ----------
alter table carriers add column if not exists shipping_price numeric(12, 2) not null default 0;
alter table sales add column if not exists shipping_total numeric(12, 2) not null default 0;

-- Opciones de envío que ve el cliente en el pago (paqueteras activas y su precio)
create or replace function shipping_options()
returns json
language sql stable security definer set search_path = public
as $$
  select coalesce(json_agg(json_build_object('id', id, 'name', name, 'price', shipping_price) order by name), '[]'::json)
  from carriers where active;
$$;
grant execute on function shipping_options() to anon, authenticated;

-- Un pedido de alguien SIN perfil de personal entra como pendiente; conserva solo
-- la paquetera que el cliente eligió en el pago (la marca place_order).
create or replace function sanitize_public_sale()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not is_staff() then
    new.status := 'pendiente';
    new.source := 'tienda';
    new.courier_id := case when tg_op = 'INSERT' then nullif(current_setting('app.chosen_carrier', true), '')::uuid else null end;
    new.invoiced := false;
    new.invoiced_at := null;
    new.customer_id := (select id from customers where user_id = auth.uid());
  end if;
  return new;
end;
$$;

create or replace function place_order(
  p_customer jsonb,
  p_items jsonb,
  p_coupon text default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_name text := left(coalesce(trim(p_customer->>'name'), ''), 120);
  v_phone text := left(coalesce(trim(p_customer->>'phone'), ''), 40);
  v_method text := case when p_customer->>'delivery_method' = 'retiro' then 'retiro' else 'envio' end;
  v_dept text := left(coalesce(p_customer->>'department', ''), 60);
  v_mun text := left(coalesce(p_customer->>'municipality', ''), 80);
  v_addr text := left(coalesce(p_customer->>'address', ''), 200);
  v_notes text := left(coalesce(p_customer->>'notes', ''), 500);
  item jsonb;
  prod products;
  d discounts;
  cp coupons;
  qty integer;
  base numeric;
  v_sale numeric;
  v_unit numeric;
  v_off numeric;
  v_items jsonb := '[]'::jsonb;
  v_sub numeric := 0;
  v_disc numeric := 0;
  v_total numeric;
  v_code text;
  v_carrier uuid;
  car carriers;
  v_min numeric;
  v_ship numeric := 0;
  sid uuid;
  snum bigint;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para hacer tu pedido.';
  end if;
  if v_name = '' and v_phone = '' then
    raise exception 'Escribe tu nombre y tu teléfono para registrar el pedido.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'El pedido necesita entre 1 y 30 productos.';
  end if;
  if v_method = 'envio' and (v_dept = '' or v_mun = '') then
    raise exception 'Indica el departamento y el municipio de entrega.';
  end if;
  if v_method = 'retiro' then
    v_dept := ''; v_mun := ''; v_addr := '';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := greatest(1, least(99, coalesce((item->>'quantity')::integer, 1)));

    begin
      select * into prod from products where id = (item->>'product_id')::uuid and active;
    exception when others then
      prod := null;
    end;
    if prod.id is null then
      raise exception 'Uno de los productos ya no está disponible. Actualiza la página e inténtalo de nuevo.';
    end if;
    if prod.stock is not null and prod.stock < qty then
      raise exception 'No hay stock suficiente de % (quedan %).', prod.name || coalesce(' ' || nullif(prod.volume, ''), ''), greatest(prod.stock, 0);
    end if;

    base := prod.price;
    v_sale := case when prod.sale_price is not null and prod.sale_price > 0 and prod.sale_price < prod.price then prod.sale_price else prod.price end;
    v_unit := v_sale;

    -- descuento activo que aplica (por producto, categoría o todo el catálogo)
    select * into d from discounts
    where active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (scope = 'all'
           or (scope = 'category' and scope_value = prod.category)
           or (scope = 'product' and scope_value = prod.id::text))
    order by created_at
    limit 1;
    if found then
      v_off := case when d.type = 'percent' then base * d.value / 100 else d.value end;
      v_unit := least(v_unit, greatest(0, round(base - v_off, 2)));
    end if;

    v_items := v_items || jsonb_build_object(
      'product_id', prod.id,
      'product_name', prod.name || case when coalesce(prod.volume, '') <> '' then ' (' || prod.volume || ')' else '' end,
      'quantity', qty,
      'unit_price', v_unit
    );
    v_sub := v_sub + v_unit * qty;
  end loop;

  -- cupón
  if coalesce(trim(p_coupon), '') <> '' then
    select * into cp from coupons where active and lower(code) = lower(trim(p_coupon));
    if not found then
      raise exception 'El cupón no es válido.';
    end if;
    if cp.max_uses is not null and cp.used_count >= cp.max_uses then
      raise exception 'Este cupón ya alcanzó su límite de usos.';
    end if;
    if cp.expires_at is not null and cp.expires_at < now() then
      raise exception 'Este cupón ya venció.';
    end if;
    if v_sub < coalesce(cp.min_purchase, 0) then
      raise exception 'Este cupón requiere una compra mínima de $%.', cp.min_purchase;
    end if;
    v_disc := least(v_sub, round(case when cp.type = 'percent' then v_sub * cp.value / 100 else cp.value end, 2));
    v_code := cp.code;
    update coupons set used_count = used_count + 1 where id = cp.id;
  end if;

  v_total := greatest(0, v_sub - v_disc);

  -- paquetera elegida y costo del envío (gratis desde el mínimo de Ajustes)
  if v_method = 'envio' then
    begin
      v_carrier := nullif(p_customer->>'carrier_id', '')::uuid;
    exception when others then
      v_carrier := null;
    end;
    if v_carrier is not null then
      select * into car from carriers where id = v_carrier and active;
      if not found then
        raise exception 'La paquetera elegida ya no está disponible. Elige otra.';
      end if;
    elsif exists (select 1 from carriers where active) then
      raise exception 'Elige con quién quieres recibir tu envío.';
    end if;
    select nullif(regexp_replace(value, '[^0-9.]', '', 'g'), '')::numeric into v_min from store_settings where key = 'free_shipping_min';
    v_min := coalesce(v_min, 100);
    v_ship := case when v_carrier is null or (v_min > 0 and v_total >= v_min) then 0 else coalesce(car.shipping_price, 0) end;
    perform set_config('app.chosen_carrier', coalesce(v_carrier::text, ''), true);
  end if;

  insert into sales (
    customer_name, customer_phone, delivery_method, department, municipality, address, notes,
    subtotal, discount_total, coupon_code, total, shipping_total, status, source
  ) values (
    v_name, v_phone, v_method, v_dept, v_mun, v_addr, v_notes,
    v_sub, v_disc, v_code, v_total, v_ship, 'pendiente', 'tienda'
  )
  returning id, order_number into sid, snum;

  insert into sale_items (sale_id, product_id, product_name, quantity, unit_price)
  select sid, (e->>'product_id')::uuid, e->>'product_name', (e->>'quantity')::integer, (e->>'unit_price')::numeric
  from jsonb_array_elements(v_items) e;

  return json_build_object(
    'id', sid,
    'order_number', snum,
    'created_at', now(),
    'subtotal', v_sub,
    'discount_total', v_disc,
    'coupon_code', v_code,
    'total', v_total,
    'shipping_total', v_ship,
    'carrier', car.name,
    'items', v_items
  );
end;
$$;

-- Solo clientes con sesión iniciada pueden hacer pedidos o cotizar desde la tienda
revoke execute on function place_order(jsonb, jsonb, text) from public, anon;
grant execute on function place_order(jsonb, jsonb, text) to authenticated;
revoke execute on function request_quote(text, text, text, jsonb, text, text) from public, anon;
grant execute on function request_quote(text, text, text, jsonb, text, text) to authenticated;

notify pgrst, 'reload schema';
