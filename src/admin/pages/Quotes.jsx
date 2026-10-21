import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createSale, deleteQuote, listCustomersFull, listProducts, listQuotes, updateQuote } from '../api'
import { useAuth } from '../AuthContext'
import { formatPrice } from '../../catalog'
import { INK, mono } from '../../components/ui'
import { Alert, Badge, Btn, Chip, ConfirmDialog, DataTable, IconBtn, Stat, TrashIcon } from '../kit'
import QuoteDrawer from '../customers/QuoteDrawer'
import { QUOTE_STATUS } from '../customers/stats'
import { MIGRATION_HINT, needsMigration } from '../orders/shared'

const day = (d) => (d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const isExpired = (q) => q.valid_until && (q.status === 'abierta' || q.status === 'enviada') && new Date(`${q.valid_until}T23:59:59`) < new Date()

export default function Quotes() {
  const { can } = useAuth()
  const canEdit = can('quotes.edit')
  const [quotes, setQuotes] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [status, setStatus] = useState('todas')
  const [newOpen, setNewOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const fail = (err) => setError(needsMigration(err) ? MIGRATION_HINT.replace('orders.sql', 'customers.sql') : err.message)

  const load = () => {
    setLoading(true)
    listQuotes().then(setQuotes).catch(fail).finally(() => setLoading(false))
    listCustomersFull().then((d) => setCustomers(d.customers)).catch(() => {})
    if (can('quotes.create')) listProducts().then(setProducts).catch(() => {})
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  // llega desde «+ Nuevo» del menú superior
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('nuevo') && can('quotes.create')) {
      setParams({}, { replace: true })
      setNewOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const c = { todas: quotes.length, abierta: 0, enviada: 0, ganada: 0, perdida: 0 }
    quotes.forEach((q) => (c[q.status] += 1))
    return c
  }, [quotes])
  const rows = status === 'todas' ? quotes : quotes.filter((q) => q.status === status)
  const pipeline = quotes.filter((q) => q.status === 'abierta' || q.status === 'enviada').reduce((n, q) => n + Number(q.total), 0)
  const closed = counts.ganada + counts.perdida
  const winRate = closed ? Math.round((counts.ganada / closed) * 100) : null

  const setQuoteStatus = async (q, next) => {
    setBusyId(q.id)
    try {
      setQuotes((list) => list.map((x) => (x.id === q.id ? { ...x, status: next } : x)))
      await updateQuote(q.id, { status: next })
    } catch (err) {
      fail(err)
      load()
    } finally {
      setBusyId(null)
    }
  }

  // Convierte la cotización en un pedido confirmado y la marca como ganada
  const convert = async (q) => {
    setBusyId(q.id)
    setError('')
    try {
      const customer = customers.find((c) => c.id === q.customer_id)
      const sale = await createSale({
        customer_id: q.customer_id,
        customer_name: customer?.name ?? q.customers?.name ?? '',
        customer_phone: customer?.phone ?? q.customers?.phone ?? '',
        department: customer?.department ?? '',
        municipality: customer?.municipality ?? '',
        address: customer?.address ?? '',
        notes: q.notes ?? '',
        subtotal: q.total,
        discount_total: 0,
        total: q.total,
        status: 'confirmada',
        source: 'admin',
        items: (q.quote_items ?? []).map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      })
      await updateQuote(q.id, { status: 'ganada', converted_sale_id: sale.id })
      setNotice(`Cotización COT-${q.quote_number} convertida en pedido${sale.order_number ? ` #${sale.order_number}` : ''}. Lo encuentras en Pedidos.`)
      load()
    } catch (err) {
      fail(err)
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    try {
      await deleteQuote(toDelete.id)
      setToDelete(null)
      load()
    } catch (err) {
      setToDelete(null)
      fail(err)
    }
  }

  const columns = [
    { key: 'number', header: '#', value: (q) => q.quote_number, render: (q) => <strong style={{ ...mono, color: INK }}>COT-{q.quote_number}</strong> },
    { key: 'created_at', header: 'Fecha', hide: 'md', value: (q) => q.created_at, render: (q) => <span className="text-slate-600 whitespace-nowrap">{day(q.created_at)}</span> },
    {
      key: 'customer',
      header: 'Cliente',
      value: (q) => `${q.customers?.name ?? ''} ${q.customers?.phone ?? ''}`,
      render: (q) => (
        <span className="block min-w-[150px]">
          <strong style={{ color: INK }}>{q.customers?.name || 'Sin nombre'}</strong>
          {q.customers?.phone && <span className="block text-xs text-slate-500">{q.customers.phone}</span>}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Productos',
      hide: 'lg',
      value: (q) => (q.quote_items ?? []).map((i) => i.product_name).join(' '),
      render: (q) => <span className="text-slate-600 text-xs">{(q.quote_items ?? []).map((i) => `${i.product_name} ×${i.quantity}`).join(', ')}</span>,
    },
    { key: 'total', header: 'Total', value: (q) => Number(q.total), render: (q) => <strong style={mono}>{formatPrice(q.total)}</strong> },
    {
      key: 'valid_until',
      header: 'Vigencia',
      hide: 'md',
      value: (q) => q.valid_until ?? '9999',
      render: (q) => (q.valid_until ? <span className="inline-flex items-center gap-2 text-slate-600">{day(q.valid_until)}{isExpired(q) && <Badge tone="red">Vencida</Badge>}</span> : <span className="text-slate-300">—</span>),
    },
    {
      key: 'status',
      header: 'Estado',
      value: (q) => QUOTE_STATUS[q.status].label,
      stop: true,
      render: (q) =>
        canEdit && !q.converted_sale_id ? (
          <select value={q.status} onChange={(e) => setQuoteStatus(q, e.target.value)} disabled={busyId === q.id} aria-label="Estado de la cotización" className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-xs font-semibold text-slate-700">
            {Object.entries(QUOTE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        ) : (
          <Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}{q.converted_sale_id ? ' · pedido' : ''}</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (q) => (
        <span className="inline-flex items-center gap-1">
          {can('sales.create') && !q.converted_sale_id && q.status !== 'perdida' && (
            <Btn size="sm" kind="secondary" disabled={busyId === q.id} onClick={() => convert(q)} style={{ color: '#15803d' }}>Convertir en pedido</Btn>
          )}
          {can('quotes.delete') && <IconBtn title="Eliminar" danger onClick={() => setToDelete(q)}><TrashIcon /></IconBtn>}
        </span>
      ),
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert kind="ok" onClose={() => setNotice('')}>{notice}</Alert>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat label="Cotizaciones" value={quotes.length} />
        <Stat label="En seguimiento" value={counts.abierta + counts.enviada} hint={`${formatPrice(pipeline)} por cerrar`} />
        <Stat label="Ganadas" value={counts.ganada} />
        <Stat label="Tasa de cierre" value={winRate === null ? '—' : `${winRate}%`} hint={closed ? `${closed} cerradas` : 'Aún sin cerrar'} />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        initialSort={{ key: 'number', dir: 'desc' }}
        searchPlaceholder="Buscar por cliente, teléfono o producto…"
        exportName="cotizaciones"
        empty="Todavía no hay cotizaciones. Aparecen aquí las que piden desde la tienda y las que registres."
        toolbar={
          <>
            <div className="flex flex-wrap gap-2">
              {[['todas', 'Todas'], ['abierta', 'Abiertas'], ['enviada', 'Enviadas'], ['ganada', 'Ganadas'], ['perdida', 'Perdidas']].map(([k, text]) => (
                <Chip key={k} active={status === k} onClick={() => setStatus(k)}>{text} ({counts[k]})</Chip>
              ))}
            </div>
            {can('quotes.create') && <Btn onClick={() => setNewOpen(true)} className="sm:ml-auto h-10">+ Nueva cotización</Btn>}
          </>
        }
      />

      <QuoteDrawer open={newOpen} customers={customers} products={products} presetCustomerId={null} onClose={() => setNewOpen(false)} onSaved={load} onError={fail} />
      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar cotización?"
        message={toDelete ? `Se eliminará COT-${toDelete.quote_number}. Esta acción no se puede deshacer.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
