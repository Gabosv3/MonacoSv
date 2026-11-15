import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatPrice } from '../catalog'
import { INK, display } from './dv-ui'
import { ProductCard, TrustFacts } from '../duumvir/commerce'

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
      aria-pressed={active}
      className={`min-h-10 px-4 rounded-full border text-[14px] font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-[#141414] border-[#141414] text-white' : 'bg-white border-[#141414]/15 text-[#141414] hover:border-[#141414]'
      }`}
    >
      {children}
    </button>
  )
}

const csv = (v) => (v ? v.split(',').filter(Boolean) : [])

function Group({ title, children }) {
  return (
    <div className="border-b border-[#141414]/10 pb-7 last:border-0">
      <p className="text-[13px] font-semibold text-[#141414]">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Check({ checked, onChange, label, count }) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer group/check">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <span
        className="w-5 h-5 border flex items-center justify-center flex-shrink-0 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#141414]"
        style={checked ? { backgroundColor: INK, borderColor: INK } : { borderColor: 'rgba(20,20,20,0.3)', backgroundColor: '#fff' }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <span className="flex-1 text-[15px] text-[#141414]">{label}</span>
      <span className="text-[13px] tabular-nums text-[#78716C]">{count}</span>
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
  // las notas elegidas van primero; después, las más frecuentes
  const topNotes = [...noteCount.entries()]
    .sort((a, b) => notas.includes(b[0]) - notas.includes(a[0]) || b[1] - a[1])
    .slice(0, 14)

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
  const oneNote = notas.length === 1 && !gen && !tam && !q && !casas.length
  const kicker = oneNote ? 'Explorar por nota' : q ? 'Resultados de búsqueda' : 'Catálogo'
  const title = oneNote
    ? notas[0]
    : q
      ? `“${q}”`
      : gen === 'mujer' ? 'Para ella' : gen === 'hombre' ? 'Para él' : gen === 'unisex' ? 'Unisex' : tam === 'decant' ? 'Decants' : tam === 'botella' ? 'Botellas selladas' : 'Todas las fragancias'
  const intro = oneNote
    ? `Fragancias del catálogo que llevan ${notas[0].toLowerCase()} entre sus notas.`
    : tam === 'decant'
      ? 'Atomizadores de 10 ml para probar una fragancia antes de ir por la botella.'
      : tam === 'botella'
        ? 'Frascos completos, sellados.'
        : 'Explora por casa, nota, presentación o precio.'
  const count = `${visible.length} ${visible.length === 1 ? 'fragancia' : 'fragancias'}`

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

      {bounds[1] > bounds[0] && (
        <Group title="Precio máximo">
          <input
            type="range"
            min={bounds[0]}
            max={bounds[1]}
            step="1"
            value={maxPrice || bounds[1]}
            onChange={(e) => setParam('max', Number(e.target.value) >= bounds[1] ? '' : e.target.value)}
            className="w-full accent-[#141414]"
            aria-label="Precio máximo"
          />
          <div className="mt-2 flex justify-between text-[13px] tabular-nums text-[#57534E]">
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
    <main className="max-w-[1500px] mx-auto px-5 sm:px-8 lg:px-12 pt-8 pb-20 lg:pt-12 lg:pb-28">
      <nav className="text-[13px] text-[#78716C]" aria-label="Ruta">
        <Link to="/" className="hover:text-[#141414]">Inicio</Link> <span className="mx-2">/</span>
        {oneNote || q || gen || tam ? <Link to="/fragancias" className="hover:text-[#141414]">Catálogo</Link> : <span className="text-[#141414]">Catálogo</span>}
        {(oneNote || q || gen || tam) && <><span className="mx-2">/</span><span className="text-[#141414]">{title}</span></>}
      </nav>

      <header className="mt-8 lg:mt-10 pb-8 lg:pb-10 border-b border-[#141414]/10 grid md:grid-cols-[1fr_auto] gap-6 items-end">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#57534E]">{kicker}</p>
          <h1 className="mt-3 text-[clamp(2.75rem,5.2vw,4.5rem)] leading-[1] text-[#141414] text-balance" style={display}>{title}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[#57534E] max-w-[52ch]">{intro}</p>
          <TrustFacts className="mt-5" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className="lg:hidden flex-1 flex items-center justify-center gap-2 min-h-12 px-5 border border-[#141414] bg-white text-[14px] font-semibold">
            Filtros
            {active.length > 0 && <span className="min-w-5 h-5 px-1 rounded-full text-[11px] text-white bg-[#141414] flex items-center justify-center">{active.length}</span>}
          </button>
          <label className="flex-1 md:flex-none flex items-center gap-3 text-[14px] text-[#57534E]">
            <span className="hidden sm:inline whitespace-nowrap">Ordenar por</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full md:w-auto min-h-12 border border-[#141414]/20 bg-white px-3 text-[14px] font-medium text-[#141414] outline-none focus:border-[#141414]">
              {SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </header>

      {/* notas olfativas: el acceso más directo para descubrir fragancias */}
      {topNotes.length > 0 && (
        <div className="py-6 border-b border-[#141414]/10">
          <div className="dv-noscroll flex items-center gap-2.5 overflow-x-auto lg:flex-wrap lg:overflow-visible -mx-5 px-5 sm:mx-0 sm:px-0">
            <span className="shrink-0 mr-2 text-[13px] font-semibold text-[#141414]">Notas</span>
            {topNotes.map(([n, c]) => (
              <Chip key={n} active={notas.includes(n)} onClick={() => toggleIn('nota', notas, n)}>
                {n} <span className="ml-1 text-[12px] opacity-60 tabular-nums">{c}</span>
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 min-h-10">
        <p className="mr-3 text-[15px] text-[#141414]"><strong className="font-semibold tabular-nums">{count}</strong></p>
        {active.map((a, i) => (
          <button key={`${a.label}-${i}`} onClick={a.remove} aria-label={`Quitar filtro ${a.label}`} className="flex items-center gap-2 min-h-9 pl-3.5 pr-2.5 rounded-full bg-[#EDE8DF] text-[13px] font-medium text-[#141414] hover:bg-[#E2DCD0]">
            {a.label} <span className="text-base leading-none" aria-hidden>×</span>
          </button>
        ))}
        {active.length > 0 && <button onClick={clear} className="ml-1 text-[14px] text-[#57534E] underline underline-offset-4 hover:text-[#141414]">Limpiar todo</button>}
      </div>

      {filtersOpen && <div className="lg:hidden mt-5 border border-[#141414]/10 bg-white p-5">{Filters}</div>}

      <div className="mt-8 grid lg:grid-cols-[240px_1fr] gap-10 xl:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-28">{Filters}</div>
        </aside>

        <section>
          {state === 'loading' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => <div key={i} className="h-[34rem] bg-white border border-[#141414]/8 animate-pulse" />)}
            </div>
          ) : state === 'error' ? (
            <div className="border border-[#141414]/10 bg-white py-20 px-6 text-center">
              <p className="text-2xl text-[#141414]" style={display}>No pudimos cargar el catálogo</p>
              <p className="mt-3 text-[16px] text-[#57534E]">Revisa tu conexión e inténtalo de nuevo.</p>
              <button onClick={() => window.location.reload()} className="mt-6 min-h-12 px-6 bg-[#141414] text-white text-[14px] font-semibold hover:bg-[#2B2B2B]">Reintentar</button>
            </div>
          ) : fragrances.length === 0 ? (
            <div className="border border-[#141414]/10 bg-white py-20 px-6 text-center">
              <p className="text-2xl text-[#141414]" style={display}>Todavía no hay productos</p>
              <p className="mt-3 text-[16px] text-[#57534E]">Estamos preparando el catálogo. Vuelve pronto.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="border border-[#141414]/10 bg-white py-20 px-6 text-center">
              <p className="text-2xl text-[#141414]" style={display}>
                {noWomenYet ? 'Muy pronto: nuestra línea para ella' : 'No encontramos fragancias con esos filtros'}
              </p>
              <p className="mt-3 text-[16px] text-[#57534E]">
                {noWomenYet ? 'Estamos preparando la selección. Escríbenos y te asesoramos con gusto.' : 'Prueba con otra búsqueda o quita algún filtro.'}
              </p>
              <button onClick={clear} className="mt-6 min-h-12 px-6 bg-[#141414] text-white text-[14px] font-semibold hover:bg-[#2B2B2B]">
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              {visible.map(({ f, sizes }) => (
                <ProductCard key={`${f.id}-${tam}`} f={f} sizes={sizes} priceOf={priceOf} onAdd={onAdd} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
