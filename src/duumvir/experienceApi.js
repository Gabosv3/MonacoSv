import { supabase } from '../lib/supabase'

// Valoraciones y guía de uso. Todo depende de supabase/product_experience.sql:
// mientras ese archivo no se ejecute en Supabase, las funciones no existen y aquí
// se responde "no disponible" (la ficha lo trata como un estado vacío, sin errores).

const missing = (error) =>
  error && (error.code === 'PGRST202' || error.code === '42883' || /could not find the function|schema cache/i.test(error.message ?? ''))

// ejes de la guía de uso, en escala de 1 a 5 (0 o vacío = sin dato)
export const USAGE_GROUPS = [
  {
    key: 'momento',
    title: 'Momento y temporada',
    // en el sentido del reloj, como en los radares de uso de referencia
    axes: [['dia', 'Día'], ['verano', 'Verano'], ['otono', 'Otoño'], ['noche', 'Noche'], ['invierno', 'Invierno'], ['primavera', 'Primavera']],
  },
  {
    key: 'ocasion',
    title: 'Ocasión',
    axes: [['diario', 'Diario'], ['trabajo', 'Trabajo'], ['ocio', 'Casual'], ['salida', 'Salida nocturna'], ['formal', 'Formal'], ['deporte', 'Deporte']],
  },
  {
    // dos valores: se muestran como barras, no como radar
    key: 'clima',
    title: 'Clima',
    bars: true,
    axes: [['calido', 'Clima cálido'], ['fresco', 'Clima fresco']],
  },
  {
    // intensidad y persistencia según la tienda: se muestran como escalas, no como radar
    key: 'perfil',
    title: 'Proyección y duración',
    scale: true,
    axes: [['proyeccion', 'Proyección'], ['duracion', 'Duración']],
  },
]

// deja solo ejes conocidos con valores enteros de 1 a 5
export function cleanUsage(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const g of USAGE_GROUPS) {
    for (const [key] of g.axes) {
      const v = Math.round(Number(raw[key]))
      if (v >= 1 && v <= 5) out[key] = v
    }
  }
  return out
}

export async function fetchUsage(name) {
  const { data, error } = await supabase.rpc('fragrance_usage', { p_name: name })
  if (error) return null // sin la migración (o sin red) no hay guía que mostrar
  return cleanUsage(data)
}

// Panel: la guía se guarda en todas las presentaciones de la fragancia
export async function setFragranceUsage(name, usage) {
  const { error } = await supabase.from('products').update({ usage: cleanUsage(usage) }).eq('name', name)
  if (error) throw error
}

// { available, count, average, distribution, longevity, projection, reviews }
export async function fetchReviews(name) {
  const { data, error } = await supabase.rpc('product_reviews_summary', { p_name: name })
  if (error) return { available: false, count: 0, reviews: [] } // sin la migración o sin red
  return { available: true, count: 0, reviews: [], ...data }
}

// { can_review, reason: 'sin_sesion' | 'sin_compra' | 'ok', review }
export async function fetchMyReviewStatus(name) {
  const { data, error } = await supabase.rpc('my_review_status', { p_name: name })
  if (error) return { can_review: false, reason: 'no_disponible' }
  return data
}

export async function submitReview({ name, rating, comment, longevity, projection }) {
  const { error } = await supabase.rpc('submit_review', {
    p_name: name,
    p_rating: rating,
    p_comment: comment ?? '',
    p_longevity: longevity || null,
    p_projection: projection || null,
  })
  if (error) throw new Error(missing(error) ? 'Las valoraciones todavía no están activas.' : error.message)
}

export async function deleteMyReview(name) {
  const { error } = await supabase.rpc('delete_my_review', { p_name: name })
  if (error) throw new Error(error.message)
}
