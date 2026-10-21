-- ============================================================
-- MonacoSV · Pedidos con entrega y encomendistas
-- Ejecútalo DESPUÉS de roles_permissions.sql.
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
-- Agrega a "sales" los datos de entrega (envío o retiro, departamento,
-- municipio, dirección, fecha y hora, encomendista, factura) y un nuevo
-- estado "entregada". Crea la tabla de encomendistas.
-- ============================================================

-- ------------------------------------------------------------
-- Encomendistas (quien entrega el pedido)
-- ------------------------------------------------------------

create table if not exists couriers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text not null default '',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Datos de entrega en los pedidos
-- ------------------------------------------------------------

alter table sales add column if not exists delivery_method text not null default 'envio';
alter table sales add column if not exists department text not null default '';
alter table sales add column if not exists municipality text not null default '';
alter table sales add column if not exists address text not null default '';
alter table sales add column if not exists notes text not null default '';
alter table sales add column if not exists delivery_date date;
alter table sales add column if not exists delivery_window text not null default '';
alter table sales add column if not exists courier_id uuid references couriers(id) on delete set null;
alter table sales add column if not exists invoiced boolean not null default false;
alter table sales add column if not exists invoiced_at timestamptz;

alter table sales drop constraint if exists sales_delivery_method_check;
alter table sales add constraint sales_delivery_method_check check (delivery_method in ('envio', 'retiro'));

-- Estados: pendiente → confirmada → entregada (o cancelada)
alter table sales drop constraint if exists sales_status_check;
alter table sales add constraint sales_status_check
  check (status in ('pendiente', 'confirmada', 'entregada', 'cancelada'));

create index if not exists sales_status_idx on sales (status);
create index if not exists sales_delivery_date_idx on sales (delivery_date);

-- Un pedido que llega desde la tienda (sin sesión) siempre entra como
-- pendiente, sin encomendista ni factura: un cliente no puede "confirmarse"
-- su propio pedido.
create or replace function sanitize_public_sale()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    new.status := 'pendiente';
    new.source := 'tienda';
    new.courier_id := null;
    new.invoiced := false;
    new.invoiced_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sanitize_public_sale_trg on sales;
create trigger sanitize_public_sale_trg
  before insert on sales
  for each row execute function sanitize_public_sale();

-- ------------------------------------------------------------
-- Permisos nuevos
-- ------------------------------------------------------------

insert into permissions (name, label, module, sort) values
  ('sales.create',    'Crear pedidos desde el panel',       'Ventas', 42),
  ('couriers.manage', 'Gestionar encomendistas',            'Ventas', 43)
on conflict (name) do update
  set label = excluded.label, module = excluded.module, sort = excluded.sort;

-- Reciben los permisos nuevos de entrada (si esos roles existen)
insert into role_permissions (role_id, permission)
select r.id, p.name
from roles r, permissions p
where p.name in ('sales.create', 'couriers.manage')
  and r.name in ('super-admin', 'admin')
on conflict do nothing;

insert into role_permissions (role_id, permission)
select r.id, 'sales.create'
from roles r
where r.name = 'vendedor'
on conflict do nothing;

-- ------------------------------------------------------------
-- RLS de encomendistas
-- ------------------------------------------------------------

alter table couriers enable row level security;

drop policy if exists "couriers_read" on couriers;
drop policy if exists "couriers_insert" on couriers;
drop policy if exists "couriers_update" on couriers;
drop policy if exists "couriers_delete" on couriers;

create policy "couriers_read" on couriers
  for select to authenticated using (has_permission('sales.view'));
create policy "couriers_insert" on couriers
  for insert to authenticated with check (has_permission('couriers.manage'));
create policy "couriers_update" on couriers
  for update to authenticated using (has_permission('couriers.manage'));
create policy "couriers_delete" on couriers
  for delete to authenticated using (has_permission('couriers.manage'));

-- ============================================================
-- LOGÍSTICA: número de pedido, facturas, paqueteras y despachos
-- ============================================================

-- Número de pedido legible (#1, #2…); los pedidos existentes se numeran solos
alter table sales add column if not exists order_number bigint generated by default as identity (start with 1);
create unique index if not exists sales_order_number_idx on sales (order_number);

-- Factura: se emite una vez por pedido (FAC-A1, FAC-A2…)
alter table sales add column if not exists invoice_number text;
create sequence if not exists invoice_seq start 1;

create or replace function invoice_sale(p_sale_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  num text;
begin
  if not has_permission('sales.update') then
    raise exception 'No tienes permiso para facturar pedidos.';
  end if;
  select invoice_number into num from sales where id = p_sale_id;
  if num is not null then
    return num; -- ya estaba facturado
  end if;
  num := 'FAC-A' || nextval('invoice_seq');
  update sales set invoiced = true, invoiced_at = now(), invoice_number = num where id = p_sale_id;
  return num;
end;
$$;
grant execute on function invoice_sale(uuid) to authenticated;

-- Paqueteras (empresas de envío: C807, Cargo Express…)
create table if not exists carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text not null default '',
  tracking_url text not null default '',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Despachos: el envío de un pedido con su paquetera y guía
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  carrier_id uuid references carriers(id) on delete set null,
  tracking_number text not null default '',
  status text not null default 'preparando' check (status in ('preparando', 'enviado', 'entregado', 'devuelto')),
  cost numeric(12, 2) not null default 0,
  notes text not null default '',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists shipments_sale_idx on shipments (sale_id);
create index if not exists shipments_status_idx on shipments (status);

-- Fechas automáticas según el estado del despacho
create or replace function fn_shipment_dates()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'enviado' and new.shipped_at is null then
    new.shipped_at := now();
  end if;
  if new.status = 'entregado' then
    if new.shipped_at is null then new.shipped_at := now(); end if;
    if new.delivered_at is null then new.delivered_at := now(); end if;
  end if;
  if new.status in ('preparando', 'enviado', 'devuelto') then
    new.delivered_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists shipment_dates_trg on shipments;
create trigger shipment_dates_trg
  before insert or update of status on shipments
  for each row execute function fn_shipment_dates();

-- Al entregarse un despacho, el pedido pasa a "entregada"
create or replace function fn_shipment_delivered()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'entregado' and (tg_op = 'INSERT' or old.status is distinct from 'entregado') then
    update sales set status = 'entregada' where id = new.sale_id and status = 'confirmada';
  end if;
  return new;
end;
$$;

drop trigger if exists shipment_delivered_trg on shipments;
create trigger shipment_delivered_trg
  after insert or update of status on shipments
  for each row execute function fn_shipment_delivered();

insert into permissions (name, label, module, sort) values
  ('shipments.view',   'Ver logística y despachos',              'Logística', 44),
  ('shipments.manage', 'Gestionar despachos y paqueteras',        'Logística', 45)
on conflict (name) do update
  set label = excluded.label, module = excluded.module, sort = excluded.sort;

insert into role_permissions (role_id, permission)
select r.id, p.name
from roles r, permissions p
where p.name in ('shipments.view', 'shipments.manage') and r.name in ('super-admin', 'admin')
on conflict do nothing;

insert into role_permissions (role_id, permission)
select r.id, 'shipments.view' from roles r where r.name = 'vendedor'
on conflict do nothing;

alter table carriers enable row level security;
alter table shipments enable row level security;

drop policy if exists "carriers_read" on carriers;
drop policy if exists "carriers_insert" on carriers;
drop policy if exists "carriers_update" on carriers;
drop policy if exists "carriers_delete" on carriers;
create policy "carriers_read" on carriers
  for select to authenticated using (has_permission('shipments.view') or has_permission('sales.view'));
create policy "carriers_insert" on carriers
  for insert to authenticated with check (has_permission('shipments.manage'));
create policy "carriers_update" on carriers
  for update to authenticated using (has_permission('shipments.manage'));
create policy "carriers_delete" on carriers
  for delete to authenticated using (has_permission('shipments.manage'));

drop policy if exists "shipments_read" on shipments;
drop policy if exists "shipments_insert" on shipments;
drop policy if exists "shipments_update" on shipments;
drop policy if exists "shipments_delete" on shipments;
create policy "shipments_read" on shipments
  for select to authenticated using (has_permission('shipments.view'));
create policy "shipments_insert" on shipments
  for insert to authenticated with check (has_permission('shipments.manage'));
create policy "shipments_update" on shipments
  for update to authenticated using (has_permission('shipments.manage'));
create policy "shipments_delete" on shipments
  for delete to authenticated using (has_permission('shipments.manage'));

notify pgrst, 'reload schema';
