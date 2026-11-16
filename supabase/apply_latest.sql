-- ============================================================
-- DUUMVIR · Configuración nueva de Supabase (todo en uno)
--
-- Pega este archivo COMPLETO en Supabase → SQL Editor → Run.
-- Une, en el orden correcto, lo que quedó pendiente del último cambio:
--   1) guest_checkout.sql      pedidos sin cuenta (invitado)
--   2) product_experience.sql  guía de uso y valoraciones de clientes
--   3) performance.sql         índices y catálogo público sin costos (siempre al final)
--
-- Se puede ejecutar más de una vez sin romper nada. Requiere lo anterior ya instalado
-- (place_order.sql y sus dependencias). Es una copia generada de los tres archivos
-- originales: si cambias uno, vuelve a generar este o bórralo.
-- ============================================================

-- >>>>>>>>>> guest_checkout.sql <<<<<<<<<<

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
    -- for update: dos pedidos simultáneos con el mismo cupón se turnan (si no, ambos verían
    -- "queda 1 uso" y el cupón se pasaría de su límite)
    select * into cp from coupons where active and lower(code) = lower(trim(p_coupon)) for update;
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

-- >>>>>>>>>> product_experience.sql <<<<<<<<<<

-- ============================================================
-- DUUMVIR · Experiencia de producto: valoraciones y guía de uso
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
-- Requiere: schema.sql, customers.sql, accounts_and_settings.sql y orders.sql.
--
--   1) products.usage     guía editorial de uso de cada fragancia (día, noche,
--                         temporadas y ocasiones), en escala de 1 a 5. La define
--                         la tienda desde el panel; no son datos de clientes.
--   2) product_reviews    valoraciones de clientes. Solo puede valorar quien tiene
--                         un pedido confirmado o entregado de esa fragancia, una vez
--                         por fragancia. Todo pasa por funciones del servidor: la
--                         tabla no es legible ni escribible directamente desde la tienda.
-- ============================================================

-- ---------- 1) Guía de uso ----------
alter table products add column if not exists usage jsonb not null default '{}'::jsonb;

-- Lectura pública de la guía (de la primera presentación que la tenga)
create or replace function fragrance_usage(p_name text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select usage from products
  where lower(name) = lower(trim(p_name)) and active and usage <> '{}'::jsonb
  order by created_at
  limit 1;
$$;
grant execute on function fragrance_usage(text) to anon, authenticated;

-- ---------- 2) Valoraciones ----------
create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  customer_id uuid not null references customers(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  longevity smallint check (longevity between 1 and 5),   -- duración en piel (opcional)
  projection smallint check (projection between 1 and 5), -- proyección / estela (opcional)
  comment text not null default '' check (char_length(comment) <= 1200),
  verified boolean not null default false,                -- la marca el servidor, nunca el cliente
  status text not null default 'publicada' check (status in ('publicada', 'oculta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- una valoración por cliente y fragancia
create unique index if not exists product_reviews_one_per_customer on product_reviews (customer_id, lower(product_name));
create index if not exists product_reviews_product_idx on product_reviews (lower(product_name), created_at desc);

alter table product_reviews enable row level security;

-- Sin políticas para visitantes: leen y escriben solo a través de las funciones de abajo.
-- El equipo puede ver, ocultar o borrar valoraciones (moderación).
drop policy if exists "product_reviews_staff" on product_reviews;
create policy "product_reviews_staff" on product_reviews
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- ¿Este cliente tiene una compra comprobable de la fragancia?
-- Cuenta un pedido confirmado o entregado (no pendiente ni cancelado) que la incluya.
create or replace function customer_bought(p_customer uuid, p_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from sales s
    join sale_items si on si.sale_id = s.id
    left join products p on p.id = si.product_id
    where s.customer_id = p_customer
      and s.status in ('confirmada', 'entregada')
      and (
        lower(p.name) = lower(trim(p_name))
        or lower(si.product_name) = lower(trim(p_name))
        -- el pedido guarda "Nombre (100 ml)"
        or left(lower(si.product_name), char_length(trim(p_name)) + 2) = lower(trim(p_name)) || ' ('
      )
  );
$$;
revoke all on function customer_bought(uuid, text) from public, anon, authenticated;

-- Resumen y lista pública de valoraciones de una fragancia
create or replace function product_reviews_summary(p_name text)
returns json
language sql stable security definer set search_path = public
as $$
  with r as (
    select pr.*, c.name as customer_name
    from product_reviews pr
    join customers c on c.id = pr.customer_id
    where lower(pr.product_name) = lower(trim(p_name)) and pr.status = 'publicada'
  )
  select json_build_object(
    'count', (select count(*) from r),
    'average', (select round(avg(rating)::numeric, 1) from r),
    'distribution', (
      select json_object_agg(n, (select count(*) from r where rating = n))
      from generate_series(1, 5) as n
    ),
    'longevity', (select round(avg(longevity)::numeric, 1) from r where longevity is not null),
    'projection', (select round(avg(projection)::numeric, 1) from r where projection is not null),
    'reviews', coalesce((
      select json_agg(x order by x.created_at desc)
      from (
        select
          id, rating, longevity, projection, comment, verified, created_at,
          -- solo el nombre de pila y la inicial del apellido
          case
            when trim(customer_name) = '' then 'Cliente'
            when position(' ' in trim(customer_name)) = 0 then initcap(trim(customer_name))
            else initcap(split_part(trim(customer_name), ' ', 1)) || ' ' || upper(left(split_part(trim(customer_name), ' ', 2), 1)) || '.'
          end as author
        from r
        order by created_at desc
        limit 50
      ) x
    ), '[]'::json)
  );
$$;
grant execute on function product_reviews_summary(text) to anon, authenticated;

-- ¿Puede valorar quien está viendo la ficha? Devuelve también su valoración, si ya tiene una.
create or replace function my_review_status(p_name text)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  mine json;
begin
  if uid is null then
    return json_build_object('can_review', false, 'reason', 'sin_sesion');
  end if;
  select id into cid from customers where user_id = uid;
  if cid is null then
    return json_build_object('can_review', false, 'reason', 'sin_compra');
  end if;
  select json_build_object('rating', rating, 'longevity', longevity, 'projection', projection, 'comment', comment, 'status', status)
    into mine
  from product_reviews
  where customer_id = cid and lower(product_name) = lower(trim(p_name));
  if not customer_bought(cid, p_name) then
    return json_build_object('can_review', false, 'reason', 'sin_compra', 'review', mine);
  end if;
  return json_build_object('can_review', true, 'reason', 'ok', 'review', mine);
end;
$$;
revoke execute on function my_review_status(text) from public, anon;
grant execute on function my_review_status(text) to authenticated;

-- Publicar o actualizar la valoración propia. Toda la validación ocurre aquí.
create or replace function submit_review(
  p_name text,
  p_rating int,
  p_comment text default '',
  p_longevity int default null,
  p_projection int default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  v_name text;
  -- los aspectos opcionales fuera de rango se guardan como "sin dato"
  v_long int := case when p_longevity between 1 and 5 then p_longevity end;
  v_proj int := case when p_projection between 1 and 5 then p_projection end;
begin
  if uid is null then
    raise exception 'Inicia sesión para valorar esta fragancia.';
  end if;
  select id into cid from customers where user_id = uid;
  if cid is null then
    raise exception 'Solo quienes compraron esta fragancia pueden valorarla.';
  end if;
  -- la fragancia debe existir en el catálogo; se guarda con su nombre oficial
  select name into v_name from products where lower(name) = lower(trim(p_name)) limit 1;
  if v_name is null then
    raise exception 'No encontramos esa fragancia.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Elige una calificación de 1 a 5 estrellas.';
  end if;
  if not customer_bought(cid, v_name) then
    raise exception 'Solo quienes compraron esta fragancia pueden valorarla.';
  end if;

  insert into product_reviews (product_name, customer_id, rating, longevity, projection, comment, verified)
  values (v_name, cid, p_rating, v_long, v_proj, left(trim(coalesce(p_comment, '')), 1200), true)
  on conflict (customer_id, lower(product_name)) do update
    set rating = excluded.rating,
        longevity = excluded.longevity,
        projection = excluded.projection,
        comment = excluded.comment,
        verified = true,
        updated_at = now();

  return json_build_object('ok', true);
end;
$$;
revoke execute on function submit_review(text, int, text, int, int) from public, anon;
grant execute on function submit_review(text, int, text, int, int) to authenticated;

-- Retirar la valoración propia
create or replace function delete_my_review(p_name text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
begin
  select id into cid from customers where user_id = auth.uid();
  if cid is null then
    return json_build_object('ok', false);
  end if;
  delete from product_reviews where customer_id = cid and lower(product_name) = lower(trim(p_name));
  return json_build_object('ok', true);
end;
$$;
revoke execute on function delete_my_review(text) from public, anon;
grant execute on function delete_my_review(text) to authenticated;

notify pgrst, 'reload schema';

-- >>>>>>>>>> performance.sql <<<<<<<<<<

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
