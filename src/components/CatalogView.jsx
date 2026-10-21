import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatPrice, sizeLabel } from '../catalog'
import { Icon, ICONS, INK, AMBER, display, mono } from './ui'
import { BottlePlaceholder } from './HomeHero'

const SORTS = [
  { key: 'destacados', label: 'Destacados' },
  { key: 'precio-asc', label: 'Precio: menor a mayor' },
  { key: 'precio-desc', label: 'Precio: mayor a menor' },
  { key: 'nombre', label: 'Nombre A–Z' },
]

const PRESENTACIONES = [
  { key: 'decant', label: 'Decants · 10 ml' },
  { key: 'botella', label: 'Botellas · 100 ml' },
]

const GENEROS = [
  { key: 'hombre', label: 'Para él' },
  { key: 'mujer', label: 'Para ella' },
  { key: 'unisex', label: 'Unisex' },
]

const matchesTam = (ml, tam) => (tam === 'decant' ? ml <= 15 : tam === 'botella' ? ml > 15 : true)

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-2 rounded-full border text-[12px] font-semibold transition-colors whitespace-nowrap"
      style={active ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#475569' }}
    >
      {children}
    </button>
  )
}

function Card({ f, sizes, priceOf, onAdd, index }) {
  const [ml, setMl] = useState(null)
  const size = sizes.find((s) => s.ml === ml) ?? sizes.find((s) => s.ml === 10) ?? sizes[0]
  const out = size.product.stock != null && size.product.stock <= 0
  const price = priceOf(size.product)
  const original = Number(size.product.price)

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.04 }}
      className="group flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden hover:shadow-[0_20px_50px_-20px_rgba(15,26,46,0.3)] transition-shadow"
    >
      <div className="relative aspect-[4/5]" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 60%, ${AMBER}1f, #f6f4f0 75%)` }}>
        {f.code && <span className="absolute left-4 top-4 text-[10px] font-bold uppercase tracking-wider text-slate-400" style={mono}>#{f.code}</span>}
        {original > price && (
          <span className="absolute right-4 top-4 px-2 py-1 rounded-md text-[10px] font-bold uppercase text-white" style={{ backgroundColor: AMBER }}>
            -{Math.round((1 - price / original) * 100)}%
          </span>
        )}
        {f.image ? (
          <img src={f.image} alt={f.name} loading="lazy" className="absolute inset-0 m-auto w-[78%] h-[78%] object-contain drop-shadow-[0_18px_22px_rgba(15,26,46,0.25)] transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <BottlePlaceholder className="absolute inset-0 m-auto w-[45%] h-[60%]" />
        )}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          {f.brand && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400" style={mono}>{f.brand}</p>}
          <h3 className="mt-1 text-lg font-black leading-tight" style={{ ...display, color: INK }}>{f.name}</h3>
          {f.tag && <p className="mt-1 text-xs text-slate-500">{f.tag}</p>}
        </div>

        {f.notes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {f.notes.slice(0, 3).map((n) => (
              <span key={n} className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] font-semibold text-amber-800">{n}</span>
            ))}
          </div>
        )}

        {sizes.length > 1 && (
          <div className="grid gap-1 p-1 rounded-xl bg-neutral-100" style={{ gridTemplateColumns: `repeat(${sizes.length}, minmax(0, 1fr))` }}>
            {sizes.map((s) => {
              const active = s === size
              return (
                <button
                  key={s.product.id}
                  onClick={() => setMl(s.ml)}
                  className="py-2 rounded-lg text-[12px] font-bold transition-colors"
                  style={active ? { backgroundColor: INK, color: '#fff' } : { color: '#64748b' }}
                  title={sizeLabel(s.ml)}
                >
                  {s.ml} ml
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-auto pt-1 flex items-center justify-between gap-3">
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-black" style={{ ...mono, color: INK }}>{formatPrice(price)}</span>
            {original > price && <span className="text-xs text-slate-400 line-through">{formatPrice(original)}</span>}
          </p>
          <button
            onClick={() => onAdd(size.product)}
            disabled={out}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
            style={{ backgroundColor: INK }}
          >
            <Icon d={ICONS.bag} size={14} /> {out ? 'Agotado' : 'Añadir'}
          </button>
        </div>
      </div>
    </motion.article>
  )
}

const csv = (v) => (v ? v.split(',').filter(Boolean) : [])

function Group({ title, children }) {
  return (
    <div className="border-b border-neutral-200 pb-6 last:border-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400" style={mono}>{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Check({ checked, onChange, label, count }) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer group/check">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <span
        className="w-[18px] h-[18px] rounded-md border flex items-center justify-center flex-shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1"
        style={checked ? { backgroundColor: INK, borderColor: INK } : { borderColor: '#cbd5e1', backgroundColor: '#fff' }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <span className="flex-1 text-sm text-slate-700 group-hover/check:text-slate-900">{label}</span>
      <span className="text-xs text-slate-400" style={mono}>{count}</span>
    </label>
  )
}

const isAvailable = (f) => f.sizes.some((s) => s.product.stock == null || s.product.stock > 0)

// fragrances: todas las fragancias del catálogo (buildFragrances sin exigir foto).
export default function CatalogView({ fragrances, state = 'ready', priceOf, onAdd }) {
  const [params, setParams] = useSearchParams()
  const [sort, setSort] = useState('destacados')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const q = (params.get('q') ?? '').trim()
  const tam = params.get('tam') ?? ''
  const gen = params.get('gen') ?? ''
  const casas = csv(params.get('casa'))
  const notas = csv(params.get('nota'))
  const soloDisp = params.get('disp') === '1'

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const toggleIn = (key, list, value) =>
    setParam(key, (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]).join(','))

  const lowPrice = (f, sizes) => Math.min(...(sizes ?? f.sizes).map((s) => priceOf(s.product)))

  const bounds = useMemo(() => {
    const all = fragrances.flatMap((f) => f.sizes.map((s) => priceOf(s.product)))
    return all.length ? [Math.floor(Math.min(...all)), Math.ceil(Math.max(...all))] : [0, 0]
  }, [fragrances, priceOf])
  const maxParam = Number(params.get('max')) || 0
  const maxPrice = maxParam && maxParam < bounds[1] ? maxParam : 0

  // Búsqueda de texto: es la base sobre la que se cuentan las opciones.
  const base = useMemo(() => {
    const needle = q.toLowerCase()
    return fragrances.filter(
      (f) => !needle || `${f.name} ${f.brand} ${f.tag} ${f.category} ${f.desc} ${f.notes.join(' ')}`.toLowerCase().includes(needle)
    )
  }, [fragrances, q])

  const { brandCount, noteCount, genderCount } = useMemo(() => {
    const tally = (pick) => {
      const m = new Map()
      base.forEach((f) => pick(f).forEach((k) => m.set(k, (m.get(k) ?? 0) + 1)))
      return m
    }
    return {
      brandCount: tally((f) => (f.brand ? [f.brand] : [])),
      noteCount: tally((f) => f.notes),
      genderCount: tally((f) => [f.gender]),
    }
  }, [base])
  const tamCount = (key) => base.filter((f) => f.sizes.some((s) => matchesTam(s.ml, key))).length
  const topNotes = [...noteCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

  const visible = useMemo(() => {
    const list = base
      .map((f) => ({ f, sizes: f.sizes.filter((s) => matchesTam(s.ml, tam)) }))
      .filter(({ f, sizes }) => {
        if (!sizes.length) return false
        if (gen && f.gender !== gen) return false
        if (casas.length && !casas.includes(f.brand)) return false
        if (notas.length && !notas.every((n) => f.notes.includes(n))) return false
        if (soloDisp && !sizes.some((s) => s.product.stock == null || s.product.stock > 0)) return false
        if (maxPrice && lowPrice(f, sizes) > maxPrice) return false
        return true
      })
    if (sort === 'precio-asc') list.sort((a, b) => lowPrice(a.f, a.sizes) - lowPrice(b.f, b.sizes))
    else if (sort === 'precio-desc') list.sort((a, b) => lowPrice(b.f, b.sizes) - lowPrice(a.f, a.sizes))
    else if (sort === 'nombre') list.sort((a, b) => a.f.name.localeCompare(b.f.name))
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, tam, gen, params.get('casa'), params.get('nota'), soloDisp, maxPrice, sort, priceOf])

  // etiquetas de filtros activos, cada una con su forma de quitarse
  const active = [
    q && { label: `“${q}”`, remove: () => setParam('q', '') },
    gen && { label: GENEROS.find((g) => g.key === gen)?.label ?? gen, remove: () => setParam('gen', '') },
    tam && { label: PRESENTACIONES.find((p) => p.key === tam)?.label ?? tam, remove: () => setParam('tam', '') },
    ...casas.map((c) => ({ label: c, remove: () => toggleIn('casa', casas, c) })),
    ...notas.map((n) => ({ label: n, remove: () => toggleIn('nota', notas, n) })),
    maxPrice && { label: `Hasta ${formatPrice(maxPrice)}`, remove: () => setParam('max', '') },
    soloDisp && { label: 'Solo disponibles', remove: () => setParam('disp', '') },
  ].filter(Boolean)

  const clear = () => setParams({}, { replace: true })

  const noWomenYet = gen === 'mujer' && !fragrances.some((f) => f.gender === 'mujer')
  const title =
    gen === 'mujer' ? 'Para ella' : gen === 'hombre' ? 'Para él' : tam === 'decant' ? 'Decants' : tam === 'botella' ? 'Botellas selladas' : 'Todas las fragancias'

  const Filters = (
    <div className="space-y-6">
      <Group title="Para">
        <div className="flex flex-wrap gap-2">
          <Chip active={!gen} onClick={() => setParam('gen', '')}>Todos</Chip>
          {GENEROS.filter((g) => genderCount.get(g.key) || gen === g.key || g.key === 'mujer').map((g) => (
            <Chip key={g.key} active={gen === g.key} onClick={() => setParam('gen', gen === g.key ? '' : g.key)}>
              {g.label} <span className="opacity-60">{genderCount.get(g.key) ?? 0}</span>
            </Chip>
          ))}
        </div>
      </Group>

      <Group title="Presentación">
        {PRESENTACIONES.map((p) => (
          <Check key={p.key} checked={tam === p.key} onChange={() => setParam('tam', tam === p.key ? '' : p.key)} label={p.label} count={tamCount(p.key)} />
        ))}
      </Group>

      {brandCount.size > 1 && (
        <Group title="Casa">
          {[...brandCount.entries()].map(([b, n]) => (
            <Check key={b} checked={casas.includes(b)} onChange={() => toggleIn('casa', casas, b)} label={b} count={n} />
          ))}
        </Group>
      )}

      {topNotes.length > 0 && (
        <Group title="Notas">
          <div className="flex flex-wrap gap-2">
            {topNotes.map(([n, c]) => (
              <Chip key={n} active={notas.includes(n)} onClick={() => toggleIn('nota', notas, n)}>
                {n} <span className="opacity-60">{c}</span>
              </Chip>
            ))}
          </div>
        </Group>
      )}

      {bounds[1] > bounds[0] && (
        <Group title="Precio máximo">
          <input
            type="range"
            min={bounds[0]}
            max={bounds[1]}
            step="1"
            value={maxPrice || bounds[1]}
            onChange={(e) => setParam('max', Number(e.target.value) >= bounds[1] ? '' : e.target.value)}
            className="w-full accent-[#0f1a2e]"
            aria-label="Precio máximo"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-500" style={mono}>
            <span>{formatPrice(bounds[0])}</span>
            <strong style={{ color: INK }}>{formatPrice(maxPrice || bounds[1])}</strong>
          </div>
        </Group>
      )}

      <Group title="Disponibilidad">
        <Check checked={soloDisp} onChange={() => setParam('disp', soloDisp ? '' : '1')} label="Solo disponibles" count={fragrances.filter(isAvailable).length} />
      </Group>
    </div>
  )

  return (
    <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 py-10 lg:py-14">
      <nav className="text-[11px] uppercase tracking-wider text-slate-400" style={mono}>
        <Link to="/" className="hover:text-slate-700">Inicio</Link> <span className="mx-1.5">/</span> <span className="text-slate-600">Catálogo</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase leading-tight" style={{ ...display, color: INK }}>{title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {visible.length} {visible.length === 1 ? 'fragancia' : 'fragancias'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setFiltersOpen((v) => !v)} className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-[12px] font-bold uppercase tracking-wider">
            Filtros
            {active.length > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full text-[10px] text-white flex items-center justify-center" style={{ backgroundColor: AMBER }}>{active.length}</span>
            )}
          </button>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
            <span className="hidden sm:inline">Ordenar por</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-500">
              {SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {active.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {active.map((a, i) => (
            <button key={`${a.label}-${i}`} onClick={a.remove} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[12px] font-semibold text-white" style={{ backgroundColor: INK }}>
              {a.label} <span className="text-base leading-none opacity-70">×</span>
            </button>
          ))}
          <button onClick={clear} className="ml-1 text-[12px] font-semibold text-slate-500 underline hover:text-slate-900">Limpiar todo</button>
        </div>
      )}

      {filtersOpen && <div className="lg:hidden mt-5 rounded-2xl border border-neutral-200 bg-white p-5">{Filters}</div>}

      <div className="mt-8 grid lg:grid-cols-[250px_1fr] gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-[200px] max-h-[calc(100vh-220px)] overflow-y-auto pr-2">{Filters}</div>
        </aside>

        <section>
          {state === 'loading' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => <div key={i} className="h-96 rounded-2xl bg-white border border-neutral-200 animate-pulse" />)}
            </div>
          ) : state === 'error' ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-16 px-6 text-center">
              <p className="text-lg font-bold" style={{ color: INK }}>No pudimos cargar el catálogo</p>
              <p className="mt-2 text-sm text-slate-500">Revisa tu conexión e inténtalo de nuevo.</p>
              <button onClick={() => window.location.reload()} className="mt-5 px-5 py-3 rounded-xl text-white text-[12px] font-bold uppercase tracking-wider" style={{ backgroundColor: INK }}>Reintentar</button>
            </div>
          ) : fragrances.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-16 px-6 text-center">
              <p className="text-lg font-bold" style={{ color: INK }}>Todavía no hay productos</p>
              <p className="mt-2 text-sm text-slate-500">Estamos preparando el catálogo. Vuelve pronto.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-16 px-6 text-center">
              <p className="text-lg font-bold" style={{ color: INK }}>
                {noWomenYet ? 'Muy pronto: nuestra línea para ella' : 'No encontramos fragancias con esos filtros'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {noWomenYet ? 'Estamos preparando la selección. Escríbenos y te asesoramos con gusto.' : 'Prueba con otra búsqueda o quita algún filtro.'}
              </p>
              <button onClick={clear} className="mt-5 px-5 py-3 rounded-xl text-white text-[12px] font-bold uppercase tracking-wider" style={{ backgroundColor: INK }}>
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {visible.map(({ f, sizes }, i) => (
                <Card key={`${f.id}-${tam}`} f={f} sizes={sizes} index={i} priceOf={priceOf} onAdd={onAdd} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
