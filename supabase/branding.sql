-- ============================================================
-- MonacoSV · Permite subir el logo desde Ajustes
-- Pega este archivo en Supabase → SQL Editor → Run (se puede repetir).
-- Quien tenga el permiso "settings.edit" puede subir a la carpeta branding/.
-- ============================================================
drop policy if exists "branding_insert" on storage.objects;
create policy "branding_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'Lociones'
    and name like 'branding/%'
    and has_permission('settings.edit')
  );
