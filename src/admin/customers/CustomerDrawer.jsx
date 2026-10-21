import { useEffect, useMemo, useState } from 'react'
import { DEPARTMENTS, formatPrice } from '../../catalog'
import { Icon, ICONS, INK, AMBER, mono } from '../../components/ui'
import { Badge, Btn, Drawer, Field, Section, inputCls, textareaCls } from '../kit'
import { createCustomer, updateCustomer } from '../api'
import { whatsappUrl } from '../orders/shared'
import { QUOTE_STATUS, customerStats } from './stats'

const EMPTY = { name: '', phone: '', email: '', department: '', municipality: '', address: '', notes: '' }
const day = (d) => new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
const ORDER_TONE = { pendiente: 'amber', confirmada: 'blue', entregada: 'green', cancelada: 'red' }

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400" style={mono}>{label}</p>
      <p className="mt-1 text-lg font-black" style={{ color: INK }}>{value}</p>
    </div>
  )
}

function Block({ title, count, children, empty }) {
  return (
    <section className="mb-7">
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>
        {title} {count != null && <span className="text-slate-400">({count})</span>}
      </h3>
      <div className="rounded-2xl border border-neutral-200 bg-white">
        {count === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-400">{empty}</p> : children}
      </div>
    </section>
  )
}

export default function CustomerDrawer({ open, customer, sales, quotes, canEdit, canQuote, onClose, onSaved, onError, onNewQuote }) {
  const isNew = !customer
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('pedidos')

  useEffect(() => {
    if (!open) return
    setForm(customer ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, customer[k] ?? ''])) } : EMPTY)
    setTab('pedidos')
  }, [open, customer])

  const stats = useMemo(() => (customer ? customerStats(customer, sales, quotes) : null), [customer, sales, quotes])
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const wa = whatsappUrl(form.phone)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]))
      if (isNew) await createCustomer({ ...payload, source: 'admin' })
      else await updateCustomer(customer.id, payload)
      onSaved()
      onClose()
    } catch (err) {
      onError(/duplicate|unique/i.test(err.message) ? new Error('Ya existe un cliente con ese teléfono.') : err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Nuevo cliente' : customer?.name || 'Cliente sin nombre'}
      subtitle={isNew ? 'Regístralo para dar seguimiento a lo que cotiza y compra.' : `Cliente desde ${day(customer.created_at)}`}
      footer={
        <>
          {!isNew && canQuote && <Btn kind="secondary" type="button" onClick={() => onNewQuote(customer.id)} className="mr-auto">+ Nueva cotización</Btn>}
          <Btn kind="secondary" type="button" onClick={onClose}>{canEdit ? 'Cancelar' : 'Cerrar'}</Btn>
          {canEdit && <Btn type="submit" form="customer-form" disabled={saving}>{saving ? 'Guardando…' : isNew ? 'Crear cliente' : 'Guardar datos'}</Btn>}
        </>
      }
    >
      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-7">
            <Kpi label="Pedidos" value={stats.orders} />
            <Kpi label="Comprado" value={formatPrice(stats.spent)} />
            <Kpi label="Ticket prom." value={formatPrice(stats.avg)} />
            <Kpi label="Cotizaciones" value={stats.quoteCount} />
          </div>

          <Block title="Productos que compra" count={stats.boughtList.length} empty="Todavía no ha comprado.">
            <ul className="divide-y divide-neutral-100 text-sm">
              {stats.boughtList.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <strong className="block truncate" style={{ color: INK }}>{p.name}</strong>
                    <span className="text-xs text-slate-500">{p.units} {p.units === 1 ? 'unidad' : 'unidades'} · última {day(p.last)}</span>
                  </span>
                  <span className="font-bold flex-shrink-0" style={mono}>{formatPrice(p.total)}</span>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Productos que cotiza" count={stats.quotedList.length} empty="Todavía no ha cotizado nada.">
            <ul className="divide-y divide-neutral-100 text-sm">
              {stats.quotedList.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <strong className="block truncate" style={{ color: INK }}>{p.name}</strong>
                    <span className="text-xs text-slate-500">
                      Cotizado {p.times} {p.times === 1 ? 'vez' : 'veces'} · último precio {formatPrice(p.lastPrice)} · {day(p.lastDate)}
                    </span>
                  </span>
                  {p.purchased ? <Badge tone="green">Ya compró</Badge> : <Badge tone="amber">Aún no compra</Badge>}
                </li>
              ))}
            </ul>
          </Block>

          <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1 mb-3" role="tablist">
            {[['pedidos', `Pedidos (${stats.orderList.length})`], ['cotizaciones', `Cotizaciones (${stats.quoteList.length})`]].map(([key, text]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className="h-9 px-4 rounded-lg text-xs font-semibold" style={tab === key ? { backgroundColor: INK, color: '#fff' } : { color: '#64748b' }}>
                {text}
              </button>
            ))}
          </div>
          <div className="mb-7 rounded-2xl border border-neutral-200 bg-white">
            {tab === 'pedidos' ? (
              stats.orderList.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">Sin pedidos.</p>
              ) : (
                <ul className="divide-y divide-neutral-100 text-sm">
                  {stats.orderList.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span>
                        <strong style={{ ...mono, color: INK }}>{s.order_number ? `#${s.order_number}` : 'Pedido'}</strong>
                        <span className="block text-xs text-slate-500">{day(s.created_at)} · {(s.sale_items ?? []).reduce((n, i) => n + i.quantity, 0)} artículos</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone={ORDER_TONE[s.status]}>{s.status}</Badge>
                        <strong style={mono}>{formatPrice(s.total)}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : stats.quoteList.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Sin cotizaciones.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {stats.quoteList.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <strong style={{ ...mono, color: INK }}>COT-{q.quote_number}</strong>
                      <span className="block text-xs text-slate-500 truncate">{day(q.created_at)} · {(q.quote_items ?? []).map((i) => `${i.product_name} ×${i.quantity}`).join(', ')}</span>
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge>
                      <strong style={mono}>{formatPrice(q.total)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <form id="customer-form" onSubmit={save}>
        <fieldset disabled={!canEdit} className="contents">
          <Section title="Datos del cliente">
            <Field label="Nombre" className="col-span-2">
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nombre del cliente" className={inputCls} />
            </Field>
            <Field label="Teléfono" hint={wa ? undefined : 'Identifica al cliente: sus pedidos se vinculan por este número.'}>
              <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="7000-0000" className={inputCls} />
            </Field>
            <Field label="Correo">
              <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="Opcional" className={inputCls} />
            </Field>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
                <Icon d={ICONS.chat} size={16} /> Escribir por WhatsApp
              </a>
            )}
            <Field label="Departamento">
              <select value={form.department} onChange={(e) => set({ department: e.target.value })} className={inputCls}>
                <option value="">Sin indicar</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Municipio">
              <input value={form.municipality} onChange={(e) => set({ municipality: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Dirección" className="col-span-2">
              <input value={form.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Notas internas" className="col-span-2">
              <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Gustos, aromas que prefiere, forma de pago…" className={textareaCls} />
            </Field>
          </Section>
        </fieldset>
      </form>
    </Drawer>
  )
}
