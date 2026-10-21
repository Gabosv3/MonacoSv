// Copia local de lo que la tienda lee de Supabase (catálogo, ajustes…).
// Se muestra al instante y se refresca en segundo plano: la página abre más
// rápido y, en el plan gratuito, se nota menos en las consultas de cada visita.
const PREFIX = 'monacosv_cache_'

export function readCache(key) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + key))
  } catch {
    return null
  }
}

export function writeCache(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* sin almacenamiento: simplemente no se guarda */
  }
}
