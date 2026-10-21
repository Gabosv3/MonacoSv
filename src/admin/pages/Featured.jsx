import { useEffect, useMemo, useState } from 'react'
import { listCategories, listProducts, listSettings, saveSettings } from '../api'
import { useAuth } from '../AuthContext'
import { FEATURED_LIMIT, buildFragrances, parseFeatured } from '../../catalog'
import { useSettings } from '../../settings'
import { BottlePlaceholder } from '../../components/HomeHero'
import { INK, AMBER, mono } from '../../components/ui'
import { Alert, Btn } from '../kit'

const LISTS = [
  { key: 'featured_men', title: 'Para él', text: 'Salen en la portada, en el selector del inicio y en «Nuestras fragancias».', pool: (f) => f.gender !== 'mujer' },
  { key: 'featured_women', title: 'Para ella', text: 'Salen en la sección «Fragancias para mujer» del inicio.', pool: (f) => f.gender === 'mujer' },
]

const friendly = (e) =>
  /schema cache|does not exist/i.test(e.message)
    ? 'Falta crear la tabla de ajustes. Ejecuta supabase/accounts_and_settings.sql en el SQL Editor de Supabase y recarga.'
    : e.message

function Thumb({ f }) {
  return (
    <span className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden flex-shrink-0">
      {f.image ? <img src={f.image} alt="" className="w-full h-full object-contain p-1" /> : <BottlePlaceholder className="w-6 h-8" />}
    </span>
  )
}

function Row({ f, children }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Thumb f={f} />
      <span className="min-w-0 flex-1">
        <strong className="block truncate" style={{ color: INK }}>{f.name}</strong>
        <span className="block text-xs text-slate-500 truncate">{[f.brand, f.category].filter(Boolean).join(' · ') || 'Sin casa'}</span>
      </span>
      {children}
    </li>
  )
}

// Elegir (y ordenar) qué fragancias salen en la portada: hasta 5 para él y 5 para ella.
export default function Featured() {
  const { can } = useAuth()
  const { reload } = useSettings()
  const canEdit = can('settings.edit')
  const [fragrances, setFragrances] = useState([])
  const [chosen, setChosen] = useState({ featured_men: [], featured_women: [] })
  const [saved, setSaved] = useState({ featured_men: '[]', featured_women: '[]' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    Promise.all([listProducts(), listCategories().catch(() => []), listSettings().catch(() => [])])
      .then(([products, cats, rows]) => {
        const genders = Object.fromEntries(cats.map((c) => [c.name, c.gender]))
        const all = buildFragrances(products.filter((p) => p.active), { requireImage: false, genders })
        const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]))
        setFragrances(all)
        const names = {}
        const raw = {}
        LISTS.forEach((l) => {
          raw[l.key] = cfg[l.key] ?? '[]'
          const poolNames = new Set(all.filter(l.pool).map((f) => f.name.toLowerCase()))
          names[l.key] = parseFeatured(raw[l.key]).filter((n) => poolNames.has(n.toLowerCase()))
        })
        setChosen(names)
        setSaved(raw)
      })
      .catch((e) => setError(friendly(e)))
      .finally(() => setLoading(false))
  }, [])

  const byName = useMemo(() => new Map(fragrances.map((f) => [f.name.toLowerCase(), f])), [fragrances])

  const update = (key, next) => setChosen((c) => ({ ...c, [key]: next }))
  const move = (key, i, dir) => {
    const list = [...chosen[key]]
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    update(key, list)
  }

  const dirty = LISTS.some((l) => JSON.stringify(chosen[l.key]) !== JSON.stringify(parseFeatured(saved[l.key])))

  const save = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const values = Object.fromEntries(LISTS.map((l) => [l.key, JSON.stringify(chosen[l.key])]))
      await saveSettings(values)
      setSaved(values)
      reload()
      setNotice('Listo. La portada ya muestra tu selección.')
    } catch (err) {
      setError(friendly(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="h-64 rounded-2xl bg-white border border-neutral-200 animate-pulse" />

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert kind="ok" onClose={() => setNotice('')}>{notice}</Alert>}

      <p className="mb-6 max-w-3xl text-sm text-slate-500 leading-relaxed">
        Elige hasta {FEATURED_LIMIT} fragancias por sección y ordénalas como quieras. Si no eliges ninguna, la tienda muestra las primeras {FEATURED_LIMIT}. Todas las fragancias siguen disponibles en el catálogo completo.
      </p>

      <div className="grid xl:grid-cols-2 gap-6">
        {LISTS.map((l) => {
          const picked = chosen[l.key].map((n) => byName.get(n.toLowerCase())).filter(Boolean)
          const pickedNames = new Set(chosen[l.key].map((n) => n.toLowerCase()))
          const available = fragrances.filter(l.pool).filter((f) => !pickedNames.has(f.name.toLowerCase()))
          const full = picked.length >= FEATURED_LIMIT
          return (
            <section key={l.key} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <header className="px-5 py-4 border-b border-neutral-200">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black" style={{ color: INK }}>{l.title}</h2>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: full ? '#fee2e2' : '#fef3c7', color: full ? '#991b1b' : '#92400e' }}>
                    {picked.length} / {FEATURED_LIMIT}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{l.text}</p>
              </header>

              <p className="px-5 pt-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ ...mono, color: AMBER }}>En la portada</p>
              {picked.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400">Sin selección: se mostrarán las primeras {FEATURED_LIMIT}.</p>
              ) : (
                <ol className="divide-y divide-neutral-100">
                  {picked.map((f, i) => (
                    <Row key={f.id} f={f}>
                      <span className="w-6 text-center text-sm font-bold text-slate-400" style={mono}>{i + 1}</span>
                      {canEdit && (
                        <span className="inline-flex items-center">
                          <button onClick={() => move(l.key, i, -1)} disabled={i === 0} aria-label={`Subir ${f.name}`} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-neutral-100 disabled:opacity-25">↑</button>
                          <button onClick={() => move(l.key, i, 1)} disabled={i === picked.length - 1} aria-label={`Bajar ${f.name}`} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-neutral-100 disabled:opacity-25">↓</button>
                          <button onClick={() => update(l.key, chosen[l.key].filter((n) => n.toLowerCase() !== f.name.toLowerCase()))} aria-label={`Quitar ${f.name}`} className="w-8 h-8 rounded-lg text-lg text-slate-400 hover:text-red-600 hover:bg-red-50">×</button>
                        </span>
                      )}
                    </Row>
                  ))}
                </ol>
              )}

              <p className="px-5 pt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400" style={mono}>Disponibles ({available.length})</p>
              {available.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400">{fragrances.filter(l.pool).length ? 'Ya elegiste todas las fragancias de esta sección.' : `Todavía no hay productos «${l.title.toLowerCase()}». Crea uno y asígnale la categoría correspondiente.`}</p>
              ) : (
                <ul className="divide-y divide-neutral-100 pb-2">
                  {available.map((f) => (
                    <Row key={f.id} f={f}>
                      {canEdit && (
                        <Btn size="sm" kind="secondary" disabled={full} onClick={() => update(l.key, [...chosen[l.key], f.name])} title={full ? `Ya hay ${FEATURED_LIMIT}: quita una primero` : undefined}>
                          + Agregar
                        </Btn>
                      )}
                    </Row>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {canEdit && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-5 py-3 shadow-lg">
          <p className="text-sm text-slate-500">{dirty ? 'Tienes cambios sin guardar' : 'Sin cambios'}</p>
          <Btn onClick={save} disabled={!dirty || saving} style={{ backgroundColor: INK }}>{saving ? 'Guardando…' : 'Guardar selección'}</Btn>
        </div>
      )}
    </div>
  )
}
