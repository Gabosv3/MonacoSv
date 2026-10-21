import { Fragment, useEffect, useMemo, useState } from 'react'
import { Icon, ICONS, INK, AMBER, mono } from '../components/ui'

// ---------- estilos base ----------

export const inputCls =
  'w-full h-11 rounded-xl border border-neutral-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 disabled:bg-neutral-100'

export const textareaCls = inputCls.replace('h-11', 'min-h-[88px] py-3')

const BTN = {
  primary: { backgroundColor: INK, color: '#fff', borderColor: INK },
  secondary: { backgroundColor: '#fff', color: INK, borderColor: '#d4d4d8' },
  danger: { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' },
  ghost: { backgroundColor: 'transparent', color: '#475569', borderColor: 'transparent' },
}

export function Btn({ kind = 'primary', size = 'md', className = '', style, children, ...props }) {
  const pad = size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm'
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-opacity hover:opacity-85 disabled:opacity-50 whitespace-nowrap ${pad} ${className}`}
      style={{ ...BTN[kind], ...style }}
    >
      {children}
    </button>
  )
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-600',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-sky-100 text-sky-800',
  }
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

export function Field({ label, hint, className = '', children }) {
  return (
    <div className={className}>
      <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? '#16a34a' : '#d4d4d8' }}
    >
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? 'translateX(20px)' : 'none' }} />
    </button>
  )
}

export function Alert({ kind = 'error', onClose, children }) {
  const cls = kind === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return (
    <div role="alert" className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <span>{children}</span>
      {onClose && <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100" aria-label="Cerrar">×</button>}
    </div>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-3.5 rounded-full border text-xs font-semibold transition-colors whitespace-nowrap"
      style={active ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#475569' }}
    >
      {children}
    </button>
  )
}

export function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400" style={mono}>{label}</p>
      <p className="mt-1.5 text-2xl font-black tracking-tight" style={{ color: INK }}>{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function IconBtn({ title, onClick, danger, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
        danger ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-slate-900 hover:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  )
}

export const PencilIcon = () => <Icon d="M4 20h4L19 9l-4-4L4 16v4zm9-13l4 4" size={17} />
export const TrashIcon = () => <Icon d="M5 7h14M10 7V4h4v3m-6 0l1 13h6l1-13M10 11v6m4-6v6" size={17} />

// ---------- panel lateral (formularios) ----------

export function Drawer({ open, title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <aside role="dialog" aria-label={title} className="absolute right-0 top-0 h-full w-[540px] max-w-full bg-[#f9f8f6] shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-5 bg-white border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-black uppercase leading-tight" style={{ color: INK, fontFamily: "'Unbounded', system-ui, sans-serif" }}>{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 flex items-center justify-center rounded-lg text-2xl leading-none text-slate-500 hover:bg-neutral-100">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="px-6 py-4 bg-white border-t border-neutral-200 flex gap-3 justify-end">{footer}</div>}
      </aside>
    </div>
  )
}

export function Section({ title, children }) {
  return (
    <section className="mb-7 last:mb-0">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>{title}</h3>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 grid grid-cols-2 gap-4">{children}</div>
    </section>
  )
}

// ---------- confirmación ----------

export function ConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel, busy }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div role="alertdialog" className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-black" style={{ color: INK }}>{title}</h3>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Btn kind="secondary" onClick={onCancel}>Cancelar</Btn>
          <Btn kind="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Eliminando…' : confirmLabel}</Btn>
        </div>
      </div>
    </div>
  )
}

// ---------- tabla de datos ----------

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

// columns: [{ key, header, value?(row) → texto/número para ordenar y buscar,
//             render?(row), sortable = true, align, hide: 'sm'|'md'|'lg', width }]
export function DataTable({
  columns,
  rows,
  loading,
  rowKey = 'id',
  searchPlaceholder = 'Buscar…',
  toolbar,
  initialSort = null,
  empty = 'Sin registros todavía.',
  expanded,
  exportName,
  pageSizes = [10, 25, 50],
}) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(pageSizes[0])
  const [openId, setOpenId] = useState(null)

  const valueOf = (col, row) => (col.value ? col.value(row) : row[col.key])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => columns.some((c) => String(valueOf(c, r) ?? '').toLowerCase().includes(needle)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, columns])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return filtered
    return [...filtered].sort((a, b) => {
      const x = valueOf(col, a)
      const y = valueOf(col, b)
      const cmp =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x ?? '').localeCompare(String(y ?? ''), 'es', { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, columns])

  const pages = Math.max(1, Math.ceil(sorted.length / size))
  const current = Math.min(page, pages)
  const start = (current - 1) * size
  const visible = sorted.slice(start, start + size)

  const toggleSort = (key) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))

  const hideCls = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }

  const exportCsv = () => {
    const cols = columns.filter((c) => c.header && (c.value || c.key))
    const lines = [cols.map((c) => csvCell(c.header)).join(',')]
    sorted.forEach((r) => lines.push(cols.map((c) => csvCell(valueOf(c, r))).join(',')))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pageButtons = useMemo(() => {
    const out = []
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - current) <= 1) out.push(i)
      else if (out[out.length - 1] !== '…') out.push('…')
    }
    return out
  }, [pages, current])

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      {/* barra de herramientas */}
      <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Icon d={ICONS.search} size={16} /></span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder={searchPlaceholder}
            aria-label="Buscar en la tabla"
            className={`${inputCls} pl-10 h-10`}
          />
        </div>
        {toolbar}
        {exportName && (
          <Btn kind="secondary" size="sm" className="ml-auto" onClick={exportCsv} disabled={!sorted.length}>
            Exportar CSV
          </Btn>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left border-b border-neutral-200">
              {columns.map((c) => {
                const sortable = c.sortable !== false && c.header
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''} ${hideCls[c.hide] ?? ''}`}
                    style={{ width: c.width }}
                  >
                    {sortable ? (
                      <button onClick={() => toggleSort(c.key)} className={`inline-flex items-center gap-1.5 uppercase hover:text-slate-900 ${active ? 'text-slate-900' : ''}`}>
                        {c.header}
                        <span className="text-[9px] leading-none opacity-70">{active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-4 ${hideCls[c.hide] ?? ''}`}>
                      <div className="h-4 rounded bg-neutral-100 animate-pulse" style={{ width: `${50 + ((i * 17 + c.key.length * 9) % 40)}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <p className="font-semibold" style={{ color: INK }}>{q ? 'Sin resultados' : empty}</p>
                  {q && <p className="mt-1 text-sm text-slate-500">No hay nada que coincida con “{q}”.</p>}
                </td>
              </tr>
            )}

            {!loading &&
              visible.map((row) => {
                const id = row[rowKey]
                const isOpen = expanded && openId === id
                return (
                  <Fragment key={id}>
                    <tr
                      className={`transition-colors hover:bg-neutral-50/80 ${expanded ? 'cursor-pointer' : ''} ${isOpen ? 'bg-neutral-50' : ''}`}
                      onClick={expanded ? () => setOpenId(isOpen ? null : id) : undefined}
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={`px-4 py-3.5 align-middle ${c.align === 'right' ? 'text-right' : ''} ${hideCls[c.hide] ?? ''}`}
                          onClick={c.stop ? (e) => e.stopPropagation() : undefined}
                        >
                          {c.render ? c.render(row) : (valueOf(c, row) ?? '—')}
                        </td>
                      ))}
                    </tr>
                    {isOpen && (
                      <tr className="bg-neutral-50">
                        <td colSpan={columns.length} className="px-4 pb-5 pt-1">{expanded(row)}</td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* pie: contador y paginación */}
      {!loading && sorted.length > 0 && (
        <div className="px-4 sm:px-5 py-3.5 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            Mostrando <strong style={{ color: INK }}>{start + 1}–{Math.min(start + size, sorted.length)}</strong> de <strong style={{ color: INK }}>{sorted.length}</strong>
          </p>
          <div className="flex items-center gap-3">
            <label className="hidden sm:flex items-center gap-2 text-xs">
              Filas
              <select
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value))
                  setPage(1)
                }}
                className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm"
              >
                {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(current - 1)} disabled={current === 1} className="h-9 px-3 rounded-lg border border-neutral-300 text-xs font-semibold disabled:opacity-40 hover:bg-neutral-50" aria-label="Página anterior">←</button>
              {pageButtons.map((n, i) =>
                n === '…' ? (
                  <span key={`d${i}`} className="px-1.5">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    aria-current={n === current ? 'page' : undefined}
                    className="min-w-9 h-9 px-2 rounded-lg border text-xs font-bold"
                    style={n === current ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { borderColor: '#d4d4d8', color: '#475569' }}
                  >
                    {n}
                  </button>
                )
              )}
              <button onClick={() => setPage(current + 1)} disabled={current === pages} className="h-9 px-3 rounded-lg border border-neutral-300 text-xs font-semibold disabled:opacity-40 hover:bg-neutral-50" aria-label="Página siguiente">→</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- etiquetas ----------

// Escribe y pulsa Enter (o coma) para agregar; clic en × o Retroceso para quitar.
export function TagInput({ value, onChange, suggestions = [], placeholder = 'Escribe una etiqueta y pulsa Enter' }) {
  const [text, setText] = useState('')

  const add = (raw) => {
    const tag = raw.trim().replace(/\s+/g, ' ')
    if (!tag) return
    if (!value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag])
    setText('')
  }

  const remaining = suggestions.filter((s) => !value.some((t) => t.toLowerCase() === s.toLowerCase())).slice(0, 10)

  return (
    <div>
      <div className="min-h-11 flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-2.5 py-2 focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-900/5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Quitar ${t}`} className="w-5 h-5 rounded-full text-base leading-none text-amber-700 hover:bg-amber-200">×</button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => (e.target.value.includes(',') ? e.target.value.split(',').forEach(add) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(text)
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(text)}
          placeholder={value.length ? '' : placeholder}
          aria-label="Agregar etiqueta"
          className="flex-1 min-w-[120px] h-7 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Usadas antes:</span>
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="px-2.5 py-1 rounded-full border border-neutral-300 text-xs font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
