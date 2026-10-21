import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { invoiceSale, listCouriers, listProducts, listSales, updateSale } from '../api'
import { useAuth } from '../AuthContext'
import { formatPrice } from '../../catalog'
import { Icon, ICONS, INK, AMBER, mono } from '../../components/ui'
import { Alert, Badge, Btn, Chip, DataTable } from '../kit'
import OrderCard from '../orders/OrderCard'
import OrderDrawer from '../orders/OrderDrawer'
import NewOrderDrawer from '../orders/NewOrderDrawer'
import CouriersDrawer from '../orders/CouriersDrawer'
import { COLUMNS, MIGRATION_HINT, columnOf, fmtDateTime, itemsSummary, needsMigration, orderLabel, qtyOf } from '../orders/shared'

const GRID = 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z'
const LIST = 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01'
const DELIVERED_LIMIT = 12

export default function Sales() {
  const { can } = useAuth()
  const canUpdate = can('sales.update')
  const [orders, setOrders] = useState([])
  const [couriers, setCouriers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('board') // board | list
  const [q, setQ] = useState('')
  const [day, setDay] = useState('')
  const [showCancelled, setShowCancelled] = useState(false)
  const [showAllDelivered, setShowAllDelivered] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [couriersOpen, setCouriersOpen] = useState(false)
  const [migrationMissing, setMigrationMissing] = useState(false)

  const fail = (err) => setError(needsMigration(err) ? MIGRATION_HINT : err.message)

  const load = () => {
    setLoading(true)
    listSales()
      .then(setOrders)
      .catch(fail)
      .finally(() => setLoading(false))
    listCouriers()
      .then((c) => {
        setCouriers(c)
        setMigrationMissing(false)
      })
      .catch(() => {
        setCouriers([])
        setMigrationMissing(true)
      })
    if (can('sales.create')) listProducts().then(setProducts).catch(() => {})
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  // llega desde «+ Nuevo» del menú superior
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('nuevo') && can('sales.create')) {
      setParams({}, { replace: true })
      setNewOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patchLocal = (id, patch) => setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)))

  const run = async (order, action) => {
    setBusyId(order.id)
    try {
      await action()
    } catch (err) {
      fail(err)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const setStatus = (order, status) =>
    run(order, async () => {
      patchLocal(order.id, { status })
      await updateSale(order.id, { status })
    })

  const assign = (order, courierId) =>
    run(order, async () => {
      patchLocal(order.id, { courier_id: courierId })
      await updateSale(order.id, { courier_id: courierId })
    })

  const invoice = (order) =>
    run(order, async () => {
      const number = await invoiceSale(order.id)
      patchLocal(order.id, { invoiced: true, invoice_number: number })
      setSelected((s) => (s && s.id === order.id ? { ...s, invoiced: true, invoice_number: number } : s))
    })

  // búsqueda y día de entrega
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return orders.filter((o) => {
      if (day && o.delivery_date !== day) return false
      if (!needle) return true
      return `${o.customer_name} ${o.customer_phone} ${o.department ?? ''} ${o.municipality ?? ''} ${orderLabel(o)} ${o.invoice_number ?? ''} ${itemsSummary(o)}`
        .toLowerCase()
        .includes(needle)
    })
  }, [orders, q, day])

  const grouped = useMemo(() => {
    const g = Object.fromEntries(COLUMNS.map((c) => [c.key, []]))
    filtered.forEach((o) => g[columnOf(o)].push(o))
    return g
  }, [filtered])

  const active = filtered.filter((o) => o.status !== 'cancelada').length
  const columns = COLUMNS.filter((c) => c.key !== 'cancelado' || showCancelled)

  const tableColumns = [
    { key: 'order', header: '#', value: (o) => o.order_number ?? 0, render: (o) => <span className="text-slate-500" style={mono}>{orderLabel(o) || '—'}</span> },
    { key: 'created_at', header: 'Fecha', hide: 'md', value: (o) => o.created_at, render: (o) => <span className="text-slate-600 whitespace-nowrap">{fmtDateTime(o.created_at)}</span> },
    {
      key: 'customer',
      header: 'Cliente',
      value: (o) => `${o.customer_name} ${o.customer_phone}`,
      render: (o) => (
        <span className="block min-w-[140px]">
          <strong style={{ color: INK }}>{o.customer_name || 'Sin nombre'}</strong>
          {o.customer_phone && <span className="block text-xs text-slate-500">{o.customer_phone}</span>}
        </span>
      ),
    },
    {
      key: 'dest',
      header: 'Destino',
      hide: 'lg',
      value: (o) => ((o.delivery_method ?? 'envio') === 'retiro' ? 'Retiro en tienda' : [o.department, o.municipality].filter(Boolean).join(' / ')),
      render: (o) => <span className="text-slate-600">{(o.delivery_method ?? 'envio') === 'retiro' ? 'Retiro en tienda' : [o.department, o.municipality].filter(Boolean).join(' / ') || '—'}</span>,
    },
    { key: 'total', header: 'Total', value: (o) => Number(o.total), render: (o) => <strong style={mono}>{formatPrice(o.total)}</strong> },
    {
      key: 'column',
      header: 'Estado',
      value: (o) => columnOf(o),
      render: (o) => {
        const c = COLUMNS.find((x) => x.key === columnOf(o))
        return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.fg }}>{c.label}</span>
      },
    },
    { key: 'invoice', header: 'Factura', hide: 'md', value: (o) => o.invoice_number ?? '', render: (o) => (o.invoice_number ? <Badge tone="green">{o.invoice_number}</Badge> : <span className="text-slate-300">—</span>) },
    { key: 'qty', header: 'Cant.', hide: 'lg', value: (o) => qtyOf(o), render: (o) => <span className="text-slate-600">{qtyOf(o)}</span> },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (o) => <Btn size="sm" kind="secondary" onClick={() => setSelected(o)}>Ver</Btn>,
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {migrationMissing && !error && (
        <Alert onClose={() => setMigrationMissing(false)}>
          Las funciones de entrega (encomendistas, fechas, facturas) necesitan actualizar la base de datos. Ejecuta <strong>supabase/orders.sql</strong> en el SQL Editor de Supabase y recarga.
        </Alert>
      )}

      {/* barra de herramientas */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black" style={{ color: INK }}>Pedidos</h2>
            <span className="text-sm text-slate-400">({orders.length})</span>
          </div>
          <div className="flex rounded-xl border border-neutral-300 overflow-hidden" role="group" aria-label="Vista">
            {[['board', GRID, 'Tablero'], ['list', LIST, 'Lista']].map(([key, d, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-pressed={view === key}
                title={label}
                aria-label={label}
                className="w-10 h-10 flex items-center justify-center transition-colors"
                style={view === key ? { backgroundColor: INK, color: '#fff' } : { color: '#64748b' }}
              >
                <Icon d={d} size={17} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {can('couriers.manage') && <Btn kind="secondary" onClick={() => setCouriersOpen(true)} className="h-10">Encomendistas</Btn>}
            {can('sales.create') && (
              <Btn onClick={() => setNewOpen(true)} className="h-10" style={{ backgroundColor: AMBER, borderColor: AMBER }}>+ Nuevo pedido</Btn>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Icon d={ICONS.search} size={16} /></span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cliente, producto, teléfono o #pedido…"
              aria-label="Buscar pedidos"
              className="w-full h-11 rounded-xl border border-neutral-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            Día de entrega
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-900" />
          </label>
          {day && <Btn kind="ghost" size="sm" onClick={() => setDay('')}>Quitar día</Btn>}
          <Chip active={showCancelled} onClick={() => setShowCancelled((v) => !v)}>
            Ver cancelados{grouped.cancelado.length ? ` (${grouped.cancelado.length})` : ''}
          </Chip>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {day ? 'Mostrando las entregas de ese día.' : 'Mostrando todos los pedidos activos (cualquier fecha).'} · {active} activos
        </p>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => <div key={i} className="h-72 w-[300px] flex-shrink-0 rounded-2xl bg-white border border-neutral-200 animate-pulse" />)}
        </div>
      ) : view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start -mx-1 px-1">
          {columns.map((col) => {
            const all = grouped[col.key]
            const list = col.key === 'entregado' && !showAllDelivered ? all.slice(0, DELIVERED_LIMIT) : all
            return (
              <section key={col.key} className="w-[310px] flex-shrink-0" aria-label={col.label}>
                <header className="flex items-center justify-between mb-3 px-1">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: col.bg, color: col.fg }}>{col.label}</span>
                  <span className="text-sm font-bold text-slate-500">{all.length}</span>
                </header>
                <div className="space-y-3">
                  {list.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      couriers={couriers}
                      canUpdate={canUpdate}
                      busy={busyId === o.id}
                      onOpen={setSelected}
                      onStatus={setStatus}
                      onAssign={assign}
                      onInvoice={invoice}
                    />
                  ))}
                  {all.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-xs text-slate-400">Sin pedidos</p>
                  )}
                  {col.key === 'entregado' && all.length > DELIVERED_LIMIT && (
                    <button onClick={() => setShowAllDelivered((v) => !v)} className="w-full text-xs font-semibold text-slate-500 underline hover:text-slate-900 py-2">
                      {showAllDelivered ? 'Ver menos' : `Ver los ${all.length - DELIVERED_LIMIT} anteriores`}
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          rows={filtered.filter((o) => showCancelled || o.status !== 'cancelada')}
          loading={loading}
          rowKey="id"
          initialSort={{ key: 'order', dir: 'desc' }}
          searchPlaceholder="Filtrar la lista…"
          exportName="pedidos"
          empty="Todavía no hay pedidos."
        />
      )}

      <OrderDrawer
        order={selected}
        couriers={couriers}
        canUpdate={canUpdate}
        onClose={() => setSelected(null)}
        onSaved={load}
        onInvoice={invoice}
        onError={fail}
      />
      <NewOrderDrawer
        open={newOpen}
        products={products}
        couriers={couriers}
        onClose={() => setNewOpen(false)}
        onCreated={load}
        onError={fail}
      />
      <CouriersDrawer open={couriersOpen} couriers={couriers} onClose={() => setCouriersOpen(false)} onChanged={load} onError={fail} />
    </div>
  )
}
