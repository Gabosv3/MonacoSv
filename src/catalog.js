
export const DEPARTMENTS = [
  'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad', 'La Paz', 'La Unión',
  'Morazán', 'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután',
]

export function formatPrice(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

// El género sale de la categoría del producto en Supabase: si contiene
// "mujer", "ella", "dama" o "femenin" va a la línea para ella; "unisex" es
// unisex; todo lo demás es para hombre.
export function genderOf(category = '') {
  if (/mujer|ella|dama|femen/i.test(category)) return 'mujer'
  if (/unisex/i.test(category)) return 'unisex'
  return 'hombre'
}

export const mlOf = (volume) => parseInt(String(volume).replace(/[^\d]/g, ''), 10) || 0

export function sizeLabel(ml) {
  if (ml <= 5) return 'Prueba'
  if (ml <= 15) return 'Viajero (Top)'
  return 'Botella sellada'
}

// Agrupa los productos por nombre para el hero: una fragancia con varias
// presentaciones. Solo entran las que tienen foto (propia o de la ficha).
// primer valor no vacío de un campo entre las presentaciones de una fragancia
const first = (rows, key) => rows.find((r) => r[key])?.[key]

// etiquetas (tags) de todas las presentaciones de una fragancia, sin repetir
const tagsOf = (rows) => [...new Set(rows.flatMap((r) => r.tags ?? []))]

// genders: { 'Nombre de categoría': 'hombre' | 'mujer' | 'unisex' } (de la tabla categories)
export function buildFragrances(products, { requireImage = true, genders = {} } = {}) {
  const groups = new Map()
  for (const p of products) {
    if (!groups.has(p.name.trim())) groups.set(p.name.trim(), [])
    groups.get(p.name.trim()).push(p)
  }
  const out = []
  for (const [name, rows] of groups) {
    const image = first(rows, 'image_url')
    if (!image && requireImage) continue
    out.push({
      id: name,
      name,
      category: rows[0].category,
      gender: genders[rows[0].category] ?? genderOf(rows[0].category),
      // todo sale de la base de datos (lo que se edita en el panel)
      brand: first(rows, 'brand') ?? '',
      code: first(rows, 'code') ?? '',
      tag: first(rows, 'highlight') ?? '',
      type: first(rows, 'kind') ?? '',
      hours: first(rows, 'fixation') ?? null,
      notes: tagsOf(rows), // etiquetas del panel
      desc: first(rows, 'description') ?? '',
      image: image ?? null, // foto subida en el panel
      sizes: rows
        .map((r) => ({ ml: mlOf(r.volume), product: r }))
        .sort((a, b) => a.ml - b.ml),
    })
  }
  return out
}

// ---------- Fragancias destacadas (las elige el administrador) ----------

export const FEATURED_LIMIT = 5

// Los ajustes guardan los nombres elegidos como texto JSON: '["9PM","Khamrah Qahwa"]'
export function parseFeatured(raw) {
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.filter((n) => typeof n === 'string') : []
  } catch {
    return []
  }
}

// De todas las fragancias, las elegidas (en su orden, máx. 5). Si no hay una
// selección válida, las primeras 5, para que la portada nunca quede vacía.
export function pickFeatured(fragrances, raw) {
  const byName = new Map(fragrances.map((f) => [f.name.toLowerCase(), f]))
  const chosen = parseFeatured(raw).map((n) => byName.get(n.toLowerCase())).filter(Boolean)
  return (chosen.length ? chosen : fragrances).slice(0, FEATURED_LIMIT)
}
