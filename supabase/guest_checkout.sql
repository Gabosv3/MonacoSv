-- ============================================================
-- DUUMVIR · Compra sin cuenta (invitado)
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
-- Requiere que ya se haya ejecutado place_order.sql (y sus dependencias).
--
-- Qué cambia:
--   · place_order() acepta pedidos SIN sesión. Es la misma función de siempre:
--     los precios, descuentos, cupón, stock y envío se siguen calculando en el
--     servidor con los datos de la base; el visitante solo envía qué productos
--     quiere, cuántos y a dónde. No puede fijar precios ni estados.
--   · A un invitado se le exige nombre y un teléfono de al menos 8 dígitos.
--   · Como un pedido pendiente ya aparta inventario, a los invitados se les ponen
--     topes (ajustables al inicio de la función): 3 pedidos pendientes por teléfono
--     por hora, 40 pedidos de invitados por hora en toda la tienda, 10 unidades por
--     producto y 20 por pedido. Para más, el pedido se coordina por WhatsApp.
--   · El inventario se revisa con la fila del producto bloqueada: dos pedidos
--     simultáneos (o el mismo producto repetido en un pedido) no pueden vender de más.
--   · Cada envío lleva un identificador (client_request_id): si llega repetido,
--     se devuelve el pedido ya creado en vez de crear otro.
--   · El pedido entra como «pendiente», de origen «tienda», y se liga a su cliente
--     por teléfono (los disparadores existentes no cambian).
-- Qué NO cambia: las políticas de las tablas. Un visitante sigue sin poder leer
-- pedidos (ni siquiera el suyo): solo recibe la respuesta de su propio envío.
-- Las cotizaciones (request_quote) siguen siendo solo para clientes con cuenta.
-- ============================================================

alter table sales add column if not exists client_request_id uuid;
-- marca los pedidos hechos sin cuenta (para el tope por hora y para identificarlos en el panel)
alter table sales add column if not exists guest boolean not null default false;
create unique index if not exists sales_client_request_idx on sales (client_request_id) where client_request_id is not null;

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
  v_guest boolean := auth.uid() is null;
  v_req uuid;
  prev sales;
  v_prior integer;        -- unidades del mismo producto ya pedidas en líneas anteriores
  v_units integer := 0;   -- unidades totales del pedido
  -- topes para pedidos sin cuenta
  c_guest_phone_hour constant integer := 3;   -- pedidos pendientes por teléfono por hora
  c_guest_store_hour constant integer := 40;  -- pedidos de invitados por hora en toda la tienda
  c_guest_line_max constant integer := 10;    -- unidades por producto
  c_guest_units_max constant integer := 20;   -- unidades por pedido
begin
  -- ¿Este mismo envío ya se registró? (doble clic, reintento por mala conexión)
  begin
    v_req := nullif(p_customer->>'request_id', '')::uuid;
  exception when others then
    v_req := null;
  end;
  if v_req is not null then
    select * into prev from sales where client_request_id = v_req;
    if found then
      -- el identificador es aleatorio y solo lo conoce quien envió el pedido; aun así,
      -- el resumen se devuelve únicamente si coincide el teléfono
      if regexp_replace(coalesce(prev.customer_phone, ''), '\D', '', 'g') is distinct from regexp_replace(v_phone, '\D', '', 'g') then
        raise exception 'No pudimos registrar tu pedido. Actualiza la página e inténtalo de nuevo.';
      end if;
      return json_build_object(
        'id', prev.id,
        'order_number', prev.order_number,
        'created_at', prev.created_at,
        'subtotal', prev.subtotal,
        'discount_total', prev.discount_total,
        'coupon_code', prev.coupon_code,
        'total', prev.total,
        'shipping_total', prev.shipping_total,
        'carrier', (select name from carriers where id = prev.courier_id),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object('product_id', product_id, 'product_name', product_name, 'quantity', quantity, 'unit_price', unit_price))
          from sale_items where sale_id = prev.id
        ), '[]'::jsonb),
        'repeated', true
      );
    end if;
  end if;

  if v_guest then
    -- sin cuenta: nombre y un teléfono real son obligatorios para poder coordinar el pedido
    if v_name = '' then
      raise exception 'Escribe tu nombre para registrar el pedido.';
    end if;
    if char_length(regexp_replace(v_phone, '\D', '', 'g')) < 8 then
      raise exception 'Escribe un teléfono válido para coordinar tu pedido.';
    end if;
    -- freno al abuso: pocos pedidos pendientes por teléfono en poco tiempo
    if (
      select count(*) from sales
      where source = 'tienda' and status = 'pendiente'
        and created_at > now() - interval '1 hour'
        and regexp_replace(customer_phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
    ) >= c_guest_phone_hour then
      raise exception 'Ya recibimos varios pedidos con este teléfono. Escríbenos por WhatsApp para ayudarte.';
    end if;
    if (select count(*) from sales where guest and created_at > now() - interval '1 hour') >= c_guest_store_hour then
      raise exception 'En este momento no podemos registrar más pedidos sin cuenta. Escríbenos por WhatsApp o ingresa con tu cuenta.';
    end if;
  elsif v_name = '' and v_phone = '' then
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
      select * into prod from products where id = (item->>'product_id')::uuid and active for update;
    exception when others then
      prod := null;
    end;
    if prod.id is null then
      raise exception 'Uno de los productos ya no está disponible. Actualiza la página e inténtalo de nuevo.';
    end if;
    select coalesce(sum((e->>'quantity')::integer), 0) into v_prior
    from jsonb_array_elements(v_items) e
    where e->>'product_id' = prod.id::text;
    if v_guest and qty + v_prior > c_guest_line_max then
      raise exception 'Para más de % unidades de un mismo producto, escríbenos por WhatsApp.', c_guest_line_max;
    end if;
    if prod.stock is not null and prod.stock < qty + v_prior then
      raise exception 'No hay stock suficiente de % (quedan %).', prod.name || coalesce(' ' || nullif(prod.volume, ''), ''), greatest(prod.stock, 0);
    end if;
    v_units := v_units + qty;

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

  if v_guest and v_units > c_guest_units_max then
    raise exception 'Para pedidos de más de % unidades, escríbenos por WhatsApp.', c_guest_units_max;
  end if;

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

  begin
    insert into sales (
      customer_name, customer_phone, delivery_method, department, municipality, address, notes,
      subtotal, discount_total, coupon_code, total, shipping_total, status, source, client_request_id, guest
    ) values (
      v_name, v_phone, v_method, v_dept, v_mun, v_addr, v_notes,
      v_sub, v_disc, v_code, v_total, v_ship, 'pendiente', 'tienda', v_req, v_guest
    )
    returning id, order_number into sid, snum;
  exception when unique_violation then
    -- el mismo envío llegó dos veces a la vez: este se descarta completo (nada queda a medias)
    raise exception 'Tu pedido ya se está registrando. Espera un momento antes de volver a intentarlo.';
  end;

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

-- Ahora también los visitantes sin sesión pueden registrar su pedido
grant execute on function place_order(jsonb, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';
