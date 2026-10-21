import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatPrice, sizeLabel } from '../catalog'
import { useSettings } from '../settings'
import { BottlePlaceholder } from './HomeHero'
import { Icon, ICONS, INK, AMBER, display, mono } from './ui'

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.5 },
}

function SectionTitle({ kicker, title, children }) {
  return (
    <motion.div {...fade} className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ ...mono, color: AMBER }}>{kicker}</p>
      <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-tight" style={{ ...display, color: INK }}>{title}</h2>
      {children && <p className="mt-4 text-slate-500 leading-relaxed">{children}</p>}
    </motion.div>
  )
}

const wrap = 'max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12'

const makeTrust = (cfg) => [
  { icon: ICONS.shield, title: 'Batch code garantizado', text: 'Cada frasco sellado se puede verificar.' },
  { icon: ICONS.check, title: 'Decants con sello hermético', text: 'Se despachan cerrados, sin manipular.' },
  { icon: ICONS.truck, title: cfg.coverage, text: `Desde ${cfg.city} para todo El Salvador.` },
  { icon: ICONS.chat, title: 'Asesoría por WhatsApp', text: 'Te ayudamos a elegir tu fragancia.' },
]

const makeSteps = (cfg) => [
  { n: '01', title: 'Elige tu fragancia', text: 'Prueba un decant de 10 ml o ve directo por la botella sellada de 100 ml.' },
  { n: '02', title: 'Confirma por WhatsApp', text: 'Armas tu bolsa, finalizas el pedido y lo coordinamos contigo por chat.' },
  { n: '03', title: 'Recíbelo donde estés', text: `${cfg.coverage} de El Salvador, desde ${cfg.city}.` },
]

const makeFaq = (cfg) => [
  { q: '¿Qué es un decant?', a: 'Es una porción del perfume original trasvasada a un atomizador de 10 ml con sello hermético. Sirve para probar una fragancia antes de comprar la botella completa.' },
  { q: '¿Los frascos son originales?', a: 'Sí. Las botellas se venden selladas y con batch code, para que puedas comprobar su autenticidad.' },
  { q: '¿Cómo hago mi pedido?', a: 'Agrega tus fragancias a la bolsa y pulsa "Finalizar pedido por WhatsApp". Ahí coordinamos pago y entrega contigo.' },
  { q: '¿A dónde entregan?', a: `Somos de ${cfg.city}. ${cfg.coverage} de El Salvador.` },
]

function FragranceCard({ f, priceOf, onAdd, index }) {
  const size = f.sizes.find((s) => s.ml === 10) ?? f.sizes[0]
  const out = size.product.stock != null && size.product.stock <= 0
  const from = Math.min(...f.sizes.map((s) => priceOf(s.product)))
  return (
    <motion.article
      {...fade}
      transition={{ duration: 0.5, delay: (index % 4) * 0.08 }}
      className="group flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden hover:shadow-[0_20px_50px_-20px_rgba(15,26,46,0.3)] transition-shadow"
    >
      <Link to={`/fragancias?q=${encodeURIComponent(f.name)}`} className="relative block aspect-[4/5]" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 60%, ${AMBER}1f, #f6f4f0 75%)` }}>
        {f.code && <span className="absolute left-4 top-4 text-[10px] font-bold uppercase tracking-wider text-slate-400" style={mono}>#{f.code}</span>}
        {f.image ? (
          <img src={f.image} alt={f.name} loading="lazy" className="absolute inset-0 m-auto w-[78%] h-[78%] object-contain drop-shadow-[0_18px_22px_rgba(15,26,46,0.25)] transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <BottlePlaceholder className="absolute inset-0 m-auto w-[45%] h-[60%]" />
        )}
      </Link>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          {f.brand && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400" style={mono}>{f.brand}</p>}
          <h3 className="mt-1 text-lg font-black leading-tight" style={{ ...display, color: INK }}>{f.name}</h3>
        </div>
        {f.notes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {f.notes.slice(0, 3).map((n) => (
              <span key={n} className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] font-semibold text-amber-800">{n}</span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Desde <span className="font-bold" style={{ ...mono, color: INK }}>{formatPrice(from)}</span></p>
          <button
            onClick={() => onAdd(size.product)}
            disabled={out}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
            style={{ backgroundColor: INK }}
          >
            <Icon d={ICONS.bag} size={14} /> {out ? 'Agotado' : `${size.ml} ml`}
          </button>
        </div>
      </div>
    </motion.article>
  )
}

function Faq({ items }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="divide-y divide-neutral-200 border-y border-neutral-200">
      {items.map((item, i) => (
        <div key={item.q}>
          <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="w-full flex items-center justify-between gap-4 py-5 text-left">
            <span className="font-bold" style={{ color: INK }}>{item.q}</span>
            <span className="text-2xl leading-none text-slate-400 flex-shrink-0">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && <p className="pb-5 pr-8 text-slate-500 leading-relaxed">{item.a}</p>}
        </div>
      ))}
    </div>
  )
}

export default function HomeSections({ fragrances, women = [], priceOf, onAdd }) {
  const { cfg, wa } = useSettings()
  const TRUST = makeTrust(cfg)
  const STEPS = makeSteps(cfg)
  const decant = fragrances[0]?.sizes.find((s) => s.ml <= 15)
  const bottle = fragrances[0]?.sizes.find((s) => s.ml > 15)
  const minOf = (pick) => {
    const prices = fragrances.map((f) => f.sizes.find(pick)).filter(Boolean).map((s) => priceOf(s.product))
    return prices.length ? Math.min(...prices) : null
  }
  const decantFrom = minOf((s) => s.ml <= 15)
  const bottleFrom = minOf((s) => s.ml > 15)

  return (
    <>
      {/* confianza */}
      <section className="bg-white border-y border-neutral-200">
        <div className={`${wrap} py-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6`}>
          {TRUST.map((t, i) => (
            <motion.div key={t.title} {...fade} transition={{ duration: 0.5, delay: i * 0.07 }} className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0" style={{ color: AMBER }}><Icon d={t.icon} size={24} /></span>
              <div>
                <p className="text-sm font-bold" style={{ color: INK }}>{t.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{t.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* fragancias (todas salen de la base de datos) */}
      {fragrances.length > 0 && (
        <section className="py-16 lg:py-24" style={{ backgroundColor: '#f6f4f0' }}>
          <div className={wrap}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle kicker="Nuestra selección" title="Nuestras fragancias">
                {fragrances.length === 1 ? 'Una fragancia' : `${fragrances.length} fragancias`} disponibles. Pruébalas en decant o llévate la botella sellada.
              </SectionTitle>
              <Link to="/fragancias" className="text-[12px] font-bold uppercase tracking-wider border-b-2 pb-1" style={{ color: INK, borderColor: AMBER }}>
                Ver todo el catálogo →
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {fragrances.slice(0, 5).map((f, i) => (
                <FragranceCard key={f.id} f={f} index={i} priceOf={priceOf} onAdd={onAdd} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* línea para ella */}
      <section className="py-16 lg:py-24 bg-white">
        <div className={wrap}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle kicker="Para ella" title="Fragancias para mujer">
              Elegidas con el mismo criterio: originales, con estela y larga duración.
            </SectionTitle>
            <Link to="/fragancias?gen=mujer" className="text-[12px] font-bold uppercase tracking-wider border-b-2 pb-1" style={{ color: INK, borderColor: AMBER }}>
              Ver línea para ella →
            </Link>
          </div>
          {women.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {women.slice(0, 5).map((f, i) => (
                <FragranceCard key={f.id} f={f} index={i} priceOf={priceOf} onAdd={onAdd} />
              ))}
            </div>
          ) : (
            <motion.div {...fade} className="mt-10 rounded-3xl p-8 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6" style={{ background: `linear-gradient(120deg, #fdf2f4, #f6f4f0 60%, ${AMBER}1a)` }}>
              <div className="max-w-xl">
                <p className="text-2xl lg:text-3xl font-black uppercase leading-tight" style={{ ...display, color: INK }}>Muy pronto, nuestra línea para ella</p>
                <p className="mt-3 text-slate-600 leading-relaxed">Estamos preparando la selección. Cuéntanos qué aromas te gustan y te asesoramos por WhatsApp mientras tanto.</p>
              </div>
              <a href={wa()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white text-[12px] font-bold uppercase tracking-wider flex-shrink-0" style={{ backgroundColor: INK }}>
                <Icon d={ICONS.chat} size={16} /> Pedir asesoría
              </a>
            </motion.div>
          )}
        </div>
      </section>

      {/* decant vs botella */}
      {decant && bottle && (
        <section className="py-16 lg:py-24 bg-white">
          <div className={wrap}>
            <SectionTitle kicker="Presentaciones" title="Pruébalo antes o llévatelo completo">
              Dos formas de entrar a una fragancia, según cuánto quieras comprometerte.
            </SectionTitle>
            <div className="mt-10 grid md:grid-cols-2 gap-5">
              <motion.div {...fade} className="rounded-3xl p-8 lg:p-10 border border-neutral-200" style={{ backgroundColor: '#f6f4f0' }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400" style={mono}>{sizeLabel(decant.ml)}</p>
                <p className="mt-3 text-5xl font-black" style={{ ...display, color: INK }}>{decant.ml} ml</p>
                <p className="mt-4 text-slate-600 leading-relaxed">Decant con sello hermético. Ideal para probar la fragancia en tu piel durante varios días antes de decidirte por la botella.</p>
                {decantFrom != null && <p className="mt-4 text-sm text-slate-500">Desde <strong style={{ ...mono, color: INK }}>{formatPrice(decantFrom)}</strong></p>}
                <Link to="/fragancias?tam=decant" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl border text-[12px] font-bold uppercase tracking-wider" style={{ color: INK, borderColor: INK }}>
                  Ver decants
                </Link>
              </motion.div>
              <motion.div {...fade} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-3xl p-8 lg:p-10 text-white" style={{ backgroundColor: INK }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50" style={mono}>{sizeLabel(bottle.ml)}</p>
                <p className="mt-3 text-5xl font-black" style={display}>{bottle.ml} ml</p>
                <p className="mt-4 text-white/75 leading-relaxed">Frasco original sellado con batch code garantizado. La experiencia completa, lista para regalar o para tu colección.</p>
                {bottleFrom != null && <p className="mt-4 text-sm text-white/60">Desde <strong style={{ ...mono, color: '#fff' }}>{formatPrice(bottleFrom)}</strong></p>}
                <Link to="/fragancias?tam=botella" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[12px] font-bold uppercase tracking-wider" style={{ color: INK }}>
                  Ver botellas
                </Link>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* cómo comprar */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: '#f6f4f0' }}>
        <div className={wrap}>
          <SectionTitle kicker="Cómo comprar" title="Tu pedido en tres pasos" />
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} {...fade} transition={{ duration: 0.5, delay: i * 0.1 }} className="rounded-2xl bg-white border border-neutral-200 p-7">
                <p className="text-4xl font-black text-neutral-200" style={mono}>{s.n}</p>
                <h3 className="mt-4 text-lg font-black" style={{ ...display, color: INK }}>{s.title}</h3>
                <p className="mt-2 text-slate-500 leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* preguntas */}
      <section className="py-16 lg:py-24 bg-white">
        <div className={`${wrap} grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-20`}>
          <SectionTitle kicker="Preguntas frecuentes" title="Lo que más nos preguntan">
            ¿Otra duda? Escríbenos y te respondemos por WhatsApp.
          </SectionTitle>
          <Faq items={makeFaq(cfg)} />
        </div>
      </section>

      {/* cierre */}
      <section className="py-16 lg:py-20" style={{ backgroundColor: INK }}>
        <div className={`${wrap} flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8`}>
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-black uppercase leading-tight text-white" style={display}>
              Encuentra la fragancia que <span style={{ color: '#f59e0b' }}>habla por ti.</span>
            </h2>
            <p className="mt-4 text-white/65">Cuéntanos qué te gusta y te recomendamos una bestia a tu medida.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={wa()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 text-white text-[12px] font-bold uppercase tracking-wider hover:bg-emerald-400 transition-colors">
              <Icon d={ICONS.chat} size={16} /> Pedir asesoría
            </a>
            <Link to="/fragancias" className="px-6 py-3.5 rounded-xl border border-white/30 text-white text-[12px] font-bold uppercase tracking-wider hover:bg-white/10 transition-colors">
              Ver catálogo
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
