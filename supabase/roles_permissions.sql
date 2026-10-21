-- ============================================================
-- MonacoSV · Roles, permisos y usuarios (estilo Spatie)
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
-- Modelo:
--   permissions       lista fija de permisos ("products.edit", …)
--   roles             Super Administrador, Administrador, Vendedor, …
--   role_permissions  qué permisos tiene cada rol
--   profiles          un perfil por usuario de Supabase Auth
--   user_roles        qué roles tiene cada usuario (puede tener varios)
--
-- El rol "super-admin" tiene todos los permisos siempre (como el
-- Gate::before de Spatie). Los usuarios que ya existen hoy quedan
-- como Super Administrador para que nadie pierda el acceso.
-- ============================================================

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text not null,
  description text not null default '',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists permissions (
  name text primary key,
  label text not null,
  module text not null,
  sort integer not null default 0
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission text not null references permissions(name) on delete cascade on update cascade,
  primary key (role_id, permission)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- ------------------------------------------------------------
-- Permisos
-- ------------------------------------------------------------

insert into permissions (name, label, module, sort) values
  ('dashboard.view',  'Ver el dashboard',        'Dashboard',  10),
  ('products.view',   'Ver productos',           'Productos',  20),
  ('products.create', 'Crear productos',         'Productos',  21),
  ('products.edit',   'Editar productos',        'Productos',  22),
  ('products.delete', 'Eliminar productos',      'Productos',  23),
  ('purchases.view',  'Ver compras',             'Compras',    30),
  ('purchases.create','Registrar compras',       'Compras',    31),
  ('sales.view',      'Ver pedidos y ventas',    'Ventas',     40),
  ('sales.update',    'Confirmar o cancelar pedidos', 'Ventas', 41),
  ('discounts.view',  'Ver descuentos',          'Descuentos', 50),
  ('discounts.create','Crear descuentos',        'Descuentos', 51),
  ('discounts.edit',  'Editar descuentos',       'Descuentos', 52),
  ('discounts.delete','Eliminar descuentos',     'Descuentos', 53),
  ('coupons.view',    'Ver cupones',             'Cupones',    60),
  ('coupons.create',  'Crear cupones',           'Cupones',    61),
  ('coupons.edit',    'Editar cupones',          'Cupones',    62),
  ('coupons.delete',  'Eliminar cupones',        'Cupones',    63),
  ('users.view',      'Ver usuarios',            'Usuarios',   70),
  ('users.create',    'Crear usuarios',          'Usuarios',   71),
  ('users.edit',      'Editar usuarios y asignar roles', 'Usuarios', 72),
  ('roles.view',      'Ver roles y permisos',    'Roles',      80),
  ('roles.create',    'Crear roles',             'Roles',      81),
  ('roles.edit',      'Editar roles y sus permisos', 'Roles',  82),
  ('roles.delete',    'Eliminar roles',          'Roles',      83)
on conflict (name) do update
  set label = excluded.label, module = excluded.module, sort = excluded.sort;

-- ------------------------------------------------------------
-- Roles iniciales (no pisa los que ya hayas editado)
-- ------------------------------------------------------------

insert into roles (name, label, description, is_system) values
  ('super-admin', 'Super Administrador', 'Acceso total. No se puede editar ni borrar.', true),
  ('admin',       'Administrador',       'Gestiona tienda, ventas y marketing. Sin acceso a usuarios ni roles.', false),
  ('vendedor',    'Vendedor',            'Atiende pedidos y consulta productos.', false),
  ('inventario',  'Inventario',          'Maneja productos y compras.', false),
  ('marketing',   'Marketing',           'Crea descuentos y cupones.', false)
on conflict (name) do nothing;

-- Permisos por defecto de cada rol: solo se asignan la primera vez
-- (si el rol ya tiene permisos, se respetan los cambios que hayas hecho).
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('super-admin', array(select name from permissions)),
      ('admin', array[
        'dashboard.view',
        'products.view','products.create','products.edit','products.delete',
        'purchases.view','purchases.create',
        'sales.view','sales.update',
        'discounts.view','discounts.create','discounts.edit','discounts.delete',
        'coupons.view','coupons.create','coupons.edit','coupons.delete'
      ]),
      ('vendedor', array['dashboard.view','products.view','sales.view','sales.update','coupons.view']),
      ('inventario', array['dashboard.view','products.view','products.create','products.edit','purchases.view','purchases.create']),
      ('marketing', array[
        'dashboard.view','products.view',
        'discounts.view','discounts.create','discounts.edit','discounts.delete',
        'coupons.view','coupons.create','coupons.edit','coupons.delete'
      ])
    ) as t(role_name, perms)
  loop
    if not exists (
      select 1 from role_permissions rp join roles ro on ro.id = rp.role_id where ro.name = r.role_name
    ) then
      insert into role_permissions (role_id, permission)
      select ro.id, p from roles ro, unnest(r.perms) as p where ro.name = r.role_name
      on conflict do nothing;
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- Funciones de permisos
-- ------------------------------------------------------------

create or replace function is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    join profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and r.name = 'super-admin' and p.active
  );
$$;

create or replace function has_permission(perm text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    is_super_admin()
    or exists (
      select 1
      from user_roles ur
      join role_permissions rp on rp.role_id = ur.role_id
      join profiles p on p.id = ur.user_id
      where ur.user_id = auth.uid() and p.active and rp.permission = perm
    ),
    false
  );
$$;

-- Lo que usa el panel al iniciar sesión: roles y permisos del usuario actual
create or replace function my_access()
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof profiles;
  sup boolean;
begin
  select * into prof from profiles where id = uid;
  if not found then
    return json_build_object('active', false, 'super', false, 'roles', '[]'::json, 'permissions', '[]'::json, 'full_name', '');
  end if;
  sup := is_super_admin();
  return json_build_object(
    'active', prof.active,
    'super', sup,
    'full_name', prof.full_name,
    'roles', coalesce((
      select json_agg(json_build_object('name', r.name, 'label', r.label))
      from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = uid
    ), '[]'::json),
    'permissions', case
      when not prof.active then '[]'::json
      when sup then (select coalesce(json_agg(name), '[]'::json) from permissions)
      else coalesce((
        select json_agg(distinct rp.permission)
        from user_roles ur join role_permissions rp on rp.role_id = ur.role_id
        where ur.user_id = uid
      ), '[]'::json)
    end
  );
end;
$$;

grant execute on function is_super_admin() to authenticated;
grant execute on function has_permission(text) to anon, authenticated;
grant execute on function my_access() to authenticated;

-- ------------------------------------------------------------
-- Perfil automático al crearse un usuario en Supabase Auth
-- ------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Usuarios que ya existen: reciben perfil y quedan como Super Administrador
insert into profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', '')
from auth.users u
on conflict (id) do nothing;

insert into user_roles (user_id, role_id)
select p.id, r.id
from profiles p, roles r
where r.name = 'super-admin'
  and not exists (select 1 from user_roles ur where ur.user_id = p.id)
on conflict do nothing;

-- ------------------------------------------------------------
-- El stock debe poder ajustarse aunque quien compra no tenga sesión
-- (los triggers pasan a ejecutarse con permisos del dueño)
-- ------------------------------------------------------------

alter function fn_purchase_increases_stock() security definer set search_path = public;
alter function fn_sale_item_decreases_stock() security definer set search_path = public;
alter function fn_sale_cancel_restores_stock() security definer set search_path = public;

-- ------------------------------------------------------------
-- RLS de las tablas nuevas
-- ------------------------------------------------------------

alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;

drop policy if exists "roles_read" on roles;
drop policy if exists "roles_insert" on roles;
drop policy if exists "roles_update" on roles;
drop policy if exists "roles_delete" on roles;
create policy "roles_read" on roles
  for select to authenticated using (has_permission('roles.view') or has_permission('users.view'));
create policy "roles_insert" on roles
  for insert to authenticated with check (has_permission('roles.create') and not is_system);
create policy "roles_update" on roles
  for update to authenticated
  using (has_permission('roles.edit') and not is_system)
  with check (not is_system);
create policy "roles_delete" on roles
  for delete to authenticated using (has_permission('roles.delete') and not is_system);

drop policy if exists "permissions_read" on permissions;
create policy "permissions_read" on permissions
  for select to authenticated using (has_permission('roles.view') or has_permission('users.view'));

drop policy if exists "role_permissions_read" on role_permissions;
drop policy if exists "role_permissions_insert" on role_permissions;
drop policy if exists "role_permissions_delete" on role_permissions;
create policy "role_permissions_read" on role_permissions
  for select to authenticated using (has_permission('roles.view') or has_permission('users.view'));
create policy "role_permissions_insert" on role_permissions
  for insert to authenticated
  with check (
    (has_permission('roles.edit') or has_permission('roles.create'))
    and not exists (select 1 from roles r where r.id = role_id and r.is_system)
  );
create policy "role_permissions_delete" on role_permissions
  for delete to authenticated
  using (
    has_permission('roles.edit')
    and not exists (select 1 from roles r where r.id = role_id and r.is_system)
  );

drop policy if exists "profiles_read" on profiles;
drop policy if exists "profiles_update" on profiles;
create policy "profiles_read" on profiles
  for select to authenticated using (id = auth.uid() or has_permission('users.view'));
create policy "profiles_update" on profiles
  for update to authenticated using (has_permission('users.edit'));

drop policy if exists "user_roles_read" on user_roles;
drop policy if exists "user_roles_insert" on user_roles;
drop policy if exists "user_roles_delete" on user_roles;
create policy "user_roles_read" on user_roles
  for select to authenticated using (user_id = auth.uid() or has_permission('users.view'));
create policy "user_roles_insert" on user_roles
  for insert to authenticated
  with check (
    has_permission('users.edit')
    and (is_super_admin() or not exists (select 1 from roles r where r.id = role_id and r.name = 'super-admin'))
  );
create policy "user_roles_delete" on user_roles
  for delete to authenticated
  using (
    has_permission('users.edit')
    and (is_super_admin() or not exists (select 1 from roles r where r.id = role_id and r.name = 'super-admin'))
  );

-- ------------------------------------------------------------
-- RLS del resto de tablas: ahora por permiso en vez de "cualquier
-- usuario autenticado". La lectura pública de la tienda no cambia.
-- ------------------------------------------------------------

-- products
drop policy if exists "products_public_read" on products;
drop policy if exists "products_admin_write" on products;
drop policy if exists "products_admin_update" on products;
drop policy if exists "products_admin_delete" on products;
create policy "products_public_read" on products
  for select using (active = true or has_permission('products.view'));
create policy "products_admin_write" on products
  for insert to authenticated with check (has_permission('products.create'));
create policy "products_admin_update" on products
  for update to authenticated using (has_permission('products.edit'));
create policy "products_admin_delete" on products
  for delete to authenticated using (has_permission('products.delete'));

-- discounts
drop policy if exists "discounts_public_read" on discounts;
drop policy if exists "discounts_admin_write" on discounts;
drop policy if exists "discounts_admin_update" on discounts;
drop policy if exists "discounts_admin_delete" on discounts;
create policy "discounts_public_read" on discounts
  for select using (active = true or has_permission('discounts.view'));
create policy "discounts_admin_write" on discounts
  for insert to authenticated with check (has_permission('discounts.create'));
create policy "discounts_admin_update" on discounts
  for update to authenticated using (has_permission('discounts.edit'));
create policy "discounts_admin_delete" on discounts
  for delete to authenticated using (has_permission('discounts.delete'));

-- coupons
drop policy if exists "coupons_public_read" on coupons;
drop policy if exists "coupons_admin_write" on coupons;
drop policy if exists "coupons_admin_update" on coupons;
drop policy if exists "coupons_admin_delete" on coupons;
create policy "coupons_public_read" on coupons
  for select using (active = true or has_permission('coupons.view'));
create policy "coupons_admin_write" on coupons
  for insert to authenticated with check (has_permission('coupons.create'));
create policy "coupons_admin_update" on coupons
  for update to authenticated using (has_permission('coupons.edit'));
create policy "coupons_admin_delete" on coupons
  for delete to authenticated using (has_permission('coupons.delete'));

-- sales y sale_items (cualquiera puede CREAR un pedido desde la tienda)
drop policy if exists "sales_admin_read" on sales;
drop policy if exists "sales_admin_update" on sales;
drop policy if exists "sales_admin_delete" on sales;
create policy "sales_admin_read" on sales
  for select to authenticated using (has_permission('sales.view'));
create policy "sales_admin_update" on sales
  for update to authenticated using (has_permission('sales.update'));
create policy "sales_admin_delete" on sales
  for delete to authenticated using (is_super_admin());

drop policy if exists "sale_items_admin_read" on sale_items;
drop policy if exists "sale_items_admin_update" on sale_items;
drop policy if exists "sale_items_admin_delete" on sale_items;
create policy "sale_items_admin_read" on sale_items
  for select to authenticated using (has_permission('sales.view'));
create policy "sale_items_admin_update" on sale_items
  for update to authenticated using (has_permission('sales.update'));
create policy "sale_items_admin_delete" on sale_items
  for delete to authenticated using (is_super_admin());

-- purchases
drop policy if exists "purchases_admin_all" on purchases;
drop policy if exists "purchases_read" on purchases;
drop policy if exists "purchases_insert" on purchases;
drop policy if exists "purchases_delete" on purchases;
create policy "purchases_read" on purchases
  for select to authenticated using (has_permission('purchases.view'));
create policy "purchases_insert" on purchases
  for insert to authenticated with check (has_permission('purchases.create'));
create policy "purchases_delete" on purchases
  for delete to authenticated using (is_super_admin());

-- ------------------------------------------------------------
-- Avisa a la API de Supabase que hay tablas y funciones nuevas
-- (sin esto puede aparecer «Could not find the table … in the schema cache»)
-- ------------------------------------------------------------
notify pgrst, 'reload schema';
