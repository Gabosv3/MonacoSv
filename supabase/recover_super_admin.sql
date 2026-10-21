-- ============================================================
-- MonacoSV · Recuperar el acceso de Super Administrador
-- Pega este archivo en Supabase → SQL Editor → Run.
-- El SQL Editor corre con permisos de dueño, así que no depende de los
-- roles del panel. Se puede ejecutar más de una vez.
--
-- 1) Devuelve el rol Super Administrador a tu correo y activa la cuenta.
-- 2) Agrega un seguro: la base de datos ya no permitirá quitar ni
--    desactivar al último Super Administrador activo.
-- ============================================================

-- 1) Recuperar acceso  ← cambia el correo si usas otro
do $$
declare
  admin_email text := 'gabriel503.alegria@gmail.com';
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(admin_email);
  if uid is null then
    raise exception 'No existe un usuario con el correo % en Authentication → Users', admin_email;
  end if;

  insert into profiles (id, email) values (uid, admin_email) on conflict (id) do nothing;
  update profiles set active = true where id = uid;

  insert into user_roles (user_id, role_id)
  select uid, r.id from roles r where r.name = 'super-admin'
  on conflict do nothing;
end $$;

-- 2) Seguro contra quedarse sin Super Administrador
create or replace function ensure_super_admin_remains()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  super_id uuid;
  remaining integer;
begin
  select id into super_id from roles where name = 'super-admin';
  if super_id is null then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'user_roles' and tg_op = 'DELETE' then
    if old.role_id <> super_id then return old; end if;
    select count(*) into remaining
    from user_roles ur join profiles p on p.id = ur.user_id
    where ur.role_id = super_id and p.active and ur.user_id <> old.user_id;
    if remaining = 0 then
      raise exception 'No se puede quitar al último Super Administrador activo.';
    end if;
    return old;
  end if;

  if tg_table_name = 'profiles' and tg_op = 'UPDATE' and old.active and not new.active then
    if exists (select 1 from user_roles where user_id = old.id and role_id = super_id) then
      select count(*) into remaining
      from user_roles ur join profiles p on p.id = ur.user_id
      where ur.role_id = super_id and p.active and ur.user_id <> old.id;
      if remaining = 0 then
        raise exception 'No se puede desactivar al último Super Administrador.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists keep_super_admin_on_roles on user_roles;
create trigger keep_super_admin_on_roles
  before delete on user_roles
  for each row execute function ensure_super_admin_remains();

drop trigger if exists keep_super_admin_on_profiles on profiles;
create trigger keep_super_admin_on_profiles
  before update of active on profiles
  for each row execute function ensure_super_admin_remains();
