import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import logoImg from '../assets/logo.webp'
import heroKhamrahImg from '../assets/hero-khamrah-cut.webp'
import heroAsadZanzibarImg from '../assets/hero-asad-zanzibar-cut.webp'
import heroAsadImg from '../assets/hero-asad-cut.webp'
import heroMandarinSkyImg from '../assets/hero-mandarin-sky-cut.webp'
import philosophyImg from '../assets/homev2/philosophy.webp'
import closingImg from '../assets/homev2/closing.webp'
import ingCafeImg from '../assets/homev2/ing-cafe.webp'
import ingCardamomoImg from '../assets/homev2/ing-cardamomo.webp'
import ingCueroImg from '../assets/homev2/ing-cuero.webp'
import ingCitricosImg from '../assets/homev2/ing-citricos.webp'
import ingVainillaImg from '../assets/homev2/ing-vainilla.webp'
import ingAmbarImg from '../assets/homev2/ing-ambar.webp'
import ingFloresImg from '../assets/homev2/ing-flores.webp'

// Página de PRUEBA — prototipo visual del nuevo diseño (fondo negro, acentos
// dorados, secciones numeradas). No toca la Home real ni el carrito; es solo
// para revisar el look antes de decidir si se integra de verdad.

const GOLD = '#c9a24a'

const NAV = [
  { label: 'Inicio', to: '/home-prueba', active: true },
  { label: 'Fragancias', to: '/fragancias' },
  { label: 'Categorías', to: '/fragancias' },
  { label: 'Guía', to: '/fragancias' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Contacto', to: '/contacto' },
]

const FRAGRANCES = [
  {
    id: 1,
    name: 'Khamrah Qahwa',
    brand: 'Lattafa',
    desc: 'Dulce. Especiada. Adictiva.',
    family: 'Amaderada Especiada Gourmand',
    image: heroKhamrahImg,
  },
  {
    id: 2,
    name: 'Asad Zanzibar',
    brand: 'Lattafa',
    desc: 'Fresca. Moderna. Inolvidable.',
    family: 'Aromática Fougère',
    image: heroAsadZanzibarImg,
  },
  {
    id: 3,
    name: 'Asad Elixir',
    brand: 'Lattafa',
    desc: 'Intensa. Sofisticada. Poderosa.',
    family: 'Amaderada Oriental',
    image: heroAsadImg,
  },
  {
    id: 4,
    name: 'Mandarin Sky',
    brand: 'Fragrance World',
    desc: 'Cítrica. Vibrante. Moderna.',
    family: 'Cítrica Aromática',
    image: heroMandarinSkyImg,
  },
]

const PROFILES = [
  {
    label: 'Cálido',
    desc: 'Notas envolventes que dejan una sensación inolvidable.',
    notes: 'Ámbar · Vainilla · Especias',
    featured: false,
  },
  {
    label: 'Intenso',
    tag: 'Más popular',
    desc: 'Para hombres que imponen su presencia con cada paso.',
    notes: 'Oud · Cuero · Maderas',
    recommended: 'Asad Elixir',
    featured: true,
  },
  {
    label: 'Fresco',
    desc: 'Energía y sofisticación en perfecta armonía.',
    notes: 'Cítricos · Acuáticas · Aromáticas',
    featured: false,
  },
  {
    label: 'Elegante',
    desc: 'Clásicos atemporales para un estilo único.',
    notes: 'Iris · Maderas Nobles · Almizcle',
    featured: false,
  },
]

const INGREDIENTS = [
  { label: 'Café', image: ingCafeImg, featured: false },
  {
    label: 'Cardamomo',
    image: ingCardamomoImg,
    featured: true,
    desc: 'Especiado y vibrante. Aporta carácter y distinción.',
    presentIn: ['Asad Zanzibar', 'Asad Elixir'],
  },
  { label: 'Cuero', image: ingCueroImg, featured: false },
  { label: 'Cítricos', image: ingCitricosImg, featured: false },
  { label: 'Vainilla', image: ingVainillaImg, featured: false },
  { label: 'Ámbar', image: ingAmbarImg, featured: false },
  { label: 'Flores Blancas', image: ingFloresImg, featured: false },
]

const FOOTER_NAV = ['Inicio', 'Fragancias', 'Categorías', 'Nosotros', 'Contacto']
const FOOTER_CATEGORIES = ['Árabes', 'Amaderadas', 'Cítricas', 'Especiadas', 'Frescas', 'Gourmand']
const FOOTER_HELP = ['Preguntas frecuentes', 'Envíos', 'Cambios y devoluciones', 'Términos y condiciones', 'Política de privacidad']

const WHATSAPP_NUMBER = '573000000000'

const EASE = [0.16, 1, 0.3, 1]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 32, scale: 0.98 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.7, delay, ease: EASE },
  }
}

function NumberedSection({ n, label, children, className = '' }) {
  return (
    <section className={`relative border-t border-white/10 overflow-hidden ${className}`}>
      {/* número gigante fantasma, de fondo — refuerza la identidad de marca */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute -top-6 sm:-top-10 right-2 sm:right-6 text-[7rem] sm:text-[11rem] lg:text-[14rem] font-black leading-none text-transparent"
        style={{ WebkitTextStroke: '1px rgba(255,255,255,0.06)' }}
      >
        {n}
      </span>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24 flex gap-6 lg:gap-10">
        <div className="hidden md:flex flex-col items-center flex-shrink-0 w-10">
          <span className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>
            {n}
          </span>
          <motion.span
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="mt-3 flex-1 w-px bg-white/15 origin-top"
          />
          <span
            className="mt-3 text-[9px] uppercase tracking-[0.2em] text-neutral-400 leading-tight text-center"
            style={{ writingMode: 'vertical-rl' }}
          >
            {label}
          </span>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </section>
  )
}

function PhotoPlaceholder({ className = '', gradient, image, alt = '', zoom = false }) {
  if (image) {
    return (
      <div className={`relative overflow-hidden group ${className}`}>
        <img
          src={image}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out ${
            zoom ? 'group-hover:scale-[1.06]' : ''
          }`}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.35) 100%)' }}
        />
      </div>
    )
  }
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background:
          gradient ||
          'radial-gradient(120% 100% at 30% 20%, #2a2a28 0%, #17140f 55%, #0a0a0a 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
    </div>
  )
}

export default function HomeV2() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-x-clip">
      {/* textura de grano sutil sobre toda la página — refuerza el look cinematográfico */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* WhatsApp flotante — siempre visible, impulsa el contacto directo */}
      <motion.a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        whileHover={{ scale: 1.08 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        style={{ backgroundColor: '#25D366' }}
        aria-label="Escríbenos por WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.47 1.29 4.92L2 22l5.29-1.39a9.87 9.87 0 004.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 17.93h-.01a8.23 8.23 0 01-4.2-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.2 8.2 0 01-1.26-4.4c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.28-8.21 8.28zm4.51-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.17 1.73 2.64 4.19 3.7.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29z" />
        </svg>
      </motion.a>

      {/* aviso de prototipo — no aparece en la tienda real */}
      <div className="bg-amber-400 text-neutral-900 text-center text-[11px] sm:text-xs font-semibold uppercase tracking-widest py-2 px-4">
        Página de prueba — nuevo diseño, aún no es la Home real ·{' '}
        <Link to="/" className="underline underline-offset-2">
          Ver Home actual
        </Link>
      </div>

      {/* header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between gap-6">
          <Link to="/home-prueba" className="flex items-center gap-2 flex-shrink-0">
            <img src={logoImg} alt="MonacoSV" className="w-9 h-9 object-contain rounded-full" />
            <div className="leading-tight">
              <div className="text-lg font-extrabold tracking-tight">
                Monaco<span style={{ color: GOLD }}>SV</span>
              </div>
              <div className="text-[8px] uppercase tracking-[0.25em] text-neutral-500">
                Fragancias con carácter
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {NAV.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`text-[11px] uppercase tracking-[0.2em] pb-1 border-b transition-colors ${
                  link.active
                    ? 'text-white border-current'
                    : 'text-neutral-400 border-transparent hover:text-white'
                }`}
                style={link.active ? { color: GOLD, borderColor: GOLD } : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-5 text-neutral-300 flex-shrink-0">
            <button aria-label="Buscar" className="hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button aria-label="Cuenta" className="hidden sm:inline hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4.5 20c1.4-3.2 4.3-5 7.5-5s6.1 1.8 7.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative hover:text-white transition-colors"
              aria-label="Carrito"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2m4 3l1.5 9M9 21a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* 01 — hero */}
      <NumberedSection n="01" label="UNA MEJOR VERSIÓN DE TI">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8 items-center">
          <div>
            <motion.span
              {...fadeUp(0)}
              className="block text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-4"
            >
              Fragancias originales &nbsp;|&nbsp; Hombres con presencia
            </motion.span>
            <motion.h1
              {...fadeUp(0.05)}
              className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.9] mb-5 tracking-tight"
            >
              Fragancias
              <br />
              con <span style={{ color: GOLD }}>carácter</span>
            </motion.h1>
            <motion.p {...fadeUp(0.1)} className="max-w-md text-neutral-400 text-base sm:text-lg mb-9">
              Una selección curada de fragancias originales para hombres que buscan presencia y
              estilo.
            </motion.p>
            <motion.div {...fadeUp(0.15)} className="flex flex-wrap items-center gap-4">
              <Link
                to="/fragancias"
                className="group inline-flex items-center gap-2 px-8 py-4 text-sm uppercase tracking-widest font-bold text-neutral-900 transition-transform hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(201,162,74,0.35)]"
                style={{ backgroundColor: GOLD }}
              >
                Descubrir colección
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors border-b border-white/20 hover:border-white pb-1"
              >
                Escríbenos
              </a>
            </motion.div>
          </div>

          <motion.div
            {...fadeUp(0.1)}
            className="relative w-full max-w-[280px] sm:max-w-[340px] mx-auto md:mx-0"
          >
            {/* resplandor ambiental detrás del frasco */}
            <motion.div
              aria-hidden
              className="absolute -inset-10 -z-10 rounded-full blur-3xl"
              style={{ background: `radial-gradient(closest-side, ${GOLD}33, transparent 70%)` }}
              animate={{ opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span
              className="absolute -top-3 -left-3 z-10 text-[9px] uppercase tracking-widest font-bold px-3 py-1.5 text-neutral-900"
              style={{ backgroundColor: GOLD }}
            >
              Más vendido
            </span>
            <motion.div
              className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10"
              style={{ background: 'radial-gradient(120% 100% at 70% 30%, #2a2118 0%, #100c08 60%, #0a0a0a 100%)' }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src={heroKhamrahImg}
                alt="Khamrah Qahwa"
                className="absolute inset-0 w-full h-full object-contain p-8 drop-shadow-[0_20px_28px_rgba(0,0,0,0.6)]"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* franja de las 4 fragancias */}
        <motion.div
          {...fadeUp(0.2)}
          className="mt-12 border-t border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"
        >
          {FRAGRANCES.map((f, i) => (
            <Link
              to="/fragancias"
              key={f.id}
              className={`group flex items-center gap-3 px-4 py-5 border-white/10 transition-colors hover:bg-white/5 ${
                i > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''
              } ${i === 0 ? 'ring-1 ring-inset' : ''}`}
              style={i === 0 ? { boxShadow: `inset 0 0 0 1px ${GOLD}55` } : undefined}
            >
              <img
                src={f.image}
                alt={f.name}
                className="w-9 h-11 object-contain flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide truncate">{f.name}</p>
                <p className="text-[10px] text-neutral-500">{f.brand}</p>
              </div>
            </Link>
          ))}
          <Link
            to="/fragancias"
            className="hidden lg:flex items-center justify-center gap-2 px-4 py-5 border-l border-white/10 text-[11px] uppercase tracking-[0.2em] hover:bg-white/5 transition-colors"
            style={{ color: GOLD }}
          >
            Explorar todas →
          </Link>
        </motion.div>
      </NumberedSection>

      {/* 02 — filosofía */}
      <NumberedSection n="02" label="NUESTRA FILOSOFÍA">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr_auto] gap-8 lg:gap-10 items-center">
          <div>
            <motion.span {...fadeUp(0)} className="block text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-4">
              Más que fragancias, elecciones
            </motion.span>
            <motion.h2 {...fadeUp(0.05)} className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-tight mb-5">
              No vendemos cualquier fragancia.
              <br />
              <span style={{ color: GOLD }}>Seleccionamos las que dejan huella.</span>
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-neutral-400 text-sm sm:text-base mb-8 max-w-md">
              En MonacoSV somos curadores de fragancias originales. Seleccionamos cada aroma
              pensando en hombres que buscan más que oler bien: buscan expresar quiénes son.
            </motion.p>
            <motion.div {...fadeUp(0.15)}>
              <Link
                to="/fragancias"
                className="group inline-flex items-center gap-2 px-6 py-3 text-sm uppercase tracking-widest font-bold text-neutral-900 transition-transform hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(201,162,74,0.35)]"
                style={{ backgroundColor: GOLD }}
              >
                Conoce nuestra selección
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>
          </div>

          <motion.div {...fadeUp(0.1)}>
            <PhotoPlaceholder
              className="aspect-[4/5] rounded-2xl border border-white/10"
              image={philosophyImg}
              alt="Hombre con estilo ajustando su puño de camisa"
              zoom
            />
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="hidden lg:flex flex-col gap-4 text-right">
            {['Carácter', 'Estilo', 'Presencia', 'Historias'].map((w) => (
              <span key={w} className="text-xs uppercase tracking-[0.25em] text-neutral-500 flex items-center justify-end gap-3">
                {w}
                <span className="w-6 h-px bg-white/20" />
              </span>
            ))}
            <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-neutral-600 max-w-[9rem] ml-auto">
              En cada fragancia hay un hombre.
            </p>
          </motion.div>
        </div>
      </NumberedSection>

      {/* 03 — encuentra tu carácter */}
      <NumberedSection n="03" label="TU CARÁCTER EN UN AROMA">
        <motion.div {...fadeUp(0)} className="text-center mb-10">
          <span className="block text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
            Encuentra tu esencia
          </span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase">
            Encuentra tu <span style={{ color: GOLD }}>carácter</span>
          </h2>
          <p className="mt-3 text-neutral-400 text-sm max-w-lg mx-auto">
            Distintos hombres, la misma esencia: presencia, estilo y un aroma que te represente.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROFILES.map((p, i) => (
            <motion.div
              key={p.label}
              {...fadeUp(i * 0.08)}
              whileHover={{ y: -6, borderColor: `${GOLD}99`, transition: { duration: 0.25 } }}
              className="relative border p-5 flex flex-col cursor-pointer"
              style={{ borderColor: p.featured ? `${GOLD}66` : 'rgba(255,255,255,0.1)' }}
            >
              {p.tag && (
                <span
                  className="absolute top-3 right-3 text-[9px] uppercase tracking-widest px-2 py-1 text-neutral-900 font-bold"
                  style={{ backgroundColor: GOLD }}
                >
                  {p.tag}
                </span>
              )}
              <PhotoPlaceholder
                className="aspect-square rounded-lg mb-5"
                zoom
                gradient={
                  p.featured
                    ? 'radial-gradient(120% 100% at 30% 20%, #3a2c12 0%, #17140f 55%, #0a0a0a 100%)'
                    : undefined
                }
              />
              <h3 className="text-xl font-black uppercase mb-2">{p.label}</h3>
              <p className="text-xs text-neutral-400 mb-3 flex-1">{p.desc}</p>
              {p.recommended && (
                <p className="text-[11px] text-neutral-500 mb-3">
                  Fragancia recomendada
                  <br />
                  <span className="font-semibold" style={{ color: GOLD }}>
                    {p.recommended}
                  </span>
                </p>
              )}
              <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-600 mb-4">{p.notes}</p>
              <button
                className="inline-flex items-center justify-between text-[11px] uppercase tracking-[0.2em] border-t border-white/10 pt-3 hover:text-white transition-colors"
                style={{ color: GOLD }}
              >
                Explorar
                <span
                  className="w-6 h-6 rounded-full border flex items-center justify-center text-xs"
                  style={{ borderColor: `${GOLD}66` }}
                >
                  +
                </span>
              </button>
            </motion.div>
          ))}
        </div>
      </NumberedSection>

      {/* 04 — la colección */}
      <NumberedSection n="04" label="LA CURACIÓN MONACOSV">
        <motion.div {...fadeUp(0)} className="text-center mb-10">
          <span className="block text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
            Fragancias originales &nbsp;|&nbsp; Una selección, muchas historias
          </span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase">
            La <span style={{ color: GOLD }}>colección</span>
          </h2>
          <p className="mt-3 text-neutral-400 text-sm max-w-lg mx-auto">
            En MonacoSV curamos una selección de fragancias originales de las mejores casas del
            mundo para hombres que buscan presencia, estilo y un aroma que los represente.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FRAGRANCES.map((f, i) => (
            <motion.div
              key={f.id}
              {...fadeUp(i * 0.08)}
              whileHover={{ y: -8, borderColor: `${GOLD}66`, transition: { duration: 0.25 } }}
              className="group border border-white/10 flex flex-col cursor-pointer"
            >
              <div
                className="aspect-[4/5] flex items-center justify-center p-6 overflow-hidden"
                style={{ background: `radial-gradient(120% 100% at 60% 20%, ${GOLD}14 0%, #0f0f0f 60%)` }}
              >
                <img
                  src={f.image}
                  alt={f.name}
                  className="w-full h-full object-contain drop-shadow-[0_16px_20px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-out group-hover:scale-110"
                />
              </div>
              <div className="p-5 border-t border-white/10 flex-1 flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-wide">{f.name}</h3>
                <p className="text-[11px] text-neutral-500 mb-2">{f.brand}</p>
                <p className="text-xs text-neutral-400 mb-3">{f.desc}</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 mb-4">
                  Familia olfativa
                  <br />
                  {f.family}
                </p>
                <Link
                  to="/fragancias"
                  className="mt-auto inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] border-t border-white/10 pt-3 hover:text-white transition-colors"
                  style={{ color: GOLD }}
                >
                  Ver detalles →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </NumberedSection>

      {/* 05 — ingredientes */}
      <NumberedSection n="05" label="INGREDIENTES QUE DEJAN HUELLA">
        <motion.div {...fadeUp(0)} className="text-center mb-10">
          <span className="block text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-3">
            Naturaleza. Ciencia. Emoción.
          </span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase">
            De qué está hecha tu <span style={{ color: GOLD }}>presencia</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {INGREDIENTS.map((ing, i) => (
            <motion.div
              key={ing.label}
              {...fadeUp(i * 0.05)}
              whileHover={{ y: -4, borderColor: `${GOLD}99`, transition: { duration: 0.25 } }}
              className={`relative aspect-square border overflow-hidden flex flex-col justify-end p-3 cursor-pointer ${
                ing.featured ? 'col-span-2 row-span-1' : ''
              }`}
              style={{ borderColor: ing.featured ? `${GOLD}66` : 'rgba(255,255,255,0.1)' }}
            >
              <PhotoPlaceholder className="absolute inset-0" image={ing.image} alt={ing.label} zoom />
              <div className="relative">
                {ing.featured ? (
                  <>
                    <p className="text-sm font-bold uppercase" style={{ color: GOLD }}>
                      {ing.label}
                    </p>
                    <p className="text-[10px] text-neutral-300 mt-1">{ing.desc}</p>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-500 mt-2">
                      Presente en
                      <br />
                      {ing.presentIn.join(' · ')}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] uppercase tracking-widest">{ing.label}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </NumberedSection>

      {/* 06 — cierre */}
      <NumberedSection n="06" label="TU HISTORIA TAMBIÉN DEJA HUELLA">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_220px] gap-8 items-center">
          <div>
            <motion.span {...fadeUp(0)} className="block text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-4">
              El aroma adecuado, en el momento correcto
            </motion.span>
            <motion.h2 {...fadeUp(0.05)} className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-tight mb-5">
              Tu fragancia habla <span style={{ color: GOLD }}>antes que tú.</span>
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-neutral-400 text-sm sm:text-base mb-8 max-w-md">
              Encuentra el aroma que se alinea con tu estilo, tu presencia y tu historia.
            </motion.p>
            <motion.div {...fadeUp(0.15)}>
              <Link
                to="/fragancias"
                className="group inline-flex items-center gap-2 px-6 py-3 text-sm uppercase tracking-widest font-bold text-neutral-900 transition-transform hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(201,162,74,0.35)]"
                style={{ backgroundColor: GOLD }}
              >
                Descubrir tu fragancia
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>
          </div>

          <motion.div {...fadeUp(0.1)} className="hidden md:flex flex-col gap-5 text-xs uppercase tracking-[0.15em] text-neutral-400">
            {[
              ['◆', 'Fragancias originales'],
              ['◆', 'Pago seguro y confiable'],
              ['◆', 'Envíos a todo el país'],
            ].map(([icon, text]) => (
              <span key={text} className="flex items-center gap-3">
                <span style={{ color: GOLD }}>{icon}</span>
                {text}
              </span>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.15)}>
            <PhotoPlaceholder
              className="w-full max-w-[220px] aspect-[3/4] rounded-2xl border border-white/10"
              image={closingImg}
              alt="Hombre elegante mirando la ciudad de noche"
              zoom
            />
          </motion.div>
        </div>
      </NumberedSection>

      {/* footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="text-lg font-extrabold tracking-tight mb-1">
              Monaco<span style={{ color: GOLD }}>SV</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-4">
              Fragancias con carácter
            </p>
            <p className="text-xs text-neutral-500 italic max-w-[16rem]">
              "Los hombres memorables también huelen diferente."
            </p>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Navegación</h4>
            <ul className="space-y-2 text-sm text-neutral-300">
              {FOOTER_NAV.map((l) => (
                <li key={l}>
                  <Link to={l === 'Inicio' ? '/' : '/fragancias'} className="hover:text-white transition-colors">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Categorías</h4>
            <ul className="space-y-2 text-sm text-neutral-300">
              {FOOTER_CATEGORIES.map((l) => (
                <li key={l}>
                  <Link to="/fragancias" className="hover:text-white transition-colors">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Ayuda</h4>
            <ul className="space-y-2 text-sm text-neutral-300">
              {FOOTER_HELP.map((l) => (
                <li key={l} className="hover:text-white transition-colors cursor-default">
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  WhatsApp
                </a>
              </li>
              <li>hola@monacosv.com</li>
              <li>San Salvador, El Salvador</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-neutral-500">
            <span>© 2026 MonacoSV. Todos los derechos reservados.</span>
            <span>Fragancias originales · Pago seguro</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
