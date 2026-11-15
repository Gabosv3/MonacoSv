import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, sizeLabel } from '../catalog'
import { useSettings } from '../settings'
import { PriceTag, product } from '../components/dv-ui'

export const fichaPath = (f) => `/fragancia/${encodeURIComponent(f.name)}`
export const inStock = (product) => product.stock == null || product.stock > 0
export const sizeName = (ml) => (ml <= 15 ? 'Decant' : sizeLabel(ml))

// Botón de compra: una sola unidad por pulsación, con estados de carga, éxito,
// error y agotado. tone="light" es la versión para fondos oscuros.
export function AddButton({ product, onAdd, tone = 'dark', className = '', label = 'Agregar a la bolsa' }) {
  const [state, setState] = useState('idle') // idle | loading | done | error
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  const out = !inStock(product)

  const busy = useRef(false) // candado inmediato: el estado tarda un render en cambiar
  const click = () => {
    if (busy.current || out) return // evita unidades repetidas por doble clic
    busy.current = true
    setState('loading')
    later(() => {
      try {
        onAdd(product)
        setState('done')
        later(() => { setState('idle'); busy.current = false }, 1600)
      } catch {
        setState('error')
        later(() => { setState('idle'); busy.current = false }, 2400)
      }
    }, 320)
  }

  const text = out ? 'Agotado' : state === 'loading' ? 'Agregando…' : state === 'done' ? 'Agregado a la bolsa' : state === 'error' ? 'No se pudo agregar. Reintenta' : label
  const colors = tone === 'light'
    ? 'bg-[#EDE8DF] text-[#141414] hover:bg-white focus-visible:outline-[#EDE8DF]'
    : 'bg-[#141414] text-white hover:bg-[#2B2B2B] focus-visible:outline-[#141414]'
  return (
    <button
      type="button"
      onClick={click}
      disabled={out}
      aria-live="polite"
      aria-busy={state === 'loading'}
      className={`group/add inline-flex items-center justify-center gap-2.5 min-h-12 px-6 text-[14px] font-semibold tracking-[0.01em] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${colors} ${className}`}
    >
      {state === 'loading' && <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />}
      {state === 'done' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
      <span>{text}</span>
      {state === 'idle' && !out && <span aria-hidden className="transition-transform duration-300 group-hover/add:translate-x-1">→</span>}
    </button>
  )
}

// Selector de presentación (10 ml, 100 ml…)
export function SizePicker({ sizes, value, onChange, tone = 'dark' }) {
  if (sizes.length < 2) return null
  const on = tone === 'light' ? 'bg-[#EDE8DF] text-[#141414] border-[#EDE8DF]' : 'bg-[#141414] text-white border-[#141414]'
  const off = tone === 'light' ? 'border-[#EDE8DF]/30 text-[#EDE8DF] hover:border-[#EDE8DF]' : 'border-[#141414]/20 text-[#141414] hover:border-[#141414]'
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Presentación">
      {sizes.map((s) => (
        <button
          key={s.product.id}
          type="button"
          role="radio"
          aria-checked={s === value}
          onClick={() => onChange(s)}
          className={`min-h-11 px-4 border text-[13px] font-semibold transition-colors ${s === value ? on : off}`}
        >
          {s.ml} ml <span className="font-normal opacity-70">· {sizeName(s.ml)}</span>
        </button>
      ))}
    </div>
  )
}

export function Availability({ product, tone = 'dark' }) {
  const ok = inStock(product)
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] ${tone === 'light' ? 'text-[#EDE8DF]/75' : 'text-[#57534E]'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-600' : 'bg-[#A8A29E]'}`} aria-hidden />
      {ok ? 'Disponible' : 'Agotado'}
    </span>
  )
}

// Tarjeta de fragancia: foto, casa y nombre, presentación, precio y compra.
export function ProductCard({ f, sizes = f.sizes, priceOf, onAdd }) {
  const [picked, setPicked] = useState(null)
  const size = sizes.find((s) => s === picked) ?? sizes.find((s) => inStock(s.product)) ?? sizes[0]
  const price = priceOf(size.product)
  const original = Number(size.product.price)
  return (
    <article className="group flex flex-col bg-white border border-[#141414]/8 transition-shadow duration-500 hover:shadow-[0_24px_48px_-28px_rgba(20,20,20,0.35)]">
      <Link to={fichaPath(f)} className="relative block aspect-[4/5] overflow-hidden bg-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#141414]" aria-label={`Ver ${f.name}`}>
        {f.image ? (
          <img src={f.image} alt={f.name} loading="lazy" className="absolute inset-0 w-full h-full object-contain p-8 transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[13px] text-[#78716C]">Foto próximamente</span>
        )}
        {original > price && <span className="absolute left-4 top-4 px-2 py-1 border border-[#141414]/20 bg-white text-[12px] font-semibold text-[#141414]">−{Math.round((1 - price / original) * 100)}%</span>}
      </Link>

      <div className="flex flex-col flex-1 gap-4 p-5 border-t border-[#141414]/8">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#78716C]">{f.brand || ' '}</p>
          <h3 className="mt-1.5 text-[1.2rem] leading-[1.25] line-clamp-2 min-h-[2.5em]" style={product}>
            <Link to={fichaPath(f)} className="hover:underline decoration-1 underline-offset-4">{f.name}</Link>
          </h3>
          <p className="mt-2 text-[14px] leading-snug text-[#57534E] line-clamp-1">{f.notes.slice(0, 3).join(' · ') || f.type || ' '}</p>
        </div>

        <div className="mt-auto flex flex-col gap-4">
          {sizes.length > 1 ? (
            <SizePicker sizes={sizes} value={size} onChange={setPicked} />
          ) : (
            <p className="text-[13px] text-[#57534E]">{size.ml} ml · {sizeName(size.ml)}</p>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <PriceTag price={price} original={original} priceClass="text-[1.3rem] font-semibold" color="#141414" />
            <Availability product={size.product} />
          </div>
          <AddButton product={size.product} onAdd={onAdd} className="w-full" />
        </div>
      </div>
    </article>
  )
}

// Condiciones de compra en una línea: cobertura, envío gratis y cómo se coordina el pedido.
// Todo sale de los Ajustes de la tienda; si no hay mínimo de envío gratis, ese dato no aparece.
export function TrustFacts({ className = '' }) {
  const { cfg } = useSettings()
  const freeMin = Number(cfg.free_shipping_min) || 0
  const facts = [
    cfg.coverage,
    freeMin > 0 && `Envío gratis desde ${formatPrice(freeMin)}`,
    'Pago y entrega coordinados por WhatsApp',
  ].filter(Boolean)
  return (
    <ul className={`flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#57534E] ${className}`}>
      {facts.map((f) => (
        <li key={f} className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[#141414]">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {f}
        </li>
      ))}
    </ul>
  )
}
