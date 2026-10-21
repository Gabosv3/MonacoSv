-- ============================================================
-- MonacoSV · Una sola lista: Paqueteras = Encomendistas
-- Ejecútalo DESPUÉS de orders.sql. Se puede ejecutar más de una vez.
--
-- Antes había dos listas separadas (encomendistas en Ventas y paqueteras en
-- Logística). Ahora todo vive en `carriers`:
--   · copia a `carriers` los encomendistas que todavía no estén ahí (por nombre),
--   · re-liga los pedidos (sales.courier_id) a la paquetera equivalente,
--   · quien tenga permiso de encomendistas también puede editar paqueteras.
-- La tabla `couriers` no se borra (queda como respaldo, sin uso).
-- ============================================================

insert into carriers (name, phone, active)
select c.name, c.phone, c.active
from couriers c
where not exists (select 1 from carriers k where lower(trim(k.name)) = lower(trim(c.name)));

alter table sales drop constraint if exists sales_courier_id_fkey;

-- pedidos que apuntaban a un encomendista antiguo → su paquetera con el mismo nombre
update sales s
set courier_id = k.id
from couriers c
join carriers k on lower(trim(k.name)) = lower(trim(c.name))
where s.courier_id = c.id;

-- lo que no encontró equivalente se limpia para poder crear la relación
update sales set courier_id = null
where courier_id is not null and not exists (select 1 from carriers k where k.id = sales.courier_id);

alter table sales
  add constraint sales_courier_id_fkey foreign key (courier_id) references carriers(id) on delete set null;

drop policy if exists "carriers_read" on carriers;
drop policy if exists "carriers_insert" on carriers;
drop policy if exists "carriers_update" on carriers;
drop policy if exists "carriers_delete" on carriers;
create policy "carriers_read" on carriers
  for select to authenticated using (has_permission('shipments.view') or has_permission('sales.view') or has_permission('couriers.manage'));
create policy "carriers_insert" on carriers
  for insert to authenticated with check (has_permission('shipments.manage') or has_permission('couriers.manage'));
create policy "carriers_update" on carriers
  for update to authenticated using (has_permission('shipments.manage') or has_permission('couriers.manage'));
create policy "carriers_delete" on carriers
  for delete to authenticated using (has_permission('shipments.manage') or has_permission('couriers.manage'));

notify pgrst, 'reload schema';
