-- ============================================================
-- MonacoSV · Esquema del panel administrativo
-- Pega este archivo completo en Supabase → SQL Editor → Run
-- ============================================================

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  description text not null default '',
  price numeric(12, 2) not null default 0,
  cost numeric(12, 2) not null default 0,
  volume text not null default '',
  color text not null default '#141414',
  image_url text,
  stock integer not null default 0,
  min_stock integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2) not null default 0,
  total numeric(12, 2) generated always as (quantity * unit_cost) stored,
  supplier text not null default '',
  notes text not null default '',
  purchased_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null default '',
  customer_phone text not null default '',
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  coupon_code text,
  total numeric(12, 2) not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmada', 'cancelada')),
  source text not null default 'admin' check (source in ('tienda', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) generated always as (quantity * unit_price) stored
);

create table if not exists discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(12, 2) not null default 0,
  scope text not null default 'all' check (scope in ('all', 'category', 'product')),
  scope_value text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(12, 2) not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  min_purchase numeric(12, 2) not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Triggers: el stock se ajusta solo
-- ------------------------------------------------------------

-- Una compra registrada aumenta el stock del producto
create or replace function fn_purchase_increases_stock()
returns trigger as $$
begin
  update products set stock = stock + new.quantity where id = new.product_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_purchase_increases_stock on purchases;
create trigger trg_purchase_increases_stock
  after insert on purchases
  for each row execute function fn_purchase_increases_stock();

-- Un item de venta descuenta stock al crearse
create or replace function fn_sale_item_decreases_stock()
returns trigger as $$
begin
  if new.product_id is not null then
    update products set stock = stock - new.quantity where id = new.product_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sale_item_decreases_stock on sale_items;
create trigger trg_sale_item_decreases_stock
  after insert on sale_items
  for each row execute function fn_sale_item_decreases_stock();

-- Si una venta se cancela, se devuelve el stock de sus items (una sola vez)
create or replace function fn_sale_cancel_restores_stock()
returns trigger as $$
begin
  if new.status = 'cancelada' and old.status <> 'cancelada' then
    update products p
      set stock = p.stock + si.quantity
      from sale_items si
      where si.sale_id = new.id and si.product_id = p.id;
  elsif old.status = 'cancelada' and new.status <> 'cancelada' then
    update products p
      set stock = p.stock - si.quantity
      from sale_items si
      where si.sale_id = new.id and si.product_id = p.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sale_cancel_restores_stock on sales;
create trigger trg_sale_cancel_restores_stock
  after update of status on sales
  for each row execute function fn_sale_cancel_restores_stock();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table products enable row level security;
alter table purchases enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table discounts enable row level security;
alter table coupons enable row level security;

-- products: lectura pública de activos, escritura solo autenticado
create policy "products_public_read" on products
  for select using (active = true or auth.role() = 'authenticated');
create policy "products_admin_write" on products
  for insert to authenticated with check (true);
create policy "products_admin_update" on products
  for update to authenticated using (true);
create policy "products_admin_delete" on products
  for delete to authenticated using (true);

-- discounts / coupons: lectura pública de activos, escritura solo autenticado
create policy "discounts_public_read" on discounts
  for select using (active = true or auth.role() = 'authenticated');
create policy "discounts_admin_write" on discounts
  for insert to authenticated with check (true);
create policy "discounts_admin_update" on discounts
  for update to authenticated using (true);
create policy "discounts_admin_delete" on discounts
  for delete to authenticated using (true);

create policy "coupons_public_read" on coupons
  for select using (active = true or auth.role() = 'authenticated');
create policy "coupons_admin_write" on coupons
  for insert to authenticated with check (true);
create policy "coupons_admin_update" on coupons
  for update to authenticated using (true);
create policy "coupons_admin_delete" on coupons
  for delete to authenticated using (true);

-- sales / sale_items: cualquiera puede CREAR un pedido desde la tienda,
-- pero solo el admin puede leer/editar/borrar
create policy "sales_public_insert" on sales
  for insert with check (true);
create policy "sales_admin_read" on sales
  for select to authenticated using (true);
create policy "sales_admin_update" on sales
  for update to authenticated using (true);
create policy "sales_admin_delete" on sales
  for delete to authenticated using (true);

create policy "sale_items_public_insert" on sale_items
  for insert with check (true);
create policy "sale_items_admin_read" on sale_items
  for select to authenticated using (true);
create policy "sale_items_admin_update" on sale_items
  for update to authenticated using (true);
create policy "sale_items_admin_delete" on sale_items
  for delete to authenticated using (true);

-- purchases: todo solo autenticado
create policy "purchases_admin_all" on purchases
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- Datos iniciales: los 6 productos que ya estaban en la tienda
-- ------------------------------------------------------------

insert into products (name, category, description, price, cost, volume, color, stock, min_stock, active)
values
  ('Ámbar Nocturno', 'Amaderado', 'Notas de sándalo, vainilla y ámbar. Ideal para la noche.', 185000, 0, '50 ml', '#7c4a2d', 20, 5, true),
  ('Brisa Cítrica', 'Cítrico', 'Bergamota, limón y toques de menta. Fresca y ligera.', 145000, 0, '50 ml', '#d9a441', 20, 5, true),
  ('Flor Silvestre', 'Floral', 'Jazmín, peonía y un fondo suave de almizcle.', 165000, 0, '50 ml', '#e88fb0', 20, 5, true),
  ('Cuero & Especias', 'Oriental', 'Cuero, canela y pimienta negra. Intensa y envolvente.', 210000, 0, '100 ml', '#5a3825', 20, 5, true),
  ('Agua Marina', 'Acuático', 'Notas marinas, sal y un toque de pepino.', 155000, 0, '50 ml', '#3f7ea6', 20, 5, true),
  ('Vainilla Dulce', 'Gourmand', 'Vainilla, caramelo y haba tonka. Cálida y reconfortante.', 175000, 0, '75 ml', '#c9974c', 20, 5, true)
on conflict do nothing;
