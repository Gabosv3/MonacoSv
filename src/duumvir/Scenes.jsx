import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { PriceTag } from '../components/dv-ui'
import { AddButton, Availability, SizePicker, fichaPath, inStock } from './commerce'

const pad = (n) => String(n).padStart(2, '0')
const INK = '#141414'
const IVORY = '#EDE8DF'

// Aparición de un elemento atada al scroll: `s` es la posición dentro de la
// secuencia (0 = primera fragancia, 1 = segunda…), no un temporizador.
function useStep(s, start, span = 0.12, dist = 22) {
  const opacity = useTransform(s, [start, start + span], [0, 1])
  const y = useTransform(s, [start, start + span], [dist, 0])
  return { opacity, y }
}

// Una fragancia. `flip` alterna el lado de la foto y `light` el fondo. Con `s`
// la escena entra, se queda y sale siguiendo el scroll; sin `s` es estática.
function Scene({ f, i, total, s, flip, light, priceOf, onAdd }) {
  const [picked, setPicked] = useState(null)
  const size = f.sizes.find((x) => x === picked) ?? f.sizes.find((x) => inStock(x.product)) ?? f.sizes[0]
  const price = priceOf(size.product)
  const original = Number(size.product.price)
  const soft = light ? '#57534E' : 'rgba(237,232,223,0.72)'
  const line = light ? 'rgba(20,20,20,0.14)' : 'rgba(237,232,223,0.16)'
  const tone = light ? 'dark' : 'light'

  // la primera entra mientras la sección sube a la pantalla; las demás, al llegar su tramo
  const inA = i === 0 ? -0.7 : i
  const inB = i === 0 ? -0.35 : i + 0.1
  const last = i === total - 1
  const pts = last ? [inA, inB] : [inA, inB, i + 0.88, i + 1]
  const imgOpacity = useTransform(s, pts, last ? [0, 1] : [0, 1, 1, 0])
  const imgY = useTransform(s, last ? [inA, inB + 0.14] : [inA, inB + 0.14, i + 0.88, i + 1], last ? [44, 0] : [44, 0, 0, -32])
  const imgScale = useTransform(s, last ? [inA, inB + 0.14] : [inA, inB + 0.14, i + 0.88, i + 1], last ? [0.94, 1] : [0.94, 1, 1, 1.03])
  const textOpacity = useTransform(s, last ? [inA, inA + 0.01] : [inA, inA + 0.01, i + 0.88, i + 0.98], last ? [0, 1] : [0, 1, 1, 0])

  const gap = i === 0 ? 0.05 : 0.035
  const t0 = inA + (i === 0 ? 0.08 : 0.03)
  const s1 = useStep(s, t0)
  const nameY = useTransform(s, [t0 + gap, t0 + gap + 0.14], ['108%', '0%'])
  const s3 = useStep(s, t0 + gap * 2)
  const s4 = useStep(s, t0 + gap * 3)
  const s5 = useStep(s, t0 + gap * 4)
  const s6 = useStep(s, t0 + gap * 2) // la compra aparece pronto: siempre a mano
  const on = Boolean(s)
  const st = (step) => (on ? step : undefined)

  return (
    <div className="h-full grid grid-rows-[minmax(0,36svh)_auto] lg:grid-rows-1 lg:grid-cols-2 gap-6 lg:gap-20 items-center content-center" style={{ color: light ? INK : IVORY }}>
      {/* foto: sobre fondo oscuro va en una lámina marfil; sobre marfil, directa */}
      <motion.div
        className={`relative h-full lg:h-[66svh] flex items-center justify-center ${flip ? 'lg:order-2' : ''}`}
        style={on ? { opacity: imgOpacity, y: imgY, scale: imgScale } : undefined}
      >
        <div className={`relative h-full aspect-[4/5] max-w-full ${light ? '' : 'bg-[#EDE8DF]'}`}>
          {f.image ? (
            <img src={f.image} alt={f.name} decoding="async" fetchPriority="low" className={`w-full h-full object-contain mix-blend-multiply ${light ? '' : 'p-6 sm:p-10'}`} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[14px] text-[#57534E]">Foto próximamente</span>
          )}
        </div>
      </motion.div>

      <motion.div className={`w-full max-w-[540px] ${flip ? 'lg:justify-self-end' : ''}`} style={on ? { opacity: textOpacity } : undefined}>
        <motion.p className="dv-label" style={{ color: soft, ...st(s1) }}>
          <span className="tabular-nums">{pad(i + 1)} / {pad(total)}</span>
          <span className="mx-3" aria-hidden>—</span>
          {[f.brand, f.type].filter(Boolean).join(' · ')}
        </motion.p>
        <h3 className="dv-product mt-3 overflow-hidden text-[clamp(1.75rem,3.3vw,3rem)] leading-[1.08] pb-[0.08em]">
          <motion.span className="block text-balance" style={on ? { y: nameY } : undefined}>{f.name}</motion.span>
        </h3>
        {f.tag && <motion.p className="dv-display mt-2 text-[clamp(1.35rem,2vw,1.85rem)] leading-tight" style={{ color: soft, fontWeight: 500, ...st(s3) }}>{f.tag}</motion.p>}
        {f.desc && <motion.p className="hidden lg:block mt-5 text-[16px] leading-relaxed line-clamp-3" style={{ color: soft, ...st(s4) }}>{f.desc}</motion.p>}

        {f.notes.length > 0 && (
          <motion.ul className="mt-5 lg:mt-6 flex flex-wrap items-center gap-2" style={st(s5)}>
            {f.notes.slice(0, 4).map((n) => (
              <li key={n} className="px-3.5 py-1.5 rounded-full border text-[13px] font-medium" style={{ borderColor: line }}>{n}</li>
            ))}
            {f.hours && <li className="px-2 py-1.5 text-[13px]" style={{ color: soft }}>Fijación {f.hours}</li>}
          </motion.ul>
        )}

        <motion.div className="mt-5 lg:mt-7 pt-5 lg:pt-6 border-t" style={{ borderColor: line, ...st(s6) }}>
          {f.sizes.length > 1 && <div className="mb-5"><SizePicker sizes={f.sizes} value={size} onChange={setPicked} tone={tone} /></div>}
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <PriceTag price={price} original={original} priceClass="text-[1.6rem] lg:text-[1.85rem] font-semibold leading-none" />
            <span className="text-[14px]" style={{ color: soft }}>{size.ml} ml</span>
            <Availability product={size.product} tone={tone} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <AddButton product={size.product} onAdd={onAdd} tone={tone} className="w-full sm:w-auto sm:min-w-[250px]" />
            <Link to={fichaPath(f)} className="dv-link text-[14px] font-semibold" data-cursor="Ver">Ver ficha completa</Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

// «Para él» como secuencia editorial: la sección queda fija y cada tramo de scroll
// trae una fragancia. Todo avanza con el scroll (sin esperas ni reproducción automática).
// Con movimiento reducido, las fragancias se muestran apiladas, sin fijar nada.
export function FragranceScenes({ fragrances, state, priceOf, onAdd }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const n = fragrances.length
  const [index, setIndex] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  // s: 0 cuando la sección queda fija; sube 1 por cada fragancia
  const s = useTransform(scrollYProgress, (v) => {
    const p0 = 1 / (n + 1)
    return ((v - p0) / (1 - p0)) * n
  })
  useMotionValueEvent(s, 'change', (v) => {
    if (n) setIndex(Math.min(n - 1, Math.max(0, Math.floor(v))))
  })
  const bar = useTransform(s, (v) => Math.min(1, Math.max(0, v / Math.max(1, n))))

  // el fondo alterna carbón y marfil, fundiéndose justo en el cambio de fragancia
  const stops = [0]
  const bgs = [INK]
  const fgs = [IVORY]
  for (let k = 1; k < n; k++) {
    stops.push(k - 0.1, k + 0.02)
    bgs.push(k % 2 ? INK : IVORY, k % 2 ? IVORY : INK)
    fgs.push(k % 2 ? IVORY : INK, k % 2 ? INK : IVORY)
  }
  if (stops.length === 1) {
    stops.push(1)
    bgs.push(INK)
    fgs.push(IVORY)
  }
  const backgroundColor = useTransform(s, stops, bgs)
  const color = useTransform(s, stops, fgs)

  const header = (
    <>
      <p className="dv-label hidden sm:block whitespace-nowrap">02 — La selección</p>
      <h2 id="dv-para-el" className="dv-display text-[clamp(1.75rem,2.6vw,2.5rem)] leading-none whitespace-nowrap">Para él</h2>
    </>
  )

  if (!n) {
    return (
      <section className="px-5 sm:px-10 py-24" aria-labelledby="dv-para-el" data-nav="dark">
        {header}
        <p className="mt-8 text-[15px]" style={{ color: 'var(--dv-mute)' }}>
          {state === 'error' ? 'No pudimos cargar el catálogo. Vuelve a intentar en un momento.' : 'Cargando la selección…'}
        </p>
      </section>
    )
  }

  if (reduce) {
    return (
      <section className="px-5 sm:px-10 py-24" aria-labelledby="dv-para-el" data-nav="dark">
        <div className="flex items-baseline gap-5 mb-12">{header}</div>
        <div className="space-y-24">
          {fragrances.map((f, i) => <Scene key={f.id} f={f} i={i} total={n} flip={i % 2 === 1} light={false} priceOf={priceOf} onAdd={onAdd} />)}
        </div>
      </section>
    )
  }

  const light = index % 2 === 1
  const jump = (i) => {
    const el = ref.current
    const y = el.getBoundingClientRect().top + window.scrollY + (i + 0.5) * window.innerHeight
    if (window.__lenis) window.__lenis.scrollTo(y)
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <section ref={ref} className="relative" style={{ height: `${(n + 1) * 100}vh` }} aria-labelledby="dv-para-el">
      <motion.div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col px-5 sm:px-10" style={{ backgroundColor, color }} data-nav={light ? 'light' : 'dark'}>
        <div className="pt-20 sm:pt-28 flex items-baseline justify-between gap-6 flex-shrink-0">
          <div className="flex items-baseline gap-4 sm:gap-6">{header}</div>
          <Link to="/fragancias?gen=hombre" className="dv-link text-[14px] font-semibold whitespace-nowrap" data-cursor="Ver">Ver toda la línea →</Link>
        </div>

        <div className="relative flex-1 min-h-0 my-4 lg:my-6">
          {fragrances.map((f, i) => (
            <div key={f.id} className="absolute inset-0" inert={i !== index} style={{ pointerEvents: i === index ? 'auto' : 'none' }}>
              <Scene f={f} i={i} total={n} s={s} flip={i % 2 === 1} light={i % 2 === 1} priceOf={priceOf} onAdd={onAdd} />
            </div>
          ))}
        </div>

        {/* avance: se puede saltar directo a cualquier fragancia */}
        <div className="pb-5 sm:pb-7 flex-shrink-0">
          <div className="h-px relative bg-current/20">
            <motion.span className="absolute inset-0 origin-left bg-current" style={{ scaleX: bar }} />
          </div>
          <ol className="dv-noscroll mt-3 flex gap-5 sm:gap-8 overflow-x-auto">
            {fragrances.map((item, i) => (
              <li key={item.id} className="shrink-0">
                <button type="button" onClick={() => jump(i)} aria-current={i === index} className="text-[13px] font-semibold whitespace-nowrap transition-opacity" style={{ opacity: i === index ? 1 : 0.5 }}>
                  <span className="tabular-nums mr-2">{pad(i + 1)}</span>
                  <span className="hidden sm:inline">{item.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>
    </section>
  )
}
