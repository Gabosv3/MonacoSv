-- ============================================================
-- MonacoSV · Categorías administrables
-- Ejecútalo DESPUÉS de roles_permissions.sql (usa su tabla de permisos).
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
-- Cada categoría tiene un género (hombre / mujer / unisex): es lo que
-- decide si sus productos salen en "Para él" o en "Para ella".
-- ============================================================

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  gender text not null default 'hombre' check (gender in ('hombre', 'mujer', 'unisex')),
  description text not null default '',
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- Categorías iniciales: las que ya usan tus productos + las dos base
insert into categories (name, gender)
select distinct p.category,
  case when p.category ~* '(mujer|ella|dama|femen)' then 'mujer'
       when p.category ~* 'unisex' then 'unisex'
       else 'hombre' end
from products p
where coalesce(p.category, '') <> ''
on conflict (name) do nothing;

insert into categories (name, gender, sort) values
  ('Bestias Árabes', 'hombre', 1),
  ('Para mujer', 'mujer', 2)
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- Permisos nuevos
-- ------------------------------------------------------------

insert into permissions (name, label, module, sort) values
  ('categories.view',   'Ver categorías',      'Categorías', 25),
  ('categories.create', 'Crear categorías',    'Categorías', 26),
  ('categories.edit',   'Editar categorías',   'Categorías', 27),
  ('categories.delete', 'Eliminar categorías', 'Categorías', 28)
on conflict (name) do update
  set label = excluded.label, module = excluded.module, sort = excluded.sort;

-- Super Administrador y Administrador las reciben de entrada
insert into role_permissions (role_id, permission)
select r.id, p.name
from roles r, permissions p
where r.name in ('super-admin', 'admin') and p.module = 'Categorías'
on conflict do nothing;

-- ------------------------------------------------------------
-- RLS: la tienda lee las activas; el panel escribe por permiso
-- ------------------------------------------------------------

alter table categories enable row level security;

drop policy if exists "categories_public_read" on categories;
drop policy if exists "categories_insert" on categories;
drop policy if exists "categories_update" on categories;
drop policy if exists "categories_delete" on categories;

create policy "categories_public_read" on categories
  for select using (active = true or has_permission('categories.view'));
create policy "categories_insert" on categories
  for insert to authenticated with check (has_permission('categories.create'));
create policy "categories_update" on categories
  for update to authenticated using (has_permission('categories.edit'));
create policy "categories_delete" on categories
  for delete to authenticated using (has_permission('categories.delete'));

notify pgrst, 'reload schema';
