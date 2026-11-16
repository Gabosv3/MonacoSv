import { supabase } from '../lib/supabase'
import { readCache, writeCache } from '../lib/cache'

// Valoraciones y guía de uso. Todo depende de supabase/product_experience.sql:
// mientras ese archivo no se ejecute en Supabase, las funciones no existen y aquí
// se responde "no disponible" (la ficha lo trata como un estado vacío, sin errores).

const missing = (error) =>
  error && (error.code === 'PGRST202' || error.code === '42883' || /could not find the function|schema cache/i.test(error.message ?? ''))

// Si las funciones no existen, se recuerda un rato (también entre visitas): así cada ficha
// no gasta tres peticiones que fallan. Pasado el tiempo se vuelve a probar, por si ya se
// ejecutó product_experience.sql. Un fallo de red no marca nada como ausente.
const RETRY_MS = 10 * 60 * 1000
let experienceMissing = (() => {
  const at = readCache('experience_missing')
  return typeof at === 'number' && Date.now() - at < RETRY_MS
})()

function noteMissing(error) {
  if (!missing(error)) return
  experienceMissing = true
  writeCache('experience_missing', Date.now())
}

// Respuestas recientes por fragancia: volver a una ficha no repite la consulta.
// Las valoraciones se vuelven a pedir tras publicar o retirar la propia (ver `forget`).
const TTL_MS = 2 * 60 * 1000
const memo = new Map()
function remember(key, load) {
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value
  const value = load().catch((err) => {
    memo.delete(key)
    throw err
  })
  memo.set(key, { at: Date.now(), value })
  return value
}
const norm = (name) => String(name).trim().toLowerCase()
const forget = (name) => memo.delete(`reviews:${norm(name)}`)

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
  if (experienceMissing) return null
  try {
    return await remember(`usage:${norm(name)}`, async () => {
      const { data, error } = await supabase.rpc('fragrance_usage', { p_name: name })
      if (error) throw error
      return cleanUsage(data)
    })
  } catch (error) {
    noteMissing(error)
    return null // sin la migración (o sin red) no hay guía que mostrar
  }
}

// Panel: la guía se guarda en todas las presentaciones de la fragancia
export async function setFragranceUsage(name, usage) {
  const { error } = await supabase.from('products').update({ usage: cleanUsage(usage) }).eq('name', name)
  if (error) throw error
  memo.delete(`usage:${norm(name)}`)
}

// { available, count, average, distribution, longevity, projection, reviews }
export async function fetchReviews(name) {
  if (experienceMissing) return { available: false, count: 0, reviews: [] }
  try {
    return await remember(`reviews:${norm(name)}`, async () => {
      const { data, error } = await supabase.rpc('product_reviews_summary', { p_name: name })
      if (error) throw error
      return { available: true, count: 0, reviews: [], ...data }
    })
  } catch (error) {
    noteMissing(error)
    return { available: false, count: 0, reviews: [] } // sin la migración o sin red
  }
}

// { can_review, reason: 'sin_sesion' | 'sin_compra' | 'ok', review }
export async function fetchMyReviewStatus(name) {
  if (experienceMissing) return { can_review: false, reason: 'no_disponible' }
  const { data, error } = await supabase.rpc('my_review_status', { p_name: name })
  if (error) {
    noteMissing(error)
    return { can_review: false, reason: 'no_disponible' }
  }
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
  forget(name)
}

export async function deleteMyReview(name) {
  const { error } = await supabase.rpc('delete_my_review', { p_name: name })
  if (error) throw new Error(error.message)
  forget(name)
}
