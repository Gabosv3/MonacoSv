// Identidad DUUMVIR para la tienda (el panel admin sigue usando ./ui).
import { formatPrice } from '../catalog'
export { ICONS, Icon } from './ui'

export const INK = '#141414'
export const AMBER = '#141414'
export const MUTED = '#57534E'
// Cormorant Garamond Semibold: titulares editoriales, en redonda
export const display = { fontFamily: "'Cormorant Garamond', 'Times New Roman', serif", fontWeight: 600, letterSpacing: '-0.012em' }
// Frases cortas de identidad: la misma familia, un punto más ligera
export const accent = { fontFamily: "'Cormorant Garamond', 'Times New Roman', serif", fontWeight: 500 }
// Nombres de producto: Manrope Semibold
export const product = { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 600, letterSpacing: '-0.02em' }
// Etiquetas y cifras: la tipografía funcional, con números alineados
export const mono = { fontFamily: "'Manrope', system-ui, sans-serif", fontVariantNumeric: 'tabular-nums' }

// Precio de venta; si hay rebaja real, el precio normal tachado y el porcentaje.
export function PriceTag({ price, original, className = '', priceClass = '', color = 'inherit', badge = true }) {
  const off = original > price ? Math.round((1 - price / original) * 100) : 0
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`} style={mono}>
      <span className={priceClass || 'font-semibold'} style={{ color }}>{formatPrice(price)}</span>
      {off > 0 && <span className="text-[0.8em] font-normal line-through opacity-60">{formatPrice(original)}</span>}
      {off > 0 && badge && <span className="text-[0.75em] font-semibold opacity-75">−{off}%</span>}
    </span>
  )
}
