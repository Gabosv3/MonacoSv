import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { formatPrice } from '../catalog'
import { useSettings } from '../settings'
import { PriceTag, accent, display, product } from '../components/dv-ui'
import { AddButton, Availability, SizePicker, TrustFacts, inStock, sizeName } from './commerce'
import { fetchUsage } from './experienceApi'
import UsageChart, { Indicators } from './UsageChart'
import Reviews, { Stars } from './Reviews'

// Datos de ejemplo para revisar el diseño. Solo existen en desarrollo y solo con
// ?vista-previa en la dirección; en la tienda publicada este bloque no se incluye.
const PREVIEW = import.meta.env.DEV
  ? {
      usage: { dia: 2, noche: 5, primavera: 3, verano: 2, otono: 4, invierno: 5, diario: 3, trabajo: 2, ocio: 4, salida: 5, formal: 4, deporte: 1, calido: 2, fresco: 5, proyeccion: 4, duracion: 5 },
      reviews: {
        available: true, count: 3, average: 4.7, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 }, longevity: 4.5, projection: 4,
        reviews: [
          { id: 'a', rating: 5, longevity: 5, projection: 4, verified: true, created_at: '2026-01-10T12:00:00Z', author: 'Ejemplo A.', comment: 'Texto de ejemplo para revisar la composición de una reseña con comentario.' },
          { id: 'b', rating: 5, longevity: 4, projection: 4, verified: true, created_at: '2026-01-04T12:00:00Z', author: 'Ejemplo B.', comment: '' },
          { id: 'c', rating: 4, longevity: null, projection: null, verified: true, created_at: '2025-12-20T12:00:00Z', author: 'Ejemplo C.', comment: 'Segundo texto de ejemplo, algo más largo, para comprobar el ancho de lectura y el interlineado de los comentarios.' },
        ],
      },
    }
  : null

const lowest = (f, priceOf) => Math.min(...f.sizes.map((s) => priceOf(s.product)))
const both = (list) => (list.length > 1 ? `${list[0]} y ${list[1]}` : list[0])

// Fragancias relacionadas por atributos reales del catálogo: notas compartidas (lo que
// más pesa), mismo tipo, misma casa y precio cercano. Solo disponibles, nunca la actual.
// Cada una lleva los motivos por los que aparece, para decirlos en la ficha.
function relatedTo(f, all, priceOf) {
  const base = lowest(f, priceOf)
  return all
    .filter((x) => x.id !== f.id && x.sizes.some((s) => inStock(s.product)))
    .map((x) => {
      const shared = x.notes.filter((n) => f.notes.includes(n))
      const sameKind = Boolean(x.type) && x.type === f.type
      const sameBrand = Boolean(x.brand) && x.brand === f.brand
      const near = base > 0 && Math.abs(lowest(x, priceOf) - base) <= base * 0.2
      const score = shared.length * 3 + (sameKind ? 1 : 0) + (sameBrand ? 1 : 0) + (near ? 1 : 0)
      const reasons = [
        shared.length > 0 && (shared.length === 1 ? `Comparte la nota de ${shared[0].toLowerCase()}` : `Comparte las notas de ${both(shared.map((n) => n.toLowerCase()))}`),
        sameKind && `Mismo tipo: ${x.type.toLowerCase()}`,
        sameBrand && `De la misma casa, ${x.brand}`,
        near && 'Alternativa de precio cercano',
      ].filter(Boolean)
      return { x, score, shared, reasons: reasons.slice(0, 2) }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.x.name.localeCompare(b.x.name))
    .slice(0, 4)
}

// Una recomendación: foto, por qué aparece, sus notas (las compartidas, resaltadas) y la compra
function RelatedItem({ item, priceOf, onAdd }) {
  const { x, reasons, shared } = item
  const size = x.sizes.find((s) => inStock(s.product)) ?? x.sizes[0]
  const to = `/fragancia/${encodeURIComponent(x.name)}`
  return (
    <li className="group grid grid-cols-[7.5rem_1fr] sm:grid-cols-[9.5rem_1fr] gap-5 sm:gap-7 py-7 border-t border-[#141414]/10">
      <Link to={to} className="relative block aspect-[4/5] bg-white border border-[#141414]/8 overflow-hidden" aria-label={`Ver ${x.name}`}>
        {x.image && <img src={x.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-contain p-3 transition-transform duration-700 ease-out group-hover:scale-[1.05]" />}
      </Link>
      <div className="min-w-0 flex flex-col">
        <p className="text-[13px] leading-snug text-[#57534E]">{reasons.join(' · ')}</p>
        <h3 className="mt-2 text-[1.25rem] leading-[1.2]" style={product}>
          <Link to={to} className="hover:underline decoration-1 underline-offset-4">{x.name}</Link>
        </h3>
        <p className="mt-1 text-[13px] uppercase tracking-[0.12em] text-[#78716C]">{[x.brand, x.type].filter(Boolean).join(' · ')}</p>
        {x.notes.length > 0 && (
          <p className="mt-3 text-[14px] leading-relaxed text-[#57534E]">
            {x.notes.slice(0, 4).map((n, i) => (
              <span key={n}>{i > 0 && ' · '}<span className={shared.includes(n) ? 'font-semibold text-[#141414] underline decoration-1 underline-offset-4' : ''}>{n}</span></span>
            ))}
          </p>
        )}
        <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <PriceTag price={priceOf(size.product)} original={Number(size.product.price)} priceClass="text-[1.15rem] font-semibold" color="#141414" />
          <span className="text-[13px] text-[#57534E]">{size.ml} ml</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <AddButton product={size.product} onAdd={onAdd} label="Agregar" className="!min-h-11 !px-5" />
          <Link to={to} className="text-[14px] font-semibold underline underline-offset-4 hover:text-[#57534E]">Ver ficha</Link>
        </div>
      </div>
    </li>
  )
}

// Apartado de la ficha: rótulo y título, y debajo su contenido
function Section({ id, label, title, intro, first = false, children }) {
  return (
    <section id={id} className={`scroll-mt-36 lg:scroll-mt-40 ${first ? 'pt-10 lg:pt-14' : 'mt-14 lg:mt-20 pt-10 lg:pt-14 border-t border-[#141414]/10'}`} aria-labelledby={`${id}-title`}>
      <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#57534E]">{label}</p>
      <h2 id={`${id}-title`} className="mt-3 text-[clamp(2rem,3vw,2.75rem)] leading-[1.04] text-balance" style={display}>{title}</h2>
      {intro && <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-[#57534E]">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

// Índice de la ficha: se queda bajo la barra y marca el apartado que se está leyendo.
// Solo lleva a otra parte de la página; nunca cambia la compra.
function SectionNav({ items }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(items[0]?.id)
  const ids = items.map((i) => i.id).join(',')

  useEffect(() => {
    const els = ids.split(',').map((id) => document.getElementById(id)).filter(Boolean)
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])

  const go = (e, id) => {
    e.preventDefault()
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <nav className="sticky top-16 sm:top-20 z-30 -mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 bg-[#F7F6F2]/95 backdrop-blur-md border-b border-[#141414]/10" aria-label="Apartados de la ficha">
      <ul className="dv-noscroll flex gap-7 overflow-x-auto">
        {items.map((it) => (
          <li key={it.id} className="shrink-0">
            <a
              href={`#${it.id}`}
              onClick={(e) => go(e, it.id)}
              aria-current={active === it.id ? 'true' : undefined}
              className={`block py-4 text-[14px] font-semibold border-b-2 -mb-px transition-colors ${active === it.id ? 'border-[#141414] text-[#141414]' : 'border-transparent text-[#57534E] hover:text-[#141414]'}`}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Selector de cantidad
function Quantity({ value, max, onChange }) {
  const btn = 'w-11 h-full flex items-center justify-center text-xl text-[#141414] hover:bg-[#F7F6F2] disabled:opacity-30 disabled:hover:bg-transparent'
  return (
    <div className="flex items-stretch h-14 border border-[#141414]/25 bg-white" role="group" aria-label="Cantidad">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Una unidad menos">−</button>
      <span className="w-9 flex items-center justify-center text-[16px] font-medium tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Una unidad más">+</button>
    </div>
  )
}

// Galería: la fotografía protagonista y, si el producto tiene más de una, sus miniaturas
function Gallery({ f, images, index, onIndex }) {
  const reduce = useReducedMotion()
  const src = images[index]
  return (
    <div>
      <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[6/5] bg-white border border-[#141414]/8 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          {src ? (
            <motion.img
              key={src}
              src={src}
              alt={f.name}
              className="absolute inset-0 w-full h-full object-contain p-10 sm:p-14"
              initial={reduce ? false : { opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.19, 1, 0.22, 1] }}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[14px] text-[#78716C]">Foto próximamente</span>
          )}
        </AnimatePresence>
        {f.code && <span className="absolute left-5 top-5 text-[13px] text-[#78716C]">Ref. {f.code}</span>}
        {images.length > 1 && (
          <>
            <span className="absolute right-5 top-5 text-[13px] tabular-nums text-[#78716C]" aria-live="polite">{index + 1} / {images.length}</span>
            {[['Foto anterior', -1, 'left-3', '‹'], ['Foto siguiente', 1, 'right-3', '›']].map(([label, step, side, glyph]) => (
              <button
                key={label}
                type="button"
                onClick={() => onIndex((index + step + images.length) % images.length)}
                aria-label={label}
                className={`absolute ${side} top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/90 border border-[#141414]/12 text-2xl leading-none text-[#141414] hover:bg-white transition-colors`}
              >
                {glyph}
              </button>
            ))}
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 dv-noscroll" aria-label="Fotografías">
          {images.map((u, i) => (
            <li key={u} className="shrink-0">
              <button
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Ver fotografía ${i + 1} de ${images.length}`}
                aria-current={i === index}
                className={`block w-20 h-24 bg-white border transition-colors ${i === index ? 'border-[#141414]' : 'border-[#141414]/12 hover:border-[#141414]/50'}`}
              >
                <img src={u} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain p-2" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Barra de compra persistente. Se muestra siempre que el botón principal no esté a la
// vista (en escritorio, cuando el panel lateral llega a su límite; en móvil y tableta, en
// cuanto el botón sale de pantalla), también junto a las recomendaciones y al final de la ficha.
function BuyBar({ show, f, size, price, original, qty, onAdd }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#141414]/12 shadow-[0_-12px_32px_-20px_rgba(20,20,20,0.35)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          initial={reduce ? { opacity: 0 } : { y: '100%' }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: '100%' }}
          transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          role="region"
          aria-label={`Comprar ${f.name}`}
          data-buybar
        >
          <div className="max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12 h-[76px] flex items-center gap-3.5 sm:gap-6">
            {f.image && (
              <span className="hidden min-[380px]:flex shrink-0 w-11 h-14 sm:w-12 sm:h-[3.75rem] bg-[#F7F6F2] items-center justify-center">
                <img src={f.image} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[15px] sm:text-[17px] leading-tight truncate" style={product}>{f.name}</p>
              <p className="mt-1 text-[13px] text-[#57534E] truncate">
                {size.ml} ml<span className="hidden sm:inline"> · {sizeName(size.ml)}</span> · {inStock(size.product) ? 'Disponible' : 'Agotado'}
              </p>
            </div>
            <PriceTag price={price} original={original} priceClass="text-[16px] sm:text-[20px] font-semibold leading-none" color="#141414" badge={false} className="shrink-0 flex-col !items-end !gap-y-1 sm:flex-row sm:!items-baseline" />
            <span className="shrink-0 sm:hidden"><AddButton product={size.product} onAdd={onAdd} label={qty > 1 ? `Agregar (${qty})` : 'Agregar'} className="!px-5" /></span>
            <span className="shrink-0 hidden sm:block"><AddButton product={size.product} onAdd={onAdd} label={qty > 1 ? `Agregar a la bolsa (${qty})` : 'Agregar a la bolsa'} className="min-w-[250px] min-h-[3.25rem]" /></span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Ficha de una fragancia: a la izquierda, fotografías y contenido; a la derecha, el panel
// comercial, que acompaña toda la lectura. Solo muestra datos que existen; lo que falta no se rellena.
export default function ProductPage({ fragrances, state, priceOf, onAdd, cartOpen = false }) {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { cfg, wa } = useSettings()
  const f = useMemo(() => fragrances.find((x) => x.name.toLowerCase() === String(slug).toLowerCase()), [fragrances, slug])
  const preview = PREVIEW && params.has('vista-previa') ? PREVIEW : null
  const [picked, setPicked] = useState(null)
  const [imgIndex, setImgIndex] = useState(0)
  const [qty, setQty] = useState(1)
  const [usage, setUsage] = useState(null)
  const [summary, setSummary] = useState(null)
  const [buyVisible, setBuyVisible] = useState(true)
  const buyRef = useRef(null)

  useEffect(() => {
    setPicked(null)
    setImgIndex(0)
    setQty(1)
    setSummary(null)
  }, [slug])

  // guía de uso definida por la tienda
  const name = f?.name
  useEffect(() => {
    setUsage(null)
    if (!name) return
    if (preview) {
      setUsage(preview.usage)
      return
    }
    let alive = true
    fetchUsage(name).then((u) => alive && setUsage(u))
    return () => { alive = false }
  }, [name, preview])

  // ¿El botón principal se ve? Si no, aparece la barra. El margen superior descuenta la barra fija del sitio
  // y adelanta unos píxeles la aparición, para que nunca haya un instante sin botón.
  useEffect(() => {
    const el = buyRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setBuyVisible(e.isIntersecting), { rootMargin: '-150px 0px 0px 0px', threshold: 1 })
    io.observe(el)
    return () => io.disconnect()
  }, [name])

  // la barra fija no debe tapar el final de la página: se le reserva su alto abajo
  const root = typeof document !== 'undefined' ? document.getElementById('root')?.firstElementChild : null
  useEffect(() => {
    if (!root) return
    const before = root.style.paddingBottom
    root.style.paddingBottom = 'calc(76px + env(safe-area-inset-bottom))'
    return () => { root.style.paddingBottom = before }
  }, [root])

  const images = useMemo(() => {
    if (!f) return []
    const seen = new Set()
    // la principal, la de cada presentación y después las fotos adicionales de la galería
    return [f.image, ...f.sizes.map((s) => s.product.image_url), ...(f.images ?? [])].filter((u) => u && !seen.has(u) && seen.add(u))
  }, [f])

  const related = useMemo(() => (f ? relatedTo(f, fragrances, priceOf) : []), [f, fragrances, priceOf])
  const onSummary = useCallback((s) => setSummary(s), [])

  const size = f ? f.sizes.find((s) => s === picked) ?? f.sizes.find((s) => inStock(s.product)) ?? f.sizes[0] : null
  const maxQty = size && size.product.stock != null ? Math.max(1, Math.min(10, size.product.stock)) : 10
  useEffect(() => setQty((q) => Math.min(q, maxQty)), [maxQty])

  // agrega exactamente las unidades elegidas, una sola vez por pulsación
  const addSelected = useCallback(
    (p) => {
      for (let i = 0; i < qty; i++) onAdd(p)
      setQty(1)
    },
    [onAdd, qty]
  )

  const chooseSize = (s) => {
    setPicked(s)
    const at = images.indexOf(s.product.image_url)
    if (at >= 0) setImgIndex(at)
  }

  if (!f) {
    return (
      <main className="max-w-[900px] mx-auto px-5 py-28 text-center">
        <h1 className="text-4xl" style={display}>{state === 'loading' ? 'Cargando…' : 'No encontramos esa fragancia'}</h1>
        {state !== 'loading' && (
          <>
            <p className="mt-4 text-[16px] text-[#57534E]">Puede que ya no esté en el catálogo.</p>
            <Link to="/fragancias" className="dv-btn dv-btn--solid mt-8">Ver el catálogo</Link>
          </>
        )}
      </main>
    )
  }

  const price = priceOf(size.product)
  const original = Number(size.product.price)
  const freeMin = Number(cfg.free_shipping_min) || 0
  const rated = preview ? preview.reviews : summary
  const ratedCount = Number(rated?.count) || 0

  const nav = [
    (f.desc || f.tag) && { id: 'descripcion', label: 'Descripción' },
    f.notes.length > 0 && { id: 'notas', label: 'Notas' },
    { id: 'uso', label: 'Guía de uso' },
    { id: 'valoraciones', label: 'Valoraciones' },
    { id: 'informacion', label: 'Información' },
    related.length > 0 && { id: 'similares', label: 'Similares' },
  ].filter(Boolean)
  let firstDone = false
  const isFirst = () => (firstDone ? false : (firstDone = true))

  const info = [
    f.brand && ['Casa', f.brand],
    f.type && ['Tipo', f.type],
    f.hours && ['Fijación declarada', f.hours],
    ['Presentaciones', f.sizes.map((s) => `${s.ml} ml`).join(' · ')],
    f.code && ['Referencia', f.code],
    ['Entrega', `${cfg.coverage} de El Salvador, desde ${cfg.city}.${freeMin ? ` Envío gratis en compras desde ${formatPrice(freeMin)}.` : ''}`],
    ['Pago', 'Al finalizar tu pedido coordinamos el pago y la entrega contigo por WhatsApp.'],
    ['Asesoría', '¿Dudas con esta fragancia? Escríbenos y te ayudamos a elegir.'],
  ].filter(Boolean)

  return (
    <main className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 pt-6 lg:pt-10 pb-20">
      <nav className="text-[13px] text-[#78716C]" aria-label="Ruta">
        <Link to="/" className="hover:text-[#141414]">Inicio</Link> <span className="mx-2">/</span>
        <Link to="/fragancias" className="hover:text-[#141414]">Catálogo</Link> <span className="mx-2">/</span>
        <span className="text-[#141414]">{f.name}</span>
      </nav>

      {/* dos zonas: contenido (izquierda) y panel comercial (derecha, fijo durante toda la lectura) */}
      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-x-14 xl:gap-x-20">
        <div className="lg:col-start-1 lg:row-start-1 min-w-0">
          <Gallery f={f} images={images} index={imgIndex} onIndex={setImgIndex} />
        </div>

        <aside className="mt-9 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start lg:sticky lg:top-24" aria-label="Comprar">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#57534E]">{[f.brand, f.type].filter(Boolean).join(' · ')}</p>
          <h1 className="mt-3 text-[clamp(2rem,3vw,2.75rem)] leading-[1.08] text-balance" style={product}>{f.name}</h1>
          {f.tag && <p className="mt-3 text-[1.5rem] leading-tight text-[#57534E]" style={accent}>{f.tag}</p>}
          <a href="#valoraciones" onClick={(e) => { e.preventDefault(); document.getElementById('valoraciones')?.scrollIntoView({ behavior: 'smooth' }) }} className="mt-4 inline-flex items-center gap-2.5 text-[14px] text-[#57534E] hover:text-[#141414]">
            {ratedCount > 0 ? (
              <>
                <Stars value={Number(rated.average)} size={15} />
                <span className="tabular-nums"><strong className="font-semibold text-[#141414]">{Number(rated.average).toFixed(1)}</strong> · {ratedCount} {ratedCount === 1 ? 'valoración' : 'valoraciones'}</span>
              </>
            ) : (
              <span className="underline underline-offset-4">Aún sin valoraciones</span>
            )}
          </a>

          <div className="mt-7 pt-7 border-t border-[#141414]/10">
            <p className="text-[13px] font-semibold text-[#141414] mb-3">Presentación</p>
            {f.sizes.length > 1 ? (
              <SizePicker sizes={f.sizes} value={size} onChange={chooseSize} />
            ) : (
              <p className="text-[15px] text-[#57534E]">{size.ml} ml · {sizeName(size.ml)}</p>
            )}
            <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <PriceTag price={price} original={original} priceClass="text-[2.25rem] font-semibold leading-none" color="#141414" />
              <Availability product={size.product} />
            </div>
            <div ref={buyRef} className="mt-6 flex gap-3">
              {inStock(size.product) && <Quantity value={qty} max={maxQty} onChange={(n) => setQty(Math.max(1, Math.min(maxQty, n)))} />}
              <AddButton product={size.product} onAdd={addSelected} className="flex-1 min-h-14 text-[15px]" />
            </div>
            <a href={wa(`Hola, quiero consultar por ${f.name} (${size.ml} ml).`)} target="_blank" rel="noopener noreferrer" className="mt-3 dv-btn dv-btn--line w-full min-h-12">Consultar por WhatsApp</a>
            <TrustFacts className="mt-6 !flex-col !gap-y-2" />
          </div>
        </aside>

        <div className="mt-10 lg:mt-0 lg:col-start-1 lg:row-start-2 min-w-0">
          <SectionNav items={nav} />

          {(f.desc || f.tag) && (
            <Section id="descripcion" label="Descubre" title="La fragancia" first={isFirst()}>
              {f.desc ? <p className="max-w-[62ch] text-[17px] leading-[1.75] text-[#57534E]">{f.desc}</p> : <p className="text-[#57534E]">{f.tag}</p>}
            </Section>
          )}

          {f.notes.length > 0 && (
            <Section id="notas" label="Perfil olfativo" title="Notas" intro="Toca una nota para ver otras fragancias del catálogo que la llevan." first={isFirst()}>
              <ul className="flex flex-wrap gap-2.5">
                {f.notes.map((n) => (
                  <li key={n}>
                    <Link to={`/fragancias?nota=${encodeURIComponent(n)}`} className="inline-flex items-center min-h-11 px-5 rounded-full border border-[#141414]/15 bg-white text-[15px] font-medium hover:border-[#141414] transition-colors">{n}</Link>
                  </li>
                ))}
              </ul>
              {f.hours && <p className="mt-6 text-[15px] text-[#57534E]"><span className="font-semibold text-[#141414]">Fijación declarada:</span> {f.hours}</p>}
            </Section>
          )}

          <Section id="uso" label="Guía de uso" title="Cuándo usarla" intro="Cómo recomendamos llevarla según el momento, la temporada y la ocasión." first={isFirst()}>
            {preview && <p className="mb-6 inline-block border border-[#141414]/25 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#57534E]">Vista previa de diseño · datos de ejemplo, no reales</p>}
            <Indicators f={f} usage={usage} summary={rated} />
            <div className="mt-12 pt-10 border-t border-[#141414]/10">
              <UsageChart usage={usage} />
            </div>
          </Section>

          <Section id="valoraciones" label="Opiniones de clientes" title="Valoraciones" intro="Lo que opinan nuestros clientes. Las de quienes ya la compraron llevan la etiqueta «Compra verificada»." first={isFirst()}>
            <Reviews name={f.name} preview={preview?.reviews ?? null} onSummary={onSummary} />
          </Section>

          <Section id="informacion" label="Ficha" title="Información" first={isFirst()}>
            <dl className="border-t border-[#141414]/10">
              {info.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8rem_1fr] gap-4 py-4 border-b border-[#141414]/10 text-[15px] leading-relaxed">
                  <dt className="font-semibold text-[#141414]">{k}</dt>
                  <dd className="text-[#57534E]">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {related.length > 0 && (
            <Section id="similares" label="Del catálogo" title={related.some((r) => r.shared.length) ? 'Explora perfiles similares' : 'Descubre otras fragancias'} intro={`Elegidas por lo que tienen en común con ${f.name}: notas, tipo, casa o precio.`} first={isFirst()}>
              <ul className="grid md:grid-cols-2 gap-x-10 -mt-7 [&>li:first-child]:border-t-0 md:[&>li:nth-child(2)]:border-t-0">
                {related.map((item) => <RelatedItem key={item.x.id} item={item} priceOf={priceOf} onAdd={onAdd} />)}
              </ul>
            </Section>
          )}
        </div>
      </div>

      <BuyBar show={!buyVisible && !cartOpen} f={f} size={size} price={price} original={original} qty={qty} onAdd={addSelected} />
    </main>
  )
}
