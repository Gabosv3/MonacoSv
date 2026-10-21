-- ============================================================
-- MonacoSV · Cuentas de cliente, ajustes de la tienda y datos de fragancia
-- Ejecútalo DESPUÉS de roles_permissions.sql, orders.sql y customers.sql.
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
--  1) store_settings   textos y datos de la tienda editables desde el panel
--  2) products         casa, tipo, fijación, etiqueta destacada y código
--  3) cuentas          los clientes pueden registrarse (correo o Google) y
--                      ver sus pedidos y cotizaciones
-- ============================================================

-- ------------------------------------------------------------
-- 1) Ajustes de la tienda
-- ------------------------------------------------------------

create table if not exists store_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

insert into store_settings (key, value) values
  ('store_name', 'MonacoSV'),
  ('whatsapp', '50300000000'),
  ('city', 'Usulután'),
  ('contact_email', ''),
  ('topbar_text', 'Envíos gratis en frascos o compras de +$45 USD'),
  ('free_shipping_min', '45'),
  ('coverage', 'Entregas a los 14 departamentos'),
  ('hero_kicker', 'Lote 2026 · 100% originales en El Salvador'),
  ('hero_title', E'Poder.\nProyección.\nPresencia.'),
  ('hero_text', 'Especialistas en fragancias de bestia negra y elixires árabes con estela monstruosa. Prueba decants de 10ml con sello hermético o adquiere frascos sellados con batch code garantizado.'),
  ('footer_about', 'Fragancias árabes originales, en decant y botella sellada.'),
  ('instagram', ''),
  ('facebook', ''),
  ('tiktok', '')
on conflict (key) do nothing;

insert into permissions (name, label, module, sort) values
  ('settings.view', 'Ver ajustes de la tienda',   'Ajustes', 90),
  ('settings.edit', 'Editar ajustes de la tienda', 'Ajustes', 91)
on conflict (name) do update
  set label = excluded.label, module = excluded.module, sort = excluded.sort;

insert into role_permissions (role_id, permission)
select r.id, p.name from roles r, permissions p
where r.name in ('super-admin', 'admin') and p.module = 'Ajustes'
on conflict do nothing;

alter table store_settings enable row level security;
drop policy if exists "settings_public_read" on store_settings;
drop policy if exists "settings_insert" on store_settings;
drop policy if exists "settings_update" on store_settings;
create policy "settings_public_read" on store_settings for select using (true);
create policy "settings_insert" on store_settings
  for insert to authenticated with check (has_permission('settings.edit'));
create policy "settings_update" on store_settings
  for update to authenticated using (has_permission('settings.edit'));

-- ------------------------------------------------------------
-- 2) Datos de fragancia en los productos
-- ------------------------------------------------------------

alter table products add column if not exists brand text not null default '';
alter table products add column if not exists kind text not null default '';
alter table products add column if not exists fixation text not null default '';
alter table products add column if not exists highlight text not null default '';
alter table products add column if not exists code text not null default '';

-- ------------------------------------------------------------
-- 3) Cuentas de cliente
-- ------------------------------------------------------------

alter table customers add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists customers_user_idx on customers (user_id) where user_id is not null;

-- ¿Quien consulta es personal del panel? (tiene perfil activo)
create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;
grant execute on function is_staff() to anon, authenticated;

-- Al registrarse alguien:
--   · con Google, o con el formulario de la tienda (marca "customer"): es CLIENTE
--   · desde el panel (Usuarios → Nuevo usuario): es PERSONAL y recibe un perfil
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  provider text := coalesce(new.raw_app_meta_data->>'provider', 'email');
  is_customer boolean := provider <> 'email' or coalesce(new.raw_user_meta_data->>'customer', '') = 'true';
  v_full text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  cid uuid;
begin
  if not is_customer then
    insert into profiles (id, email, full_name)
    values (new.id, new.email, v_full)
    on conflict (id) do nothing;
    return new;
  end if;

  -- si ya existía un cliente con ese correo (sin cuenta), se vincula
  if coalesce(new.email, '') <> '' then
    select id into cid from customers
    where lower(email) = lower(new.email) and user_id is null
    order by created_at limit 1;
  end if;

  if cid is not null then
    update customers set user_id = new.id, name = case when name = '' then v_full else name end where id = cid;
  else
    insert into customers (name, email, source, user_id)
    values (v_full, coalesce(new.email, ''), 'tienda', new.id)
    on conflict (user_id) where user_id is not null do nothing;
  end if;
  return new;
end;
$$;

-- Un pedido de alguien SIN perfil de personal (visitante o cliente con cuenta)
-- entra siempre como pendiente; si tiene cuenta, se liga a su cliente.
create or replace function sanitize_public_sale()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not is_staff() then
    new.status := 'pendiente';
    new.source := 'tienda';
    new.courier_id := null;
    new.invoiced := false;
    new.invoiced_at := null;
    new.customer_id := (select id from customers where user_id = auth.uid());
  end if;
  return new;
end;
$$;

-- Vincula el pedido con su cliente: por cuenta o, si no hay, por teléfono
create or replace function link_sale_customer()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  k text;
  cid uuid;
begin
  if new.customer_id is not null then
    -- cliente con cuenta: completa los datos que le faltaban
    update customers set
      name = case when name = '' then coalesce(new.customer_name, '') else name end,
      phone = case when phone = '' and not exists (
                select 1 from customers o where o.phone_key = regexp_replace(coalesce(new.customer_phone, ''), '\D', '', 'g') and o.id <> customers.id
              ) then coalesce(new.customer_phone, '') else phone end,
      department = case when department = '' then coalesce(new.department, '') else department end,
      municipality = case when municipality = '' then coalesce(new.municipality, '') else municipality end,
      address = case when address = '' then coalesce(new.address, '') else address end
    where id = new.customer_id;
    return new;
  end if;

  k := regexp_replace(coalesce(new.customer_phone, ''), '\D', '', 'g');
  if k = '' and coalesce(new.customer_name, '') = '' then
    return new;
  end if;

  if k <> '' then
    select id into cid from customers where phone_key = k;
  end if;

  if cid is null then
    insert into customers (name, phone, department, municipality, address, source)
    values (
      coalesce(new.customer_name, ''), coalesce(new.customer_phone, ''),
      coalesce(new.department, ''), coalesce(new.municipality, ''), coalesce(new.address, ''),
      case when new.source = 'tienda' then 'tienda' else 'admin' end
    )
    on conflict (phone_key) where phone_key <> '' do nothing
    returning id into cid;
    if cid is null and k <> '' then
      select id into cid from customers where phone_key = k;
    end if;
  else
    update customers set
      name = case when name = '' then coalesce(new.customer_name, '') else name end,
      department = case when department = '' then coalesce(new.department, '') else department end,
      municipality = case when municipality = '' then coalesce(new.municipality, '') else municipality end,
      address = case when address = '' then coalesce(new.address, '') else address end
    where id = cid;
  end if;

  new.customer_id := cid;
  return new;
end;
$$;

-- Guardar "Mi cuenta": el cliente edita sus propios datos
create or replace function save_my_profile(
  p_name text,
  p_phone text,
  p_department text,
  p_municipality text,
  p_address text
)
returns customers
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  me customers;
  k text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if uid is null then
    raise exception 'Inicia sesión para guardar tus datos.';
  end if;

  select * into me from customers where user_id = uid;
  if not found then
    insert into customers (name, email, source, user_id)
    values ('', coalesce((select email from auth.users where id = uid), ''), 'tienda', uid)
    returning * into me;
  end if;

  if k <> '' and exists (select 1 from customers where phone_key = k and id <> me.id) then
    raise exception 'Ese teléfono ya está registrado con otro cliente. Escríbenos por WhatsApp y lo vinculamos a tu cuenta.';
  end if;

  update customers set
    name = left(coalesce(p_name, ''), 120),
    phone = left(coalesce(p_phone, ''), 40),
    department = left(coalesce(p_department, ''), 60),
    municipality = left(coalesce(p_municipality, ''), 80),
    address = left(coalesce(p_address, ''), 200)
  where id = me.id
  returning * into me;

  return me;
end;
$$;
grant execute on function save_my_profile(text, text, text, text, text) to authenticated;

-- Cotizar desde la tienda: si hay cuenta, la cotización va a su cliente
create or replace function request_quote(
  p_name text,
  p_phone text,
  p_notes text,
  p_items jsonb,
  p_department text default '',
  p_municipality text default ''
)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  k text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  cid uuid;
  qid uuid;
  qnum bigint;
  item jsonb;
  prod products;
  qty integer;
  price numeric;
  v_total numeric := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'La cotización necesita entre 1 y 30 productos.';
  end if;

  if auth.uid() is not null then
    select id into cid from customers where user_id = auth.uid();
  end if;

  if cid is null then
    if coalesce(trim(p_name), '') = '' and k = '' then
      raise exception 'Escribe tu nombre o tu teléfono para registrar la cotización.';
    end if;
    if k <> '' then
      select id into cid from customers where phone_key = k;
    end if;
    if cid is null then
      insert into customers (name, phone, department, municipality, source)
      values (left(coalesce(p_name, ''), 120), left(coalesce(p_phone, ''), 40), left(coalesce(p_department, ''), 60), left(coalesce(p_municipality, ''), 80), 'tienda')
      on conflict (phone_key) where phone_key <> '' do nothing
      returning id into cid;
      if cid is null then
        select id into cid from customers where phone_key = k;
      end if;
    end if;
  end if;

  insert into quotes (customer_id, source, notes)
  values (cid, 'tienda', left(coalesce(p_notes, ''), 500))
  returning id, quote_number into qid, qnum;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := greatest(1, least(999, coalesce((item->>'quantity')::integer, 1)));
    prod := null;
    begin
      select * into prod from products where id = (item->>'product_id')::uuid;
    exception when others then
      prod := null;
    end;
    price := coalesce(
      case when prod.id is not null then
        case when prod.sale_price is not null and prod.sale_price < prod.price then prod.sale_price else prod.price end
      end,
      least(10000, greatest(0, coalesce((item->>'unit_price')::numeric, 0)))
    );
    insert into quote_items (quote_id, product_id, product_name, quantity, unit_price)
    values (qid, prod.id, left(coalesce(prod.name || case when prod.volume <> '' then ' (' || prod.volume || ')' else '' end, item->>'product_name', ''), 160), qty, price);
    v_total := v_total + qty * price;
  end loop;

  update quotes set total = v_total where id = qid;
  return qnum;
end;
$$;

-- El cliente con cuenta ve SUS datos (nunca los de otros)
drop policy if exists "customers_read_own" on customers;
create policy "customers_read_own" on customers
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "sales_read_own" on sales;
create policy "sales_read_own" on sales
  for select to authenticated
  using (customer_id in (select id from customers where user_id = auth.uid()));

drop policy if exists "sale_items_read_own" on sale_items;
create policy "sale_items_read_own" on sale_items
  for select to authenticated
  using (exists (
    select 1 from sales s
    where s.id = sale_items.sale_id
      and s.customer_id in (select id from customers where user_id = auth.uid())
  ));

drop policy if exists "quotes_read_own" on quotes;
create policy "quotes_read_own" on quotes
  for select to authenticated
  using (customer_id in (select id from customers where user_id = auth.uid()));

drop policy if exists "quote_items_read_own" on quote_items;
create policy "quote_items_read_own" on quote_items
  for select to authenticated
  using (exists (
    select 1 from quotes q
    where q.id = quote_items.quote_id
      and q.customer_id in (select id from customers where user_id = auth.uid())
  ));

notify pgrst, 'reload schema';
