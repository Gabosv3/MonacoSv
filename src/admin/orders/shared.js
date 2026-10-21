// Columnas del tablero de pedidos y utilidades comunes.

export const COLUMNS = [
  { key: 'pendiente', label: 'Pendientes', bg: '#fef3c7', fg: '#92400e' },
  { key: 'sin-encomendista', label: 'Falta encomendista', bg: '#ede9fe', fg: '#6d28d9' },
  { key: 'listo', label: 'Listos', bg: '#d1fae5', fg: '#065f46' },
  { key: 'entregado', label: 'Entregados', bg: '#e2e8f0', fg: '#334155' },
  { key: 'cancelado', label: 'Cancelados', bg: '#fee2e2', fg: '#991b1b' },
]

// En qué columna cae un pedido:
//  pendiente → confirmada (sin encomendista → con encomendista = listo) → entregada
export function columnOf(order) {
  if (order.status === 'cancelada') return 'cancelado'
  if (order.status === 'entregada') return 'entregado'
  if (order.status === 'pendiente') return 'pendiente'
  const delivery = order.delivery_method ?? 'envio'
  if (delivery === 'envio' && !order.courier_id) return 'sin-encomendista'
  return 'listo'
}

export const qtyOf = (order) => (order.sale_items ?? []).reduce((n, i) => n + i.quantity, 0)

export const itemsSummary = (order) =>
  (order.sale_items ?? []).map((i) => `${i.product_name} ×${i.quantity}`).join(', ')

// Los números de 8 dígitos son de El Salvador (+503)
export function whatsappUrl(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits.length === 8 ? `503${digits}` : digits}`
}

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const fmtDay = (d) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

export const orderLabel = (o) => (o.order_number ? `#${o.order_number}` : '')

// Los campos nuevos de la tabla solo existen tras ejecutar supabase/orders.sql
export const needsMigration = (e) => /schema cache|does not exist|column/i.test(e?.message ?? '')
export const MIGRATION_HINT = 'Falta actualizar la base de datos. Ejecuta supabase/orders.sql en el SQL Editor de Supabase y recarga.'
