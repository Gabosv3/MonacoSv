import { formatPrice } from '../catalog'
export const INK = '#0f1a2e'
export const AMBER = '#c2610c'
export const display = { fontFamily: "'Unbounded', system-ui, sans-serif" }
export const mono = { fontFamily: "'Space Mono', ui-monospace, monospace" }

export const ICONS = {
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zm-3 9l2 2 4-4',
  truck: 'M3 7h11v8H3V7zm11 3h4l3 3v2h-7v-5zM7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  bag: 'M6 8h12l1 12H5L6 8zm3 0a3 3 0 016 0',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zm9 3l-4.5-4.5',
  chat: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  check: 'M12 21a9 9 0 100-18 9 9 0 000 18zm-3.5-9l2.5 2.5 4.5-5',
  box: 'M3 8l9-5 9 5v8l-9 5-9-5V8zm9 5v8m0-8L3 8m9 5l9-5',
  users: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1m13-9a3 3 0 100-6 3 3 0 000 6zM9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm11.5 9v-1a4 4 0 00-3-3.9',
  tag: 'M3 12V4h8l10 10-8 8L3 12zm5-4h.01',
  cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 00-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 002 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z',
  grid: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  cart: 'M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2m4 3l1.5 9M9 21a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zm3 5h6m-6 4h6',
  percent: 'M19 5L5 19M7 9a2 2 0 100-4 2 2 0 000 4zm10 10a2 2 0 100-4 2 2 0 000 4z',
  ticket: 'M4 8a2 2 0 002-2h12a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H6a2 2 0 00-2-2v-2a2 2 0 000-4V8z',
  logout: 'M9 4H5v16h4m7-4l4-4-4-4m4 4H9',
  store: 'M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16',
  alert: 'M12 4l9 16H3L12 4zm0 6v4m0 3v.01',
  trend: 'M3 17l6-6 4 4 8-8m0 0h-5m5 0v5',
  wallet: 'M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h11M17 14h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5m-18 4l9 5 9-5',
}

export function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Precio de venta con el precio normal tachado y el % de descuento (si lo hay).
// El tachado hereda el color del contexto, así que sirve también sobre fondo oscuro.
export function PriceTag({ price, original, className = '', priceClass = '', color = 'inherit', badge = true }) {
  const off = original > price ? Math.round((1 - price / original) * 100) : 0
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <span className={priceClass} style={{ ...mono, color }}>{formatPrice(price)}</span>
      {off > 0 && <span className="text-[0.75em] font-normal line-through opacity-60" style={mono}>{formatPrice(original)}</span>}
      {off > 0 && badge && <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold no-underline" style={mono}>-{off}%</span>}
    </span>
  )
}
