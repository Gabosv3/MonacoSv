import { useEffect, useMemo, useState } from 'react'
import {
  createCarrier, createShipment, deleteCarrier, deleteShipment, listCarriers, listSales, listShipments, updateCarrier, updateShipment,
} from '../api'
import { useAuth } from '../AuthContext'
import { formatPrice } from '../../catalog'
import { LABEL_SIZES, printShippingLabel } from '../../lib/shippingLabel'
import { useSettings } from '../../settings'
import { Icon, ICONS, INK, mono } from '../../components/ui'
import {
  Alert, Badge, Btn, ConfirmDialog, DataTable, Drawer, Field, IconBtn, PencilIcon, Section, Switch, TrashIcon, inputCls, textareaCls,
} from '../kit'
import { MIGRATION_HINT, needsMigration } from '../orders/shared'

const STATUS = {
  preparando: { label: 'Preparando', tone: 'amber' },
  enviado: { label: 'Enviado', tone: 'blue' },
  entregado: { label: 'Entregado', tone: 'green' },
  devuelto: { label: 'Devuelto', tone: 'red' },
}

const EMPTY_SHIPMENT = { id: null, sale_id: '', carrier_id: '', tracking_number: '', status: 'preparando', cost: '', notes: '', ship_date: '' }
const EMPTY_CARRIER = { id: null, name: '', phone: '', tracking_url: '', notes: '', active: true, shipping_price: '' }

const trackingLink = (carrier, number) => {
  if (!carrier?.tracking_url || !number) return null
  return carrier.tracking_url.includes('{guia}') ? carrier.tracking_url.replace('{guia}', encodeURIComponent(number)) : carrier.tracking_url
}

const PrintIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a2 2 0 012-2h14a2 2 0 012 2v6a1 1 0 01-1 1h-2M7 14h10v7H7z" />
  </svg>
)

const fmtDay =(d) => (d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mondayOf = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
// día planeado: el que se eligió para el envío o, si no, el día de entrega del pedido
const plannedDay = (s) => s.ship_date || s.sales?.delivery_date || ''

function ShipCard({ s, manage, onDate, onStatus, onPrint, onEdit }) {
  const sale = s.sales ?? {}
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold truncate" style={{ color: INK }}>{sale.customer_name || 'Sin nombre'}</p>
          <p className="text-xs text-slate-500" style={mono}>{sale.order_number ? `#${sale.order_number}` : ''} {sale.invoice_number ?? ''}</p>
        </div>
        {manage ? (
          <select
            value={s.status}
            onChange={(e) => onStatus(s, e.target.value)}
            aria-label="Estado del despacho"
            className="h-8 shrink-0 rounded-lg border border-neutral-300 bg-white px-1.5 text-xs font-semibold text-slate-700"
          >
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        ) : (
          <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-600">{[sale.department, sale.municipality].filter(Boolean).join(' / ') || '—'}</p>
      {s.tracking_number && <p className="mt-0.5 text-xs text-slate-500" style={mono}>Guía {s.tracking_number}</p>}
      <div className="mt-2 flex items-center gap-1">
        {manage && (
          <input
            type="date"
            value={plannedDay(s)}
            onChange={(e) => onDate(s, e.target.value || null)}
            aria-label="Día de envío"
            className="h-8 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2 text-xs text-slate-700"
          />
        )}
        <IconBtn title="Imprimir etiqueta" onClick={() => onPrint(s)}><PrintIcon /></IconBtn>
        {manage && <IconBtn title="Editar" onClick={() => onEdit(s)}><PencilIcon /></IconBtn>}
      </div>
    </li>
  )
}

// Calendario semanal: lunes a domingo, y en cada día los paquetes agrupados por paquetera
function WeekPlanner({ shipments, loading, manage, onDate, onStatus, onPrint, onEdit }) {
  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d }), [monday])
  const today = ymd(new Date())
  const shift = (n) => setMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + n * 7); return d })
  const rangeLabel = `${days[0].toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const byDay = useMemo(() => {
    const map = {}
    shipments.forEach((s) => {
      const k = plannedDay(s)
      ;(map[k] ??= []).push(s)
    })
    return map
  }, [shipments])

  const groupByCarrier = (list) => {
    const g = {}
    list.forEach((s) => (g[s.carriers?.name ?? 'Sin paquetera'] ??= []).push(s))
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
  }

  const pending = (byDay[''] ?? []).filter((s) => s.status !== 'entregado')
  const cardProps = { manage, onDate, onStatus, onPrint, onEdit }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Btn kind="secondary" className="h-10" onClick={() => shift(-1)} aria-label="Semana anterior">←</Btn>
        <Btn kind="secondary" className="h-10" onClick={() => setMonday(mondayOf(new Date()))}>Esta semana</Btn>
        <Btn kind="secondary" className="h-10" onClick={() => shift(1)} aria-label="Semana siguiente">→</Btn>
        <p className="ml-1 text-sm font-semibold" style={{ color: INK }}>{rangeLabel}</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando…</p>}

      {pending.length > 0 && (
        <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800" style={mono}>Sin día de envío ({pending.length})</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {pending.map((s) => <ShipCard key={s.id} s={s} {...cardProps} />)}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((d, i) => {
          const key = ymd(d)
          const list = byDay[key] ?? []
          return (
            <section key={key} className={`min-w-0 rounded-2xl border bg-white p-4 ${key === today ? 'border-slate-900' : 'border-neutral-200'}`}>
              <h3 className="mb-3 flex items-baseline justify-between gap-2">
                <span className="font-black uppercase" style={{ color: INK }}>{DAY_NAMES[i]}</span>
                <span className="text-xs text-slate-500">{d.getDate()}/{d.getMonth() + 1}{list.length ? ` · ${list.length}` : ''}</span>
              </h3>
              {list.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">Sin envíos</p>
              ) : (
                <div className="space-y-3">
                  {groupByCarrier(list).map(([carrier, items]) => (
                    <div key={carrier}>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-pink-700">{carrier} · {items.length}</p>
                      <ul className="space-y-2">{items.map((s) => <ShipCard key={s.id} s={s} {...cardProps} />)}</ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default function Logistics() {
  const { can } = useAuth()
  const { cfg } = useSettings()
  const manage = can('shipments.manage')
  const [tab, setTab] = useState('despachos')
  const [labelFor, setLabelFor] = useState(null) // despacho cuya etiqueta se va a imprimir
  const [printing, setPrinting] = useState(false)
  const [labelSize, setLabelSize] = useState(() => {
    try {
      const saved = localStorage.getItem('monacosv_label_size')
      return LABEL_SIZES[saved] ? saved : '100x150'
    } catch {
      return '100x150'
    }
  })
  const doPrint = async () => {
    setPrinting(true)
    try {
      await printShippingLabel(labelFor, cfg, labelSize)
      setLabelFor(null)
    } catch (err) {
      setLabelFor(null)
      setError(err.message || 'No se pudo generar la etiqueta.')
    } finally {
      setPrinting(false)
    }
  }
  const pickLabelSize = (v) => {
    setLabelSize(v)
    try {
      localStorage.setItem('monacosv_label_size', v)
    } catch {
      /* sin almacenamiento */
    }
  }
  const [shipments, setShipments] = useState([])
  const [carriers, setCarriers] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // filtros de despachos
  const [statusFilter, setStatusFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // formularios
  const [sForm, setSForm] = useState(EMPTY_SHIPMENT)
  const [sOpen, setSOpen] = useState(false)
  const [cForm, setCForm] = useState(EMPTY_CARRIER)
  const [cOpen, setCOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null) // { kind, item }

  // costo del envío: gratis desde el mínimo de Ajustes; si no, el precio de la paquetera
  const shippingCost = useMemo(() => {
    const sale = sales.find((o) => o.id === sForm.sale_id)
    const carrier = carriers.find((c) => c.id === sForm.carrier_id)
    const min = Number(cfg.free_shipping_min) || 0
    if (sale && min > 0 && Number(sale.total) >= min) return { amount: 0, free: true, note: `Envío gratis: el pedido llega a ${formatPrice(min)}.` }
    if (!carrier) return { amount: 0, free: false, note: 'Elige la paquetera para calcularlo.' }
    const amount = Number(carrier.shipping_price) || 0
    return { amount, free: false, note: amount ? `Precio de ${carrier.name}.` : `${carrier.name} no tiene precio: ponlo en Paqueteras.` }
  }, [sales, carriers, sForm.sale_id, sForm.carrier_id, cfg.free_shipping_min])

  const fail = (err) => setError(needsMigration(err) ? MIGRATION_HINT : err.message)

  const load = () => {
    setLoading(true)
    Promise.all([listShipments(), listCarriers(), listSales().catch(() => [])])
      .then(([s, c, o]) => {
        setShipments(s)
        setCarriers(c)
        setSales(o)
      })
      .catch(fail)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // pedidos que todavía se pueden despachar (no cancelados y sin despacho)
  const dispatchable = useMemo(() => {
    const used = new Set(shipments.map((s) => s.sale_id))
    return sales.filter((o) => o.status !== 'cancelada' && (!used.has(o.id) || o.id === sForm.sale_id))
  }, [sales, shipments, sForm.sale_id])

  const filteredShipments = useMemo(
    () =>
      shipments.filter((s) => {
        if (statusFilter && s.status !== statusFilter) return false
        const created = s.created_at.slice(0, 10)
        if (from && created < from) return false
        if (to && created > to) return false
        return true
      }),
    [shipments, statusFilter, from, to]
  )

  // ---------- despachos ----------
  const openNewShipment = () => {
    setSForm(EMPTY_SHIPMENT)
    setSOpen(true)
  }

  const openEditShipment = (s) => {
    setSForm({ id: s.id, sale_id: s.sale_id, carrier_id: s.carrier_id ?? '', tracking_number: s.tracking_number, status: s.status, cost: s.cost, notes: s.notes, ship_date: s.ship_date ?? '' })
    setSOpen(true)
  }

  const saveShipment = async (e) => {
    e.preventDefault()
    if (!sForm.sale_id) return setError('Elige el pedido que vas a despachar.')
    setSaving(true)
    setError('')
    const payload = {
      carrier_id: sForm.carrier_id || null,
      tracking_number: sForm.tracking_number.trim(),
      status: sForm.status,
      cost: shippingCost.amount,
      notes: sForm.notes,
      ship_date: sForm.ship_date || null,
    }
    try {
      if (sForm.id) await updateShipment(sForm.id, payload)
      else await createShipment({ ...payload, sale_id: sForm.sale_id })
      setSOpen(false)
      load()
    } catch (err) {
      fail(err)
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (s, status) => {
    setShipments((list) => list.map((x) => (x.id === s.id ? { ...x, status } : x)))
    try {
      await updateShipment(s.id, { status })
      load()
    } catch (err) {
      fail(err)
      load()
    }
  }

  // ---------- paqueteras ----------
  const openNewCarrier = () => {
    setCForm(EMPTY_CARRIER)
    setCOpen(true)
  }

  const openEditCarrier = (c) => {
    setCForm({ id: c.id, name: c.name, phone: c.phone, tracking_url: c.tracking_url, notes: c.notes, active: c.active, shipping_price: c.shipping_price ?? '' })
    setCOpen(true)
  }

  const saveCarrier = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { name: cForm.name.trim(), phone: cForm.phone.trim(), tracking_url: cForm.tracking_url.trim(), notes: cForm.notes, active: cForm.active, shipping_price: Number(cForm.shipping_price) || 0 }
    try {
      if (cForm.id) await updateCarrier(cForm.id, payload)
      else await createCarrier(payload)
      setCOpen(false)
      load()
    } catch (err) {
      setError(/duplicate|unique/i.test(err.message) ? 'Ya existe una paquetera con ese nombre.' : needsMigration(err) ? MIGRATION_HINT : err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleCarrier = async (c) => {
    setCarriers((list) => list.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)))
    try {
      await updateCarrier(c.id, { active: !c.active })
    } catch (err) {
      fail(err)
      load()
    }
  }

  const confirmDelete = async () => {
    try {
      if (toDelete.kind === 'shipment') await deleteShipment(toDelete.item.id)
      else await deleteCarrier(toDelete.item.id)
      setToDelete(null)
      load()
    } catch (err) {
      setToDelete(null)
      fail(err)
    }
  }

  const shipmentColumns = [
    { key: 'order', header: '#', value: (s) => s.sales?.order_number ?? 0, render: (s) => <span className="text-slate-500" style={mono}>{s.sales?.order_number ? `#${s.sales.order_number}` : '—'}</span> },
    { key: 'invoice', header: 'Factura', hide: 'md', value: (s) => s.sales?.invoice_number ?? '', render: (s) => (s.sales?.invoice_number ? <span className="text-pink-600 font-semibold" style={mono}>{s.sales.invoice_number}</span> : <span className="text-slate-300">—</span>) },
    {
      key: 'customer',
      header: 'Cliente',
      value: (s) => `${s.sales?.customer_name ?? ''} ${s.sales?.customer_phone ?? ''}`,
      render: (s) => (
        <span className="block min-w-[150px]">
          <strong style={{ color: INK }}>{s.sales?.customer_name || 'Sin nombre'}</strong>
          {s.sales?.customer_phone && <span className="block text-xs text-slate-500">{s.sales.customer_phone}</span>}
        </span>
      ),
    },
    {
      key: 'dest',
      header: 'Destino',
      hide: 'lg',
      value: (s) => [s.sales?.department, s.sales?.municipality].filter(Boolean).join(' / '),
      render: (s) => <span className="text-slate-600">{[s.sales?.department, s.sales?.municipality].filter(Boolean).join(' / ') || '—'}</span>,
    },
    { key: 'carrier', header: 'Paquetera', hide: 'md', value: (s) => s.carriers?.name ?? '', render: (s) => <span className="text-slate-700">{s.carriers?.name ?? <span className="text-slate-300">Sin asignar</span>}</span> },
    {
      key: 'tracking',
      header: 'Guía',
      hide: 'lg',
      value: (s) => s.tracking_number,
      render: (s) => {
        const link = trackingLink(s.carriers, s.tracking_number)
        if (!s.tracking_number) return <span className="text-slate-300">—</span>
        return link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="underline text-slate-700 hover:text-slate-900" style={mono}>{s.tracking_number}</a>
        ) : (
          <span style={mono}>{s.tracking_number}</span>
        )
      },
    },
    {
      key: 'status',
      header: 'Estado',
      value: (s) => STATUS[s.status].label,
      stop: true,
      render: (s) =>
        manage ? (
          <select
            value={s.status}
            onChange={(e) => changeStatus(s, e.target.value)}
            aria-label="Estado del despacho"
            className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-xs font-semibold text-slate-700"
          >
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        ) : (
          <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
        ),
    },
    { key: 'cost', header: 'Costo', hide: 'xl', value: (s) => Number(s.cost), render: (s) => <span style={mono}>{formatPrice(s.cost)}</span> },
    { key: 'shipped_at', header: 'Enviado', hide: 'lg', value: (s) => s.shipped_at ?? '', render: (s) => <span className="text-slate-600 whitespace-nowrap">{fmtDay(s.shipped_at)}</span> },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (s) =>
        manage ? (
          <span className="inline-flex whitespace-nowrap">
            <IconBtn title="Imprimir etiqueta" onClick={() => setLabelFor(s)}><PrintIcon /></IconBtn>
            <IconBtn title="Editar" onClick={() => openEditShipment(s)}><PencilIcon /></IconBtn>
            <IconBtn title="Eliminar" danger onClick={() => setToDelete({ kind: 'shipment', item: s })}><TrashIcon /></IconBtn>
          </span>
        ) : null,
    },
  ]

  const carrierColumns = [
    { key: 'name', header: 'Paquetera', value: (c) => c.name, render: (c) => <strong style={{ color: INK }}>{c.name}</strong> },
    { key: 'phone', header: 'Teléfono', hide: 'sm', value: (c) => c.phone, render: (c) => <span className="text-slate-600">{c.phone || '—'}</span> },
    { key: 'shipment_count', header: 'Despachos', value: (c) => c.shipment_count, render: (c) => <span className="text-slate-600">{c.shipment_count}</span> },
    { key: 'shipping_price', header: 'Precio envío', value: (c) => Number(c.shipping_price), render: (c) => <span style={mono}>{formatPrice(c.shipping_price)}</span> },
    { key: 'tracking_url', header: 'Seguimiento', hide: 'lg', value: (c) => c.tracking_url, render: (c) => <span className="text-xs text-slate-500 break-all">{c.tracking_url || '—'}</span> },
    { key: 'active', header: 'Activa', value: (c) => (c.active ? 'Activa' : 'Inactiva'), stop: true, render: (c) => <Switch checked={c.active} onChange={() => manage && toggleCarrier(c)} label={`Activar ${c.name}`} /> },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (c) =>
        manage ? (
          <span className="inline-flex">
            <IconBtn title="Editar" onClick={() => openEditCarrier(c)}><PencilIcon /></IconBtn>
            <IconBtn title="Eliminar" danger onClick={() => setToDelete({ kind: 'carrier', item: c })}><TrashIcon /></IconBtn>
          </span>
        ) : null,
    },
  ]

  const tabs = [
    ['despachos', `Despachos (${shipments.length})`],
    ['envios', 'Envíos'],
    ['paqueteras', `Paqueteras (${carriers.length})`],
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-2xl border border-neutral-200 bg-white p-1" role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className="h-10 px-5 rounded-xl text-sm font-semibold transition-colors"
            style={tab === key ? { backgroundColor: INK, color: '#fff' } : { color: '#64748b' }}
          >
            {label}
          </button>
        ))}
      </div>
      </div>

      {tab === 'envios' ? (
        <WeekPlanner
          shipments={shipments}
          loading={loading}
          manage={manage}
          onDate={async (s, ship_date) => {
            setShipments((list) => list.map((x) => (x.id === s.id ? { ...x, ship_date } : x)))
            try {
              await updateShipment(s.id, { ship_date })
            } catch (err) {
              fail(err)
              load()
            }
          }}
          onStatus={changeStatus}
          onPrint={(s) => setLabelFor(s)}
          onEdit={openEditShipment}
        />
      ) : tab === 'despachos' ? (
        <DataTable
          columns={shipmentColumns}
          rows={filteredShipments}
          loading={loading}
          initialSort={{ key: 'order', dir: 'desc' }}
          searchPlaceholder="Buscar por cliente, teléfono o guía…"
          exportName="despachos"
          empty="Todavía no hay despachos. Crea el primero desde «+ Nuevo despacho»."
          toolbar={
            <>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar por estado" className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-slate-600">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                Desde
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border border-neutral-300 bg-white px-2.5 text-sm text-slate-700" />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                Hasta
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border border-neutral-300 bg-white px-2.5 text-sm text-slate-700" />
              </label>
              {manage && <Btn onClick={openNewShipment} className="sm:ml-auto h-10"><Icon d={ICONS.truck} size={16} /> Nuevo despacho</Btn>}
            </>
          }
        />
      ) : (
        <DataTable
          columns={carrierColumns}
          rows={carriers}
          loading={loading}
          initialSort={{ key: 'name', dir: 'asc' }}
          searchPlaceholder="Buscar paquetera…"
          empty="Todavía no hay paqueteras. Agrega la primera (por ejemplo, C807 o Cargo Express)."
          toolbar={manage && <Btn onClick={openNewCarrier} className="sm:ml-auto h-10">+ Nueva paquetera</Btn>}
        />
      )}

      <Drawer
        open={sOpen}
        onClose={() => setSOpen(false)}
        title={sForm.id ? 'Editar despacho' : 'Nuevo despacho'}
        subtitle="Al marcarlo como entregado, el pedido también pasa a entregado."
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setSOpen(false)}>Cancelar</Btn>
            <Btn type="submit" form="shipment-form" disabled={saving}>{saving ? 'Guardando…' : sForm.id ? 'Guardar cambios' : 'Crear despacho'}</Btn>
          </>
        }
      >
        <form id="shipment-form" onSubmit={saveShipment}>
          <Section title="Pedido">
            <Field label="Pedido a despachar" className="col-span-2">
              <select required disabled={!!sForm.id} value={sForm.sale_id} onChange={(e) => {
                const sale = sales.find((o) => o.id === e.target.value)
                setSForm({ ...sForm, sale_id: e.target.value, carrier_id: sForm.carrier_id || sale?.courier_id || '' })
              }} className={inputCls}>
                <option value="">Elige un pedido…</option>
                {dispatchable.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number ? `#${o.order_number} · ` : ''}{o.customer_name || 'Sin nombre'}{o.department ? ` · ${o.department}` : ''} · {formatPrice(o.total)}
                  </option>
                ))}
              </select>
            </Field>
          </Section>
          <Section title="Envío">
            <Field label="Paquetera" className="col-span-2">
              <select value={sForm.carrier_id} onChange={(e) => setSForm({ ...sForm, carrier_id: e.target.value })} className={inputCls}>
                <option value="">Sin asignar</option>
                {carriers.filter((c) => c.active || c.id === sForm.carrier_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Número de guía" className="col-span-2">
              <input value={sForm.tracking_number} onChange={(e) => setSForm({ ...sForm, tracking_number: e.target.value })} placeholder="Opcional" className={inputCls} />
            </Field>
            <Field label="Estado">
              <select value={sForm.status} onChange={(e) => setSForm({ ...sForm, status: e.target.value })} className={inputCls}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Costo del envío (USD)">
              <input readOnly value={shippingCost.free ? 'Gratis' : formatPrice(shippingCost.amount)} className={`${inputCls} bg-neutral-50 text-slate-600`} />
              <span className="mt-1 block text-xs text-slate-400">{shippingCost.note}</span>
            </Field>
            <Field label="Día de envío" className="col-span-2" hint="Aparece en Envíos, el calendario de la semana.">
              <input type="date" value={sForm.ship_date} onChange={(e) => setSForm({ ...sForm, ship_date: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Notas" className="col-span-2">
              <textarea value={sForm.notes} onChange={(e) => setSForm({ ...sForm, notes: e.target.value })} className={textareaCls} />
            </Field>
          </Section>
        </form>
      </Drawer>

      <Drawer
        open={cOpen}
        onClose={() => setCOpen(false)}
        title={cForm.id ? 'Editar paquetera' : 'Nueva paquetera'}
        subtitle="Empresas que transportan tus envíos."
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setCOpen(false)}>Cancelar</Btn>
            <Btn type="submit" form="carrier-form" disabled={saving}>{saving ? 'Guardando…' : cForm.id ? 'Guardar cambios' : 'Crear paquetera'}</Btn>
          </>
        }
      >
        <form id="carrier-form" onSubmit={saveCarrier}>
          <Section title="Paquetera">
            <Field label="Nombre" className="col-span-2">
              <input required value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} placeholder="Ej. Cargo Express" className={inputCls} />
            </Field>
            <Field label="Teléfono" className="col-span-2">
              <input value={cForm.phone} onChange={(e) => setCForm({ ...cForm, phone: e.target.value })} placeholder="Opcional" className={inputCls} />
            </Field>
            <Field label="Precio del envío (USD)" className="col-span-2" hint="Lo que cobra esta paquetera por paquete. Es gratis cuando la compra llega al mínimo de envío gratis (Ajustes).">
              <input type="number" step="0.01" min="0" value={cForm.shipping_price} onChange={(e) => setCForm({ ...cForm, shipping_price: e.target.value })} placeholder="0.00" className={inputCls} />
            </Field>
            <Field label="Enlace de seguimiento" className="col-span-2" hint="Usa {guia} donde va el número. Ej: https://sitio.com/rastreo?guia={guia}">
              <input value={cForm.tracking_url} onChange={(e) => setCForm({ ...cForm, tracking_url: e.target.value })} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="Notas" className="col-span-2">
              <textarea value={cForm.notes} onChange={(e) => setCForm({ ...cForm, notes: e.target.value })} className={textareaCls} />
            </Field>
            <div className="col-span-2 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold" style={{ color: INK }}>Activa</p>
              <Switch checked={cForm.active} onChange={(v) => setCForm({ ...cForm, active: v })} label="Activa" />
            </div>
          </Section>
        </form>
      </Drawer>

      {labelFor && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setLabelFor(null)} />
          <div role="dialog" aria-label="Imprimir etiqueta" className="relative w-full sm:max-w-[460px] max-h-[92svh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl p-6">
            <h2 className="text-lg font-black uppercase" style={{ color: INK }}>Imprimir etiqueta</h2>
            <p className="mt-1 text-sm text-slate-500">
              {labelFor.sales?.customer_name || 'Despacho'}{labelFor.sales?.order_number ? ` · #${labelFor.sales.order_number}` : ''}. Elige el tamaño de tu rollo.
            </p>
            <div className="mt-5 grid gap-2.5" role="radiogroup" aria-label="Tamaño de la etiqueta">
              {Object.entries(LABEL_SIZES).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={labelSize === k}
                  onClick={() => pickLabelSize(k)}
                  className={`flex items-center gap-4 rounded-2xl border-2 p-3 text-left transition-colors ${labelSize === k ? 'border-slate-900 bg-slate-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  <span className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                    <span className="block rounded-[3px] border-2 border-slate-400 bg-white" style={{ width: v.w / 3.2, height: v.h / 3.2 }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold" style={{ color: INK }}>{v.label}</span>
                    <span className="block text-xs text-slate-500">{v.hint}</span>
                  </span>
                  <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${labelSize === k ? 'border-slate-900 bg-slate-900 shadow-[inset_0_0_0_3px_#fff]' : 'border-neutral-300'}`} />
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">Se abre un PDF del tamaño exacto. En el diálogo de impresión elige tu impresora de etiquetas y deja la escala en 100 %.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Btn kind="secondary" type="button" onClick={() => setLabelFor(null)}>Cancelar</Btn>
              <Btn type="button" onClick={doPrint} disabled={printing}>{printing ? 'Generando…' : 'Imprimir'}</Btn>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={toDelete?.kind === 'shipment' ? '¿Eliminar despacho?' : '¿Eliminar paquetera?'}
        message={
          toDelete?.kind === 'shipment'
            ? 'Se eliminará este despacho. El pedido no se borra.'
            : toDelete ? `Se eliminará ${toDelete.item.name}. Sus despachos quedarán sin paquetera.` : ''
        }
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
