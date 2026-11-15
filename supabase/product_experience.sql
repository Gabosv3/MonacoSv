-- ============================================================
-- DUUMVIR · Experiencia de producto: valoraciones y guía de uso
-- Pega este archivo completo en Supabase → SQL Editor → Run.
-- Se puede ejecutar más de una vez sin romper nada.
-- Requiere: schema.sql, customers.sql, accounts_and_settings.sql y orders.sql.
--
--   1) products.usage     guía editorial de uso de cada fragancia (día, noche,
--                         temporadas y ocasiones), en escala de 1 a 5. La define
--                         la tienda desde el panel; no son datos de clientes.
--   2) product_reviews    valoraciones de clientes. Solo puede valorar quien tiene
--                         un pedido confirmado o entregado de esa fragancia, una vez
--                         por fragancia. Todo pasa por funciones del servidor: la
--                         tabla no es legible ni escribible directamente desde la tienda.
-- ============================================================

-- ---------- 1) Guía de uso ----------
alter table products add column if not exists usage jsonb not null default '{}'::jsonb;

-- Lectura pública de la guía (de la primera presentación que la tenga)
create or replace function fragrance_usage(p_name text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select usage from products
  where lower(name) = lower(trim(p_name)) and active and usage <> '{}'::jsonb
  order by created_at
  limit 1;
$$;
grant execute on function fragrance_usage(text) to anon, authenticated;

-- ---------- 2) Valoraciones ----------
create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  customer_id uuid not null references customers(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  longevity smallint check (longevity between 1 and 5),   -- duración en piel (opcional)
  projection smallint check (projection between 1 and 5), -- proyección / estela (opcional)
  comment text not null default '' check (char_length(comment) <= 1200),
  verified boolean not null default false,                -- la marca el servidor, nunca el cliente
  status text not null default 'publicada' check (status in ('publicada', 'oculta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- una valoración por cliente y fragancia
create unique index if not exists product_reviews_one_per_customer on product_reviews (customer_id, lower(product_name));
create index if not exists product_reviews_product_idx on product_reviews (lower(product_name), created_at desc);

alter table product_reviews enable row level security;

-- Sin políticas para visitantes: leen y escriben solo a través de las funciones de abajo.
-- El equipo puede ver, ocultar o borrar valoraciones (moderación).
drop policy if exists "product_reviews_staff" on product_reviews;
create policy "product_reviews_staff" on product_reviews
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- ¿Este cliente tiene una compra comprobable de la fragancia?
-- Cuenta un pedido confirmado o entregado (no pendiente ni cancelado) que la incluya.
create or replace function customer_bought(p_customer uuid, p_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from sales s
    join sale_items si on si.sale_id = s.id
    left join products p on p.id = si.product_id
    where s.customer_id = p_customer
      and s.status in ('confirmada', 'entregada')
      and (
        lower(p.name) = lower(trim(p_name))
        or lower(si.product_name) = lower(trim(p_name))
        -- el pedido guarda "Nombre (100 ml)"
        or left(lower(si.product_name), char_length(trim(p_name)) + 2) = lower(trim(p_name)) || ' ('
      )
  );
$$;
revoke all on function customer_bought(uuid, text) from public, anon, authenticated;

-- Resumen y lista pública de valoraciones de una fragancia
create or replace function product_reviews_summary(p_name text)
returns json
language sql stable security definer set search_path = public
as $$
  with r as (
    select pr.*, c.name as customer_name
    from product_reviews pr
    join customers c on c.id = pr.customer_id
    where lower(pr.product_name) = lower(trim(p_name)) and pr.status = 'publicada'
  )
  select json_build_object(
    'count', (select count(*) from r),
    'average', (select round(avg(rating)::numeric, 1) from r),
    'distribution', (
      select json_object_agg(n, (select count(*) from r where rating = n))
      from generate_series(1, 5) as n
    ),
    'longevity', (select round(avg(longevity)::numeric, 1) from r where longevity is not null),
    'projection', (select round(avg(projection)::numeric, 1) from r where projection is not null),
    'reviews', coalesce((
      select json_agg(x order by x.created_at desc)
      from (
        select
          id, rating, longevity, projection, comment, verified, created_at,
          -- solo el nombre de pila y la inicial del apellido
          case
            when trim(customer_name) = '' then 'Cliente'
            when position(' ' in trim(customer_name)) = 0 then initcap(trim(customer_name))
            else initcap(split_part(trim(customer_name), ' ', 1)) || ' ' || upper(left(split_part(trim(customer_name), ' ', 2), 1)) || '.'
          end as author
        from r
        order by created_at desc
        limit 50
      ) x
    ), '[]'::json)
  );
$$;
grant execute on function product_reviews_summary(text) to anon, authenticated;

-- ¿Puede valorar quien está viendo la ficha? Devuelve también su valoración, si ya tiene una.
create or replace function my_review_status(p_name text)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  mine json;
begin
  if uid is null then
    return json_build_object('can_review', false, 'reason', 'sin_sesion');
  end if;
  select id into cid from customers where user_id = uid;
  if cid is null then
    return json_build_object('can_review', false, 'reason', 'sin_compra');
  end if;
  select json_build_object('rating', rating, 'longevity', longevity, 'projection', projection, 'comment', comment, 'status', status)
    into mine
  from product_reviews
  where customer_id = cid and lower(product_name) = lower(trim(p_name));
  if not customer_bought(cid, p_name) then
    return json_build_object('can_review', false, 'reason', 'sin_compra', 'review', mine);
  end if;
  return json_build_object('can_review', true, 'reason', 'ok', 'review', mine);
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
  -- los aspectos opcionales fuera de rango se guardan como "sin dato"
  v_long int := case when p_longevity between 1 and 5 then p_longevity end;
  v_proj int := case when p_projection between 1 and 5 then p_projection end;
begin
  if uid is null then
    raise exception 'Inicia sesión para valorar esta fragancia.';
  end if;
  select id into cid from customers where user_id = uid;
  if cid is null then
    raise exception 'Solo quienes compraron esta fragancia pueden valorarla.';
  end if;
  -- la fragancia debe existir en el catálogo; se guarda con su nombre oficial
  select name into v_name from products where lower(name) = lower(trim(p_name)) limit 1;
  if v_name is null then
    raise exception 'No encontramos esa fragancia.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Elige una calificación de 1 a 5 estrellas.';
  end if;
  if not customer_bought(cid, v_name) then
    raise exception 'Solo quienes compraron esta fragancia pueden valorarla.';
  end if;

  insert into product_reviews (product_name, customer_id, rating, longevity, projection, comment, verified)
  values (v_name, cid, p_rating, v_long, v_proj, left(trim(coalesce(p_comment, '')), 1200), true)
  on conflict (customer_id, lower(product_name)) do update
    set rating = excluded.rating,
        longevity = excluded.longevity,
        projection = excluded.projection,
        comment = excluded.comment,
        verified = true,
        updated_at = now();

  return json_build_object('ok', true);
end;
$$;
revoke execute on function submit_review(text, int, text, int, int) from public, anon;
grant execute on function submit_review(text, int, text, int, int) to authenticated;

-- Retirar la valoración propia
create or replace function delete_my_review(p_name text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
begin
  select id into cid from customers where user_id = auth.uid();
  if cid is null then
    return json_build_object('ok', false);
  end if;
  delete from product_reviews where customer_id = cid and lower(product_name) = lower(trim(p_name));
  return json_build_object('ok', true);
end;
$$;
revoke execute on function delete_my_review(text) from public, anon;
grant execute on function delete_my_review(text) to authenticated;

notify pgrst, 'reload schema';
