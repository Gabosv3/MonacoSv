-- ============================================================
-- MonacoSV · Catálogo real (5 fragancias x 2 presentaciones (10 ml y 100 ml))
-- Pega este archivo en Supabase → SQL Editor → Run.
-- Una fila por presentación: mismo "name", distinto "volume".
-- Los precios son USD. Ajusta precio, costo y stock a tu gusto
-- desde el panel /admin/productos cuando quieras.
-- ============================================================

insert into products (name, category, description, price, cost, volume, color, stock, min_stock, active)
values
  ('9PM',           'Bestias Árabes', 'El clon supremo de Ultra Male con esteroides. Vainilla negra ahumada con haba tonka.', 11, 0, '10 ml',  '#c2610c', 20, 5, true),
  ('9PM',           'Bestias Árabes', 'El clon supremo de Ultra Male con esteroides. Vainilla negra ahumada con haba tonka.', 45, 0, '100 ml', '#c2610c', 10, 3, true),
  ('Khamrah Qahwa', 'Bestias Árabes', 'Café, cardamomo y dátiles envueltos en un oud cálido.', 10, 0, '10 ml',  '#c2610c', 20, 5, true),
  ('Khamrah Qahwa', 'Bestias Árabes', 'Café, cardamomo y dátiles envueltos en un oud cálido.', 38, 0, '100 ml', '#c2610c', 10, 3, true),
  ('Asad Zanzibar', 'Bestias Árabes', 'Ámbar, especias y un fondo de oud intenso con salida fresca.', 11, 0, '10 ml',  '#c2610c', 20, 5, true),
  ('Asad Zanzibar', 'Bestias Árabes', 'Ámbar, especias y un fondo de oud intenso con salida fresca.', 42, 0, '100 ml', '#c2610c', 10, 3, true),
  ('Asad Elixir',   'Bestias Árabes', 'Oud, cuero y un toque de vainilla oscura.', 12, 0, '10 ml',  '#c2610c', 20, 5, true),
  ('Asad Elixir',   'Bestias Árabes', 'Oud, cuero y un toque de vainilla oscura.', 48, 0, '100 ml', '#c2610c', 10, 3, true),
  ('Mandarin Sky',  'Bestias Árabes', 'Mandarina, notas cítricas y un aire limpio de verano.', 9,  0, '10 ml',  '#c2610c', 20, 5, true),
  ('Mandarin Sky',  'Bestias Árabes', 'Mandarina, notas cítricas y un aire limpio de verano.', 36, 0, '100 ml', '#c2610c', 10, 3, true);

-- Opcional: oculta los 6 productos de ejemplo del esquema original
-- (los desactiva, no los borra; puedes reactivarlos en /admin/productos).
update products set active = false
where name in ('Ámbar Nocturno', 'Brisa Cítrica', 'Flor Silvestre', 'Cuero & Especias', 'Agua Marina', 'Vainilla Dulce');
