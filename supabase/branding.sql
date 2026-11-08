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

-- El bucket admitía 5 MB por archivo: se sube a 30 MB para el video de la intro.
-- (El plan gratuito de Supabase permite hasta 50 MB por archivo.)
update storage.buckets set file_size_limit = 31457280 where id = 'Lociones';
