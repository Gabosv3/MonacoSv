import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrice, sizeLabel } from '../catalog'
import { useSettings } from '../settings'
import { Icon, ICONS, INK, AMBER, display, mono, PriceTag } from './ui'

// Sin foto, se muestra una silueta de frasco en vez de una imagen rota.
export function BottlePlaceholder({ className = '' }) {
  return (
    <svg viewBox="0 0 120 160" className={className} aria-hidden fill="none">
      <rect x="44" y="6" width="32" height="20" rx="5" fill="#cbd5e1" />
      <rect x="50" y="24" width="20" height="10" fill="#94a3b8" />
      <rect x="22" y="34" width="76" height="116" rx="16" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="36" y="62" width="48" height="52" rx="6" fill="#f8fafc" />
    </svg>
  )
}

// fragrances: salida de buildFragrances() (todo viene de la base de datos).
// state: 'loading' | 'ready' | 'error'. priceOf(product) devuelve el precio final
// (con descuentos activos); onAdd(product) mete la presentación al carrito.
export default function HomeHero({ fragrances, state = 'ready', priceOf, onAdd }) {
  const { cfg, wa } = useSettings()
  const titleLines = cfg.hero_title.split('\n').filter(Boolean)
  const [index, setIndex] = useState(0)
  const [ml, setMl] = useState(null)

  const f = fragrances[Math.min(index, fragrances.length - 1)]

  // presentación elegida: la misma de antes si esta fragancia la tiene; si no,
  // la de 10 ml (viajero) o, en su defecto, la más pequeña.
  const size = f ? f.sizes.find((s) => s.ml === ml) ?? f.sizes.find((s) => s.ml === 10) ?? f.sizes[0] : null
  const soldOut = (s) => s.product.stock != null && s.product.stock <= 0
  const price = size ? priceOf(size.product) : 0
  const original = size ? Number(size.product.price) : 0

  return (
    <section
      className="relative overflow-hidden lg:h-[calc(100svh-177px)] lg:min-h-[560px]"
      style={{
        backgroundColor: '#f6f4f0',
        backgroundImage: `radial-gradient(ellipse 55% 70% at 85% 40%, ${AMBER}1f, transparent 70%), radial-gradient(ellipse 45% 60% at 0% 100%, ${INK}12, transparent 70%)`,
      }}
    >
      <div className="max-w-[1500px] mx-auto h-full px-4 sm:px-6 lg:px-12 py-8 lg:py-6 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 lg:gap-12 items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white shadow-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={mono}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AMBER }} />
            {cfg.hero_kicker}
          </span>

          <h1 className="mt-4 lg:mt-5 font-black uppercase leading-[0.95] tracking-tight text-[2.4rem] sm:text-5xl lg:text-[clamp(2.4rem,7.4vh,4.6rem)]" style={{ ...display, color: INK }}>
            {titleLines.slice(0, -1).map((line) => (
              <span key={line}>{line}<br /></span>
            ))}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(90deg, ${INK} 20%, ${AMBER} 80%)` }}>
              {titleLines[titleLines.length - 1]}
            </span>
          </h1>

          <p className="mt-4 lg:mt-5 max-w-lg text-sm sm:text-base text-slate-500 leading-relaxed [@media(min-width:1024px)_and_(max-height:820px)]:hidden">
            {cfg.hero_text}
          </p>

          {!f ? (
            <div className="mt-6 lg:mt-8 max-w-[560px] rounded-2xl border border-neutral-200/80 bg-white shadow-[0_10px_40px_-12px_rgba(15,26,46,0.18)] p-5 sm:p-6">
              {state === 'loading' ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-neutral-200" />
                  <div className="h-8 w-2/3 rounded bg-neutral-200" />
                  <div className="h-24 rounded-xl bg-neutral-100" />
                </div>
              ) : (
                <>
                  <p className="text-lg font-black" style={{ ...display, color: INK }}>
                    {state === 'error' ? 'No pudimos cargar el catálogo' : 'Estamos preparando el catálogo'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {state === 'error'
                      ? 'Revisa tu conexión e inténtalo de nuevo en un momento.'
                      : 'Muy pronto verás aquí nuestras fragancias. Mientras tanto, escríbenos y te asesoramos.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {state === 'error' && (
                      <button onClick={() => window.location.reload()} className="px-5 py-3 rounded-xl border border-neutral-200 text-[11px] font-bold uppercase tracking-wider" style={{ color: INK }}>Reintentar</button>
                    )}
                    <a href={wa()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: INK }}>
                      <Icon d={ICONS.chat} size={15} /> Escribir por WhatsApp
                    </a>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-6 lg:mt-[clamp(1rem,3.4vh,2rem)] max-w-[560px] rounded-2xl border border-neutral-200/80 bg-white shadow-[0_10px_40px_-12px_rgba(15,26,46,0.18)] p-4 sm:p-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {(f.brand || f.type) && (
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                          {f.brand && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700" style={mono}>{f.brand}</span>}
                          {f.type && <span className="text-slate-400">{f.type}</span>}
                        </div>
                      )}
                      <h2 className="mt-1.5 text-xl sm:text-2xl font-black leading-tight" style={{ ...display, color: INK }}>
                        {f.name}{f.brand ? ` by ${f.brand}` : ''}
                      </h2>
                    </div>
                    {f.hours && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Fijación en piel</p>
                        <p className="mt-1 flex items-center justify-end gap-1 text-xs font-bold" style={{ ...mono, color: INK }}>
                          <span style={{ color: AMBER }}><Icon d={ICONS.flame} size={14} /></span>{f.hours}
                        </p>
                      </div>
                    )}
                  </div>
                  {f.desc && <p className="mt-2 text-[13px] text-slate-600 leading-relaxed lg:line-clamp-2">{f.desc}</p>}
                </motion.div>
              </AnimatePresence>

              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Selecciona presentación para ordenar:</p>
              <div className={`mt-2 grid gap-2 sm:gap-3 ${f.sizes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {f.sizes.map((s) => {
                  const active = s === size
                  const out = soldOut(s)
                  return (
                    <button
                      key={s.product.id}
                      onClick={() => setMl(s.ml)}
                      disabled={out}
                      className="text-left rounded-xl border px-3.5 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={active ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#e5e7eb' }}
                    >
                      <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider" style={{ color: active ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>
                        {out ? 'Agotado' : sizeLabel(s.ml)}
                      </span>
                      <span className="block mt-1.5 text-lg font-black" style={display}>{s.ml ? `${s.ml} ml` : s.product.volume || 'Único'}</span>
                      <span className="block mt-1 text-xs font-bold" style={{ color: active ? '#fff' : AMBER }}><PriceTag price={priceOf(s.product)} original={Number(s.product.price)} badge={false} /></span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => onAdd(size.product)}
                  disabled={soldOut(size)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider disabled:opacity-40"
                  style={{ backgroundColor: INK }}
                >
                  <Icon d={ICONS.bag} size={15} />
                  Añadir {size.ml ? `${size.ml} ml` : size.product.volume} a la bolsa · {formatPrice(price)}
                  {price < original && <span className="line-through opacity-60">{formatPrice(original)}</span>}
                </button>
                <Link to="/fragancias" className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-200 bg-white text-[11px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: INK }}>
                  <Icon d={ICONS.layers} size={15} /> Ver catálogo
                </Link>
              </div>
            </div>
          )}
        </div>

        {f && (
          <div className="w-full max-w-[460px] lg:max-w-[780px] mx-auto lg:mx-0 lg:ml-auto lg:h-full lg:max-h-[640px] lg:py-2">
            <div className="h-full flex flex-col rounded-3xl border border-neutral-200/80 bg-white shadow-[0_24px_60px_-20px_rgba(15,26,46,0.25)] p-5">
              <div className="flex items-center justify-between gap-3 min-h-[34px]">
                <span className="text-xl sm:text-2xl font-black text-neutral-200" style={mono}>{f.code ? `#${f.code}` : ''}</span>
                {f.tag && <span className="px-3 py-1.5 rounded-full border border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: INK }}>{f.tag}</span>}
              </div>

              <div className="mt-3 flex gap-4 lg:flex-1 lg:min-h-0">
                <div className="relative flex-1 min-w-0 aspect-[4/5] lg:aspect-auto flex items-center justify-center">
                  <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 55%, ${AMBER}22, transparent 70%)` }} />
                  <AnimatePresence mode="wait" initial={false}>
                    {f.image ? (
                      <motion.img
                        key={f.id}
                        src={f.image}
                        alt={f.name}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ opacity: { duration: 0.3 }, scale: { duration: 0.4 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
                        className="relative w-[85%] h-[85%] object-contain drop-shadow-[0_24px_28px_rgba(15,26,46,0.28)]"
                      />
                    ) : (
                      <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative w-[55%] h-[70%] flex flex-col items-center justify-center gap-3">
                        <BottlePlaceholder className="w-full h-full max-h-full" />
                        <span className="text-xs text-slate-400">Foto próximamente</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {(f.notes.length > 0 || f.hours || f.brand || f.type) && (
                  <div className="hidden lg:flex w-[230px] flex-shrink-0 flex-col justify-center gap-5 border-l border-neutral-200 pl-5">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div key={f.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-5">
                        {f.notes.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400" style={mono}>Notas</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {f.notes.map((n) => (
                                <span key={n} className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-[11px] font-semibold text-amber-800">{n}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {f.hours && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400" style={mono}>Fijación</p>
                            <p className="mt-1 text-2xl font-black" style={{ ...display, color: INK }}>{f.hours.replace(/\s*horas?$/i, '')}<span className="text-xs font-bold text-slate-400"> horas</span></p>
                          </div>
                        )}
                        {(f.brand || f.type) && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400" style={mono}>Casa</p>
                            {f.brand && <p className="mt-1 text-sm font-bold" style={{ color: INK }}>{f.brand}</p>}
                            {f.type && <p className="text-xs text-slate-500">{f.type}</p>}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {fragrances.length > 1 && (
                <div className="mt-3 pt-3 border-t border-neutral-200 grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {fragrances.slice(0, 10).map((p, i) => {
                    const active = p.id === f.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => setIndex(i)}
                        className="rounded-xl border px-2 py-2 text-left transition-colors"
                        style={active ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#f8fafc', borderColor: '#e5e7eb' }}
                      >
                        <span className="block text-[8px] font-bold uppercase tracking-wider truncate min-h-[11px]" style={{ ...mono, color: active ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>{p.brand}</span>
                        <span className="block mt-0.5 text-[11px] font-black truncate" style={display}>{p.name.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
