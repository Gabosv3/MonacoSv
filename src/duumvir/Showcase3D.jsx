import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { PriceTag } from '../components/dv-ui'
import ErrorBoundary from '../components/ErrorBoundary'
import { AddButton, Availability, fichaPath, inStock } from './commerce'

// el visor (three.js) se descarga solo cuando la sección se acerca a la pantalla
const BottleViewer = lazy(() => import('./BottleViewer'))

const EASE = [0.19, 1, 0.22, 1]
const VIEWS = [['frente', 'Frente'], ['lateral', 'Lateral'], ['superior', 'Superior'], ['base', 'Base']]

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

// Foto de la fragancia: sustituye al visor 3D cuando el navegador no tiene WebGL o el visor falla.
// `onShown` avisa de que ya hay algo que mostrar (el contenedor espera al visor para aparecer).
function FallbackImage({ fragrance, onShown }) {
  useEffect(() => {
    onShown?.()
  }, [onShown])
  if (!fragrance?.image) return null
  return <img src={fragrance.image} alt="Odyssey Mandarin Sky Limited Edition" className="h-full max-w-[420px] mx-auto object-contain mix-blend-multiply" />
}

// Exhibición 3D de Odyssey Mandarin Sky Limited Edition, justo antes de la selección.
// `fragrance` (opcional) es su ficha del catálogo: da el enlace y la foto de respaldo.
export default function Showcase3D({ fragrance, priceOf, onAdd }) {
  const ref = useRef(null)
  const api = useRef(null)
  const reduce = useReducedMotion()
  const [webgl] = useState(webglAvailable)
  const [near, setNear] = useState(false) // cerca de la pantalla: se monta el visor
  const [visible, setVisible] = useState(false) // en pantalla: se dibuja; fuera, se pausa
  const [ready, setReady] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const far = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    const on = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 })
    far.observe(el)
    on.observe(el)
    return () => {
      far.disconnect()
      on.disconnect()
    }
  }, [])

  // la presentación que se ofrece: la primera disponible
  const size = fragrance ? fragrance.sizes.find((s) => inStock(s.product)) ?? fragrance.sizes[0] : null
  const onInteract = useCallback(() => setTouched(true), [])
  const onReady = useCallback(() => setReady(true), [])
  const act = (fn) => () => {
    setTouched(true)
    fn(api.current)
  }

  const rise = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.9, delay, ease: EASE },
  })
  const ctl = 'min-h-10 px-3 sm:px-3.5 text-[13px] font-semibold text-[#141414] hover:bg-[#141414] hover:text-white transition-colors'

  return (
    <section ref={ref} className="relative overflow-hidden" style={{ background: '#F7F6F2', color: '#141414' }} data-nav="light" aria-labelledby="dv-showcase">
      <div className="relative min-h-[100svh] flex flex-col lg:block px-5 sm:px-10 pt-24 sm:pt-28 pb-8 sm:pb-10">
        {/* visor: ocupa el centro; el texto y los controles quedan en los márgenes */}
        <motion.div
          className="relative h-[54svh] lg:absolute lg:inset-x-0 lg:top-20 lg:bottom-0 lg:h-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: !webgl || ready ? 1 : 0 }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          {webgl ? (
            near && (
              // si el visor no se pudo descargar o dibujar, queda la foto en su lugar (no una página en blanco)
              <ErrorBoundary fallback={<FallbackImage fragrance={fragrance} onShown={onReady} />}>
                <Suspense fallback={null}>
                  <BottleViewer active={visible} reduce={Boolean(reduce)} api={api} onInteract={onInteract} onReady={onReady} />
                </Suspense>
              </ErrorBoundary>
            )
          ) : (
            <FallbackImage fragrance={fragrance} />
          )}
        </motion.div>

        <div className="relative lg:min-h-[calc(100svh-9.5rem)] flex flex-col justify-end pointer-events-none">
          <div className="grid lg:grid-cols-12 gap-x-8 gap-y-6 items-end">
            <div className="lg:col-span-4 pointer-events-auto">
              <motion.p className="dv-label text-[#57534E]" {...rise(0)}>Limited Edition</motion.p>
              <motion.h2 id="dv-showcase" className="dv-display mt-3 text-[clamp(2.4rem,3.8vw,3.75rem)] leading-[1.02] text-balance" {...rise(0.08)}>
                Odyssey Mandarin Sky
              </motion.h2>
              <motion.p className="mt-4 text-[16px] leading-relaxed text-[#57534E]" {...rise(0.14)}>Explora cada ángulo del diseño.</motion.p>
              {fragrance && size && (
                <motion.div className="mt-6" {...rise(0.2)}>
                  {priceOf && (
                    <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <PriceTag price={priceOf(size.product)} original={Number(size.product.price)} priceClass="text-[1.6rem] font-semibold leading-none" color="#141414" />
                      <span className="text-[14px] text-[#57534E]">{size.ml} ml</span>
                      <Availability product={size.product} />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    {onAdd
                      ? <AddButton product={size.product} onAdd={onAdd} className="w-full sm:w-auto sm:min-w-[230px]" />
                      : <Link to={fichaPath(fragrance)} className="dv-btn dv-btn--solid" data-cursor="Ver">Ver fragancia</Link>}
                    {onAdd && <Link to={fichaPath(fragrance)} className="dv-link text-[14px] font-semibold" data-cursor="Ver">Ver ficha completa</Link>}
                  </div>
                </motion.div>
              )}
            </div>

            {webgl && (
              <motion.div className="lg:col-span-8 flex flex-wrap items-center justify-between lg:justify-end gap-x-6 gap-y-4 pointer-events-auto" {...rise(0.26)}>
                <p className="flex items-center gap-2.5 text-[13px] text-[#57534E] transition-opacity duration-700" style={{ opacity: touched ? 0.55 : 1 }}>
                  <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden>
                    <path d="M5 3L1 7l4 4M17 3l4 4-4 4M1 7h20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Arrastra para explorar
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex border border-[#141414]/20 divide-x divide-[#141414]/20" role="group" aria-label="Vistas del producto">
                    {VIEWS.map(([key, label]) => (
                      <button key={key} type="button" className={ctl} onClick={act((a) => a?.view(key))}>{label}</button>
                    ))}
                  </div>
                  <div className="flex border border-[#141414]/20 divide-x divide-[#141414]/20" role="group" aria-label="Zoom">
                    <button type="button" className={`${ctl} w-10 px-0 text-[17px]`} aria-label="Alejar" onClick={act((a) => a?.zoom(1.18))}>−</button>
                    <button type="button" className={`${ctl} w-10 px-0 text-[17px]`} aria-label="Acercar" onClick={act((a) => a?.zoom(1 / 1.18))}>+</button>
                  </div>
                  <button type="button" className={`${ctl} w-10 px-0 border border-[#141414]/20`} aria-label="Volver a la vista inicial" title="Vista inicial" onClick={act((a) => a?.view('inicio'))}>
                    <svg className="mx-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 12a8 8 0 108-8H7m0 0l3-3M7 4l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
