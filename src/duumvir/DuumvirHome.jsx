import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import './duumvir.css'
import { WomenGallery } from './Featured'
import { FragranceScenes } from './Scenes'
import Showcase3D from './Showcase3D'
import { useSettings } from '../settings'
import ingAmbar from '../assets/homev2/ing-ambar.webp'
import ingCafe from '../assets/homev2/ing-cafe.webp'
import ingCardamomo from '../assets/homev2/ing-cardamomo.webp'
import ingCitricos from '../assets/homev2/ing-citricos.webp'
import ingCuero from '../assets/homev2/ing-cuero.webp'
import ingVainilla from '../assets/homev2/ing-vainilla.webp'

const EASE = [0.19, 1, 0.22, 1]
const pad = (n) => String(n).padStart(2, '0')

const NOTES = [
  { label: 'Ámbar', img: ingAmbar },
  { label: 'Cuero', img: ingCuero },
  { label: 'Café', img: ingCafe },
  { label: 'Vainilla', img: ingVainilla },
  { label: 'Cítricos', img: ingCitricos },
  { label: 'Cardamomo', img: ingCardamomo },
]

const MANIFESTO =
  'No vendemos perfume. Vendemos el segundo exacto en que entras y todos voltean. Fragancias originales, elegidas por su estela y su fijación, en decant de 10 ml o en botella sellada.'

// ---------- piezas pequeñas ----------

// Hora local de El Salvador, como detalle editorial de la barra
function useLocalTime() {
  const fmt = () => new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  const [time, setTime] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 30000)
    return () => clearInterval(id)
  }, [])
  return time
}

// Cursor propio: crece y muestra una etiqueta sobre los elementos con data-cursor
function Cursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 })
  const [label, setLabel] = useState(null)
  useEffect(() => {
    const move = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setLabel(e.target.closest?.('[data-cursor]')?.dataset.cursor ?? null)
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [x, y])
  return (
    <motion.div className={`dv-cursor${label ? ' is-active' : ''}`} style={{ x: sx, y: sy }} aria-hidden>
      <div className="dv-cursor-dot">
        <span className="dv-mono" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{label}</span>
      </div>
    </motion.div>
  )
}

// Botón que se deja atraer por el cursor
function Magnetic({ children, className = '', ...rest }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 180, damping: 14 })
  const sy = useSpring(y, { stiffness: 180, damping: 14 })
  return (
    <motion.a
      {...rest}
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * 0.35)
        y.set((e.clientY - r.top - r.height / 2) * 0.35)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.a>
  )
}

// Telón de entrada: contador y marca, una vez por pestaña
function Preloader({ onDone }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1700)
      setN(Math.round((1 - Math.pow(1 - t, 3)) * 100))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setTimeout(onDone, 250)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onDone])
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col justify-between p-6 sm:p-10"
      style={{ background: '#141414', color: '#EDE8DF' }}
      exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
      initial={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      transition={{ duration: 1, ease: EASE }}
    >
      <p className="dv-mono" style={{ color: 'var(--dv-mute)' }}>Masculine fragrance studio · El Salvador</p>
      <div className="overflow-hidden self-center">
        <motion.p
          className="dv-logo text-[13vw] sm:text-[8vw] leading-none whitespace-nowrap px-[0.12em]"
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          Duumvir
        </motion.p>
      </div>
      <div className="flex items-end justify-between">
        <p className="dv-mono" style={{ color: 'var(--dv-mute)' }}>Cargando</p>
        <p className="dv-serif text-6xl sm:text-8xl leading-none tabular-nums">{pad(n)}</p>
      </div>
    </motion.div>
  )
}

// Barra de la tienda (se usa en todas las páginas): se invierte sola según el fondo
// solid: barra clara y opaca para las páginas comerciales (no se mezcla con el contenido)
export function Nav({ itemCount, onCart, solid = false, theme = 'dark' }) {
  const { cfg } = useSettings()
  const time = useLocalTime()
  const navigate = useNavigate()
  const [searching, setSearching] = useState(false)
  const [term, setTerm] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!term.trim()) return
    navigate(`/fragancias?q=${encodeURIComponent(term.trim())}`)
    setSearching(false)
    setTerm('')
  }
  return (
    <header className={`fixed top-0 inset-x-0 z-50 backdrop-blur-md border-b transition-colors duration-500 ${solid ? 'bg-[#F7F6F2]/92 border-[#141414]/10 text-[#141414]' : theme === 'light' ? 'bg-[#EDE8DF]/90 border-[#141414]/10 text-[#141414]' : 'bg-[#141414]/80 border-[#EDE8DF]/10 text-[#EDE8DF]'}`}>
      <div className="flex items-center justify-between gap-4 px-5 sm:px-10 h-16 sm:h-20">
        <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="DUUMVIR, inicio">
          {cfg.logo_url && <img src={cfg.logo_url} alt="" className="w-9 h-9 object-cover" />}
          <span className={`dv-logo text-2xl leading-none ${cfg.logo_url ? 'hidden sm:block' : ''}`}>Duumvir</span>
        </Link>
        {searching ? (
          <form onSubmit={submit} className="flex-1 max-w-md flex items-center gap-3 border-b border-current">
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearching(false)}
              placeholder="Buscar fragancia, casa o nota…"
              aria-label="Buscar fragancia"
              className="flex-1 min-w-0 bg-transparent py-2 text-[15px] outline-none placeholder:text-current placeholder:opacity-50"
            />
            <button type="button" onClick={() => setSearching(false)} className="dv-mono" aria-label="Cerrar búsqueda">✕</button>
          </form>
        ) : (
          <p className="dv-nav hidden lg:block">
            <span style={{ opacity: 0.55 }}>{cfg.city} · </span>{time}
          </p>
        )}
        <nav className="dv-nav flex items-center gap-3.5 sm:gap-8 shrink-0">
          {!searching && <button onClick={() => setSearching(true)} className="dv-link">Buscar</button>}
          <Link to="/fragancias" className={`dv-link ${searching ? 'hidden sm:inline-block' : ''}`}>Catálogo</Link>
          <Link to="/cuenta" className={`dv-link ${searching ? 'hidden sm:inline-block' : ''}`}>Cuenta</Link>
          <button onClick={onCart} className="dv-link">
            Bolsa ({pad(itemCount)})
          </button>
        </nav>
      </div>
    </header>
  )
}

// ---------- hero: MAKE THEM TURN + ventana de video que se abre al hacer scroll ----------

function Hero({ cfg, ready }) {
  const ref = useRef(null)
  const video = useRef(null)
  const reduce = useReducedMotion()
  const [narrow, setNarrow] = useState(() => window.innerWidth < 768)
  // el titular espera al primer gesto de scroll (o se muestra directo con movimiento reducido)
  const [revealed, setRevealed] = useState(() => Boolean(reduce) || window.scrollY > 4)
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 768)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  useEffect(() => {
    if (revealed || !ready) return
    const show = () => setRevealed(true)
    const onKey = (e) => ['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key) && show()
    window.addEventListener('wheel', show, { passive: true })
    window.addEventListener('touchmove', show, { passive: true })
    window.addEventListener('scroll', show, { passive: true })
    window.addEventListener('keydown', onKey)
    // si no hay forma de desplazarse, el mensaje no se queda oculto
    const fallback = setTimeout(show, 7000)
    return () => {
      window.removeEventListener('wheel', show)
      window.removeEventListener('touchmove', show)
      window.removeEventListener('scroll', show)
      window.removeEventListener('keydown', onKey)
      clearTimeout(fallback)
    }
  }, [revealed, ready])

  // reproducción automática; si el navegador la impide, queda la imagen de respaldo
  useEffect(() => {
    const v = video.current
    if (!v) return
    v.muted = true
    const play = () => v.play()?.catch(() => {})
    play()
    v.addEventListener('canplay', play, { once: true })
    return () => v.removeEventListener('canplay', play)
  }, [])

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const clip = useTransform(scrollYProgress, [0, 0.75], [narrow ? 'inset(24% 12% 24% 12%)' : 'inset(17% 30% 17% 30%)', 'inset(0% 0% 0% 0%)'])
  const scale = useTransform(scrollYProgress, [0, 0.75], [1.2, 1])
  const left = useTransform(scrollYProgress, [0, 1], ['0%', '-14%'])
  const right = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const fade = useTransform(scrollYProgress, [0.5, 0.76], [1, 0])
  const hint = useTransform(scrollYProgress, [0, 0.15], [1, 0])
  const dim = useTransform(scrollYProgress, [0.78, 1], [0, 0.72])
  const lift = useTransform(scrollYProgress, [0.6, 1], ['0%', '-10%'])
  const outro = useTransform(scrollYProgress, [0.8, 0.94], [0, 1])

  const line = (text, delay) => (
    <span className="dv-mask">
      <motion.span
        className="block"
        initial={reduce ? false : { y: '112%', opacity: 0 }}
        animate={revealed ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.9, delay, ease: EASE }}
      >
        {text}
      </motion.span>
    </span>
  )

  return (
    <section ref={ref} className="relative h-[230vh]" data-nav="dark">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
          <motion.video
            ref={video}
            className="w-full h-full object-cover"
            style={{ scale }}
            src={cfg.intro_video_url || '/hero/hero-scrub.mp4'}
            poster={cfg.intro_poster_url || '/hero/hero-poster.jpg'}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
          />
          <div className="absolute inset-0 bg-[#141414]/25" />
          <motion.div className="absolute inset-0 bg-[#141414]" style={{ opacity: dim }} />
        </motion.div>

        <motion.h1
          className="dv-serif dv-hero-title absolute inset-0 z-10 flex flex-col justify-center px-5 sm:px-10 mix-blend-difference uppercase pointer-events-none"
          style={{ opacity: fade, y: lift }}
          aria-label="Make them turn"
        >
          <motion.span style={{ x: left }} className="self-start">{line('Make', 0)}</motion.span>
          <motion.span style={{ x: right }} className="self-end">{line('Them', 0.08)}</motion.span>
          <motion.span style={{ x: left }} className="self-center">{line('Turn', 0.16)}</motion.span>
        </motion.h1>

        {/* cierre del hero: da paso a la selección */}
        <motion.div className="absolute z-10 inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none" style={{ opacity: outro }}>
          <p className="dv-label" style={{ color: 'rgba(237,232,223,0.72)' }}>La selección</p>
          <p className="dv-display mt-4 text-[clamp(2.25rem,4.6vw,4.25rem)] leading-[1.02] max-w-[16ch] text-balance">Cada fragancia, a su tiempo.</p>
        </motion.div>

        <div className="absolute z-10 bottom-0 inset-x-0 px-5 sm:px-10 pb-6 sm:pb-8 flex items-end justify-between gap-6">
          <motion.p className="max-w-[30ch] text-[15px] leading-relaxed" style={{ color: 'rgba(237,232,223,0.72)', opacity: hint }}>
            Fragancias originales. Decant 10 ml o botella sellada.
            {cfg.topbar_text && <span className="block mt-1">{cfg.topbar_text}</span>}
          </motion.p>
          <Link to="/fragancias" className="dv-btn dv-btn--ivory shrink-0" data-cursor="Ver">Explorar fragancias</Link>
        </div>
      </div>
    </section>
  )
}

function Marquee() {
  const items = ['Make them turn', 'Originales con batch code', 'Decants con sello hermético', 'Envíos a los 14 departamentos']
  const run = [...items, ...items]
  return (
    <div className="overflow-hidden border-y py-5 sm:py-7" style={{ borderColor: 'var(--dv-line)' }} aria-hidden>
      <div className="dv-marquee">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center">
            {run.map((t, i) => (
              <span key={i} className="flex items-center">
                <span className={`${i % 2 ? 'dv-label' : 'dv-display text-4xl sm:text-5xl'} whitespace-nowrap px-6 sm:px-10`}>{t}</span>
                <span className="w-2 h-2 rounded-full bg-[#EDE8DF]" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Manifiesto: las palabras se encienden con el scroll
function Word({ progress, range, children }) {
  const opacity = useTransform(progress, range, [0.14, 1])
  return <motion.span style={{ opacity }}>{children} </motion.span>
}

function Manifesto() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = MANIFESTO.split(' ')
  return (
    <section className="px-5 sm:px-10 py-28 sm:py-44" style={{ background: '#EDE8DF', color: '#141414' }} data-nav="light">
      <div className="grid md:grid-cols-[1fr_3fr] gap-8 max-w-[1500px] mx-auto">
        <p className="dv-label pt-3">01 — Manifiesto</p>
        <p ref={ref} className="dv-display text-[clamp(2rem,3.5vw,3.5rem)] leading-[1.14] max-w-[26ch] text-balance">
          {words.map((w, i) => (
            <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>{w}</Word>
          ))}
        </p>
      </div>
    </section>
  )
}

// ---------- notas: galería horizontal guiada por el scroll ----------

function Notes({ allNotes }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // la fila avanza hasta que su borde derecho llega al borde de la pantalla
  const x = useTransform(scrollYProgress, [0.04, 0.96], [0, 1], { clamp: true })
  const tx = useTransform(x, (v) => `calc(${-v * 100}% + ${v * 100}vw)`)
  const href = (label) => {
    const match = allNotes.find((n) => n.toLowerCase().startsWith(label.toLowerCase()))
    return match ? `/fragancias?nota=${encodeURIComponent(match)}` : '/fragancias'
  }
  return (
    <section ref={ref} className="relative h-[300vh]" style={{ background: '#EDE8DF', color: '#141414' }} data-nav="light" aria-labelledby="dv-notas">
      {/* pt = alto de la barra + aire: el título nunca queda debajo del logotipo */}
      <div className="sticky top-0 h-[100svh] overflow-hidden grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] pt-24 sm:pt-32 pb-8 sm:pb-10 gap-6 sm:gap-8">
        <header className="px-5 sm:px-10 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-3 items-end">
          <div className="md:col-span-7">
            <p className="dv-label text-[#57534E]">03 — Explorar por notas</p>
            <h2 id="dv-notas" className="dv-display mt-3 text-[clamp(2.5rem,4.6vw,4.25rem)] leading-[1]">Elige por nota</h2>
          </div>
          <p className="md:col-span-5 md:justify-self-end md:text-right text-[16px] leading-relaxed text-[#57534E] max-w-[38ch]">
            Toca una nota y te mostramos las fragancias del catálogo que la llevan.
          </p>
        </header>
        <motion.div className="flex gap-4 sm:gap-6 px-5 sm:px-10 w-max h-full" style={{ x: tx }}>
          {NOTES.map((n, i) => (
            <Link key={n.label} to={href(n.label)} data-cursor="Explorar" className="group relative block h-full aspect-[3/4] overflow-hidden bg-[#141414]">
              <img src={n.img} alt="" decoding="async" fetchPriority="low" className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/80 via-transparent to-transparent" />
              <span className="absolute top-5 left-5 text-[13px] font-medium tabular-nums text-[#EDE8DF]">{pad(i + 1)}</span>
              <span className="dv-display absolute bottom-5 left-5 right-5 text-[#EDE8DF] text-[clamp(1.75rem,2.6vw,2.5rem)] leading-none">{n.label}</span>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ---------- cómo comprar + preguntas ----------

function Process({ cfg }) {
  const steps = [
    ['Elige', 'Prueba un decant de 10 ml o ve directo por la botella sellada.'],
    ['Confirma', 'Armas tu bolsa, finalizas el pedido y lo coordinamos contigo por WhatsApp.'],
    ['Recibe', `${cfg.coverage} de El Salvador, desde ${cfg.city}.`],
  ]
  const faqs = [
    ['¿Qué es un decant?', 'Es una porción del perfume original trasvasada a un atomizador de 10 ml con sello hermético. Sirve para probar una fragancia antes de comprar la botella completa.'],
    ['¿Los frascos son originales?', 'Sí. Las botellas se venden selladas y con batch code, para que puedas comprobar su autenticidad.'],
    ['¿Cómo hago mi pedido?', 'Agrega tus fragancias a la bolsa y finaliza el pedido. Ahí coordinamos pago y entrega contigo por WhatsApp.'],
    ['¿A dónde entregan?', `Somos de ${cfg.city}. ${cfg.coverage} de El Salvador.`],
  ]
  const [open, setOpen] = useState(0)
  return (
    <section className="px-5 sm:px-10 py-24 sm:py-36">
      <p className="dv-label mb-12" style={{ color: 'var(--dv-mute)' }}>04 — Cómo comprar</p>
      <div className="grid md:grid-cols-3 border-t" style={{ borderColor: 'var(--dv-line)' }}>
        {steps.map(([t, d], i) => (
          <motion.div
            key={t}
            className="py-10 md:pr-10 md:pl-10 first:md:pl-0 border-b md:border-b-0 md:border-l first:md:border-l-0"
            style={{ borderColor: 'var(--dv-line)' }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
          >
            <p className="text-[13px] font-medium tabular-nums" style={{ color: 'var(--dv-mute)' }}>Paso {pad(i + 1)}</p>
            <h3 className="dv-serif text-[2.75rem] leading-none mt-5">{t}</h3>
            <p className="mt-4 max-w-[32ch] text-[16px] leading-relaxed" style={{ color: 'rgba(237,232,223,0.72)' }}>{d}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_2fr] gap-10 mt-24 sm:mt-36">
        <h2 className="dv-serif text-[clamp(2.5rem,4.2vw,3.75rem)] leading-[1.02]">Lo que más preguntan</h2>
        <ul>
          {faqs.map(([q, a], i) => (
            <li key={q} className="border-t last:border-b" style={{ borderColor: 'var(--dv-line)' }}>
              <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="w-full flex items-center justify-between gap-6 py-6 text-left">
                <span className="text-lg sm:text-xl">{q}</span>
                <motion.span className="dv-serif text-3xl leading-none" animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.4, ease: EASE }}>+</motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.p
                    className="overflow-hidden max-w-[60ch] text-[16px] leading-relaxed"
                    style={{ color: 'rgba(237,232,223,0.72)' }}
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    <span className="block pb-6">{a}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ---------- cierre + pie ----------

// Texto que ocupa exactamente el ancho de su contenedor (sin cortarse ni desbordar)
function FitText({ children, className = '' }) {
  const box = useRef(null)
  const text = useRef(null)
  useEffect(() => {
    let last = 0
    const fit = (force) => {
      const b = box.current
      const t = text.current
      if (!b || !t) return
      if (!force && b.clientWidth === last) return // solo al cambiar el ancho
      last = b.clientWidth
      t.style.fontSize = '100px'
      const w = t.getBoundingClientRect().width
      if (w > 0) t.style.fontSize = `${(100 * b.clientWidth) / w}px`
    }
    fit(true)
    const ro = new ResizeObserver(() => fit(false))
    ro.observe(box.current)
    document.fonts?.ready.then(() => fit(true))
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={box} className="w-full" aria-hidden>
      {/* inline-block + margen interno: la inclinación de la cursiva entra en la medida */}
      <span ref={text} className={`inline-block px-[0.05em] ${className}`}>{children}</span>
    </div>
  )
}

export function Closing() {
  const { cfg, wa } = useSettings()
  const socials = [['Instagram', cfg.instagram], ['Facebook', cfg.facebook], ['TikTok', cfg.tiktok]].filter(([, url]) => url)
  return (
    <footer className="relative" style={{ background: '#EDE8DF', color: '#141414' }} data-nav="light">
      <div className="px-5 sm:px-10 pt-24 sm:pt-36 grid md:grid-cols-[2fr_1fr] gap-12 items-end">
        <h2 className="dv-serif text-[clamp(2.75rem,5vw,4.75rem)] leading-[1.02] max-w-[15ch] text-balance">Encuentra la fragancia que habla por ti.</h2>
        <div className="md:justify-self-end md:text-right">
          <p className="max-w-[32ch] md:ml-auto text-[16px] leading-relaxed text-[#57534E]">
            Cuéntanos qué te gusta y te recomendamos una a tu medida.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 md:justify-end">
            <Magnetic href={wa('Hola, quiero asesoría para elegir una fragancia.')} target="_blank" rel="noopener noreferrer" className="dv-btn dv-btn--solid" data-cursor="Chat">
              Pedir asesoría
            </Magnetic>
            <Link to="/fragancias" className="dv-btn dv-btn--line" data-cursor="Ver">Ver catálogo</Link>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-10 mt-20 sm:mt-28 pt-10 border-t border-[#141414]/15 grid grid-cols-2 md:grid-cols-4 gap-8 text-[15px]">
        <div>
          <p className="dv-label mb-4 text-[#57534E]">Tienda</p>
          <ul className="space-y-2">
            <li><Link className="dv-link" to="/fragancias">Todo el catálogo</Link></li>
            <li><Link className="dv-link" to="/fragancias?tam=decant">Decants 10 ml</Link></li>
            <li><Link className="dv-link" to="/fragancias?tam=botella">Botellas selladas</Link></li>
          </ul>
        </div>
        <div>
          <p className="dv-label mb-4 text-[#57534E]">Duumvir</p>
          <ul className="space-y-2">
            <li><Link className="dv-link" to="/cuenta">Mi cuenta</Link></li>
            <li><Link className="dv-link" to="/nosotros">Nosotros</Link></li>
            <li><Link className="dv-link" to="/contacto">Contacto</Link></li>
          </ul>
        </div>
        <div>
          <p className="dv-label mb-4 text-[#57534E]">Contacto</p>
          <ul className="space-y-2">
            <li>{cfg.city}, El Salvador</li>
            <li><a className="dv-link" href={wa()} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
            {cfg.contact_email && <li><a className="dv-link" href={`mailto:${cfg.contact_email}`}>{cfg.contact_email}</a></li>}
          </ul>
        </div>
        {socials.length > 0 && (
          <div>
            <p className="dv-label mb-4 text-[#57534E]">Redes</p>
            <ul className="space-y-2">
              {socials.map(([name, url]) => (
                <li key={name}><a className="dv-link" href={url} target="_blank" rel="noopener noreferrer">{name}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="px-5 sm:px-10 mt-16 sm:mt-24"><FitText className="dv-logo dv-wordmark uppercase select-none">Duumvir</FitText></div>
      <div className="px-5 sm:px-10 pt-6 pb-6 flex flex-wrap justify-between gap-3 text-[13px] text-[#57534E]">
        <span>© {new Date().getFullYear()} Duumvir · Make them turn</span>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="dv-link">Volver arriba ↑</button>
      </div>
    </footer>
  )
}

// ---------- página ----------

export default function DuumvirHome({ fragrances, women = [], allFragrances = [], state, priceOf, onAdd, itemCount, onCart }) {
  const { cfg } = useSettings()
  const reduce = useReducedMotion()
  const [loading, setLoading] = useState(() => !reduce && sessionStorage.getItem('duumvir_intro_seen') !== '1')
  const allNotes = useMemo(() => [...new Set(allFragrances.flatMap((f) => f.notes))], [allFragrances])
  const [navTheme, setNavTheme] = useState('dark')

  useEffect(() => {
    const read = () => {
      const under = document.elementsFromPoint(window.innerWidth / 2, 96).find((el) => !el.closest('header') && el.closest('[data-nav]'))
      setNavTheme(under?.closest('[data-nav]').dataset.nav === 'light' ? 'light' : 'dark')
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    // las escenas cambian de fondo sin mover el scroll: se vuelve a leer cada poco
    const tick = setInterval(read, 300)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
      clearInterval(tick)
    }
  }, [])

  // scroll con inercia
  useEffect(() => {
    if (reduce) return
    const lenis = new Lenis({ duration: 1.15 })
    window.__lenis = lenis
    let raf = requestAnimationFrame(function loop(t) {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    })
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      window.__lenis = null
    }
  }, [reduce])

  const done = () => {
    sessionStorage.setItem('duumvir_intro_seen', '1')
    setLoading(false)
  }

  return (
    <div className="dv">
      <AnimatePresence>{loading && <Preloader onDone={done} />}</AnimatePresence>
      <div className="dv-grain" aria-hidden />
      <Cursor />
      <Nav itemCount={itemCount} onCart={onCart} theme={navTheme} />
      <main>
        <Hero cfg={cfg} ready={!loading} />
        <Marquee />
        <Manifesto />
        <Showcase3D fragrance={allFragrances.find((f) => /mandarin sky/i.test(f.name))} priceOf={priceOf} onAdd={onAdd} />
        <FragranceScenes fragrances={fragrances} state={state} priceOf={priceOf} onAdd={onAdd} />
        <Notes allNotes={allNotes} />
        {women.length > 0 && <WomenGallery fragrances={women} priceOf={priceOf} onAdd={onAdd} />}
        <Process cfg={cfg} />
      </main>
      <Closing />
    </div>
  )
}
