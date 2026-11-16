-- ============================================================
-- DUUMVIR · Varias fotos por fragancia (galería)
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
-- Ejecútalo ANTES de performance.sql (o, si ya lo ejecutaste, ahora: actualiza la vista).
--
--   products.images   fotos adicionales de la fragancia (direcciones de las fotos subidas),
--                     en el orden en que se muestran en la ficha, DESPUÉS de la foto principal
--                     (image_url). El panel las guarda iguales en todas las presentaciones.
--   products_public   la vista que lee la tienda, ahora con esa columna.
-- ============================================================

alter table products add column if not exists images text[] not null default '{}';

-- tope de seguridad: una fragancia no puede acumular fotos sin límite
alter table products drop constraint if exists products_images_max;
alter table products add constraint products_images_max check (cardinality(images) <= 12);

-- La vista pública (el catálogo sin costos) con la columna nueva. Una vista solo puede
-- ganar columnas al final, por eso `images` va última.
create or replace view products_public as
select id, name, volume, category, price, sale_price, tags, brand, kind, fixation,
       highlight, code, stock, active, color, image_url, description, images
from products
where active;

grant select on products_public to anon, authenticated;

notify pgrst, 'reload schema';
