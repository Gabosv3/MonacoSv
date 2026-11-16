-- ============================================================
-- DUUMVIR · Valoraciones abiertas a cualquier persona con cuenta
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
-- Requiere que ya se haya ejecutado product_experience.sql.
--
-- Antes: solo valoraba quien tenía un pedido confirmado o entregado de la fragancia.
-- Ahora: valora cualquier persona con cuenta (cliente o personal), una vez por fragancia.
-- La etiqueta «Compra verificada» la sigue poniendo el servidor, solo a quien sí compró:
-- el visitante nunca puede marcarla.
--
-- Para volver a exigir una compra: cambia `select false` por `select true` en
-- reviews_require_purchase() (abajo) y vuelve a ejecutar este archivo.
--
-- Moderación: el equipo puede ocultar una valoración cambiando su «status» a 'oculta'
-- en Table Editor → product_reviews (o borrarla). Las ocultas dejan de mostrarse.
-- ============================================================

-- ¿Se exige haber comprado para valorar? (un solo lugar para cambiarlo)
create or replace function reviews_require_purchase()
returns boolean
language sql immutable
as $$ select false $$;
revoke all on function reviews_require_purchase() from public, anon, authenticated;

-- ¿Puede valorar quien está viendo la ficha? Devuelve también su valoración, si ya tiene una,
-- y si es comprador (para decirle si su valoración llevará la etiqueta de compra verificada).
create or replace function my_review_status(p_name text)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  mine json;
  bought boolean := false;
begin
  if uid is null then
    return json_build_object('can_review', false, 'reason', 'sin_sesion');
  end if;
  -- una cuenta sin ficha de cliente (por ejemplo, del personal) también puede valorar:
  -- la ficha se crea al publicar
  select id into cid from customers where user_id = uid;
  if cid is not null then
    select json_build_object('rating', rating, 'longevity', longevity, 'projection', projection, 'comment', comment, 'status', status)
      into mine
    from product_reviews
    where customer_id = cid and lower(product_name) = lower(trim(p_name));
    bought := customer_bought(cid, p_name);
  end if;
  if reviews_require_purchase() and not bought then
    return json_build_object('can_review', false, 'reason', 'sin_compra', 'review', mine);
  end if;
  return json_build_object('can_review', true, 'reason', 'ok', 'verified_buyer', bought, 'review', mine);
end;
$$;
revoke execute on function my_review_status(text) from public, anon;
grant execute on function my_review_status(text) to authenticated;

-- Publicar o actualizar la valoración propia. Toda la validación ocurre aquí.
create or replace function submit_review(
  p_name text,
  p_rating int,
  p_comment text default '',
  p_longevity int default null,
  p_projection int default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  v_name text;
  v_bought boolean;
  v_person text;
  -- los aspectos opcionales fuera de rango se guardan como "sin dato"
  v_long int := case when p_longevity between 1 and 5 then p_longevity end;
  v_proj int := case when p_projection between 1 and 5 then p_projection end;
  -- freno al abuso: valoraciones NUEVAS por persona al día (editar la propia no cuenta)
  c_daily_max constant integer := 10;
begin
  if uid is null then
    raise exception 'Inicia sesión para valorar esta fragancia.';
  end if;

  -- nombre de la persona: el de su perfil o el que dio al registrarse
  select coalesce(
    (select nullif(trim(full_name), '') from profiles where id = uid),
    (select nullif(trim(coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')), '') from auth.users where id = uid),
    ''
  ) into v_person;

  select id into cid from customers where user_id = uid;
  if cid is null then
    insert into customers (name, email, source, user_id)
    values (v_person, coalesce((select email from auth.users where id = uid), ''), 'tienda', uid)
    on conflict (user_id) where user_id is not null do nothing
    returning id into cid;
    if cid is null then
      select id into cid from customers where user_id = uid;
    end if;
  elsif v_person <> '' then
    update customers set name = v_person where id = cid and name = '';
  end if;

  -- la fragancia debe existir en el catálogo; se guarda con su nombre oficial
  select name into v_name from products where lower(name) = lower(trim(p_name)) limit 1;
  if v_name is null then
    raise exception 'No encontramos esa fragancia.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Elige una calificación de 1 a 5 estrellas.';
  end if;

  v_bought := customer_bought(cid, v_name);
  if reviews_require_purchase() and not v_bought then
    raise exception 'Solo quienes compraron esta fragancia pueden valorarla.';
  end if;

  if not exists (select 1 from product_reviews where customer_id = cid and lower(product_name) = lower(v_name))
     and (select count(*) from product_reviews where customer_id = cid and created_at > now() - interval '1 day') >= c_daily_max then
    raise exception 'Hoy ya publicaste varias valoraciones. Inténtalo de nuevo mañana.';
  end if;

  insert into product_reviews (product_name, customer_id, rating, longevity, projection, comment, verified)
  values (v_name, cid, p_rating, v_long, v_proj, left(trim(coalesce(p_comment, '')), 1200), v_bought)
  on conflict (customer_id, lower(product_name)) do update
    set rating = excluded.rating,
        longevity = excluded.longevity,
        projection = excluded.projection,
        comment = excluded.comment,
        verified = excluded.verified,
        updated_at = now();

  return json_build_object('ok', true, 'verified', v_bought);
end;
$$;
revoke execute on function submit_review(text, int, text, int, int) from public, anon;
grant execute on function submit_review(text, int, text, int, int) to authenticated;

notify pgrst, 'reload schema';
