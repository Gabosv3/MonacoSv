-- ============================================================
-- MonacoSV · Permisos para subir fotos de productos
-- Ejecútalo DESPUÉS de roles_permissions.sql (usa has_permission).
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
-- Usa tu bucket "Lociones" (si no existe, lo crea público, máx. 5 MB).
-- Cualquiera puede VER las fotos (las usa la tienda); solo quien tenga
-- permiso de crear o editar productos puede SUBIR, reemplazar o borrar.
--
-- Si tu bucket se llama distinto, cambia 'Lociones' por su nombre exacto
-- aquí (5 veces) y en src/admin/api.js (constante IMAGE_BUCKET).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('Lociones', 'Lociones', true, 5242880)
on conflict (id) do update set public = true;

-- limpia políticas de versiones anteriores de este archivo
drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_insert" on storage.objects;
drop policy if exists "product_images_update" on storage.objects;
drop policy if exists "product_images_delete" on storage.objects;

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'Lociones');

create policy "product_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'Lociones'
    and (has_permission('products.create') or has_permission('products.edit'))
  );

create policy "product_images_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'Lociones' and has_permission('products.edit'));

create policy "product_images_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'Lociones' and has_permission('products.edit'));
