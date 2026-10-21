import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { deleteCustomer, listCustomersFull, listProducts } from '../api'
import { useAuth } from '../AuthContext'
import { formatPrice } from '../../catalog'
import { Icon, ICONS, INK, mono } from '../../components/ui'
import { Alert, Badge, Btn, Chip, ConfirmDialog, DataTable, IconBtn, PencilIcon, Stat, TrashIcon } from '../kit'
import CustomerDrawer from '../customers/CustomerDrawer'
import QuoteDrawer from '../customers/QuoteDrawer'
import { customerStats } from '../customers/stats'
import { MIGRATION_HINT, needsMigration, whatsappUrl } from '../orders/shared'

const day = (d) => (d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export default function Customers() {
  const { can } = useAuth()
  const [data, setData] = useState({ customers: [], sales: [], quotes: [] })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('todos') // todos | compraron | cotizaron | sin
  const [drawer, setDrawer] = useState({ open: false, customer: null })
  const [quoteFor, setQuoteFor] = useState({ open: false, customerId: null })
  const [toDelete, setToDelete] = useState(null)

  const fail = (err) => setError(needsMigration(err) ? MIGRATION_HINT.replace('orders.sql', 'customers.sql') : err.message)

  const load = () => {
    setLoading(true)
    listCustomersFull().then(setData).catch(fail).finally(() => setLoading(false))
    if (can('quotes.create')) listProducts().then(setProducts).catch(() => {})
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  // llega desde «+ Nuevo» del menú superior
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('nuevo') && can('customers.create')) {
      setParams({}, { replace: true })
      setDrawer({ open: true, customer: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(
    () => data.customers.map((c) => ({ ...c, stats: customerStats(c, data.sales, data.quotes) })),
    [data]
  )

  const counts = {
    todos: rows.length,
    compraron: rows.filter((r) => r.stats.orders > 0).length,
    cotizaron: rows.filter((r) => r.stats.orders === 0 && r.stats.quoteCount > 0).length,
    sin: rows.filter((r) => r.stats.orders === 0 && r.stats.quoteCount === 0).length,
  }
  const filtered = rows.filter((r) => {
    if (filter === 'compraron') return r.stats.orders > 0
    if (filter === 'cotizaron') return r.stats.orders === 0 && r.stats.quoteCount > 0
    if (filter === 'sin') return r.stats.orders === 0 && r.stats.quoteCount === 0
    return true
  })
  const totalSpent = rows.reduce((n, r) => n + r.stats.spent, 0)

  const openCustomer = (c) => setDrawer({ open: true, customer: c })
  const selected = drawer.customer ? rows.find((r) => r.id === drawer.customer.id) ?? drawer.customer : null

  const confirmDelete = async () => {
    try {
      await deleteCustomer(toDelete.id)
      setToDelete(null)
      load()
    } catch (err) {
      setToDelete(null)
      fail(err)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      value: (c) => `${c.name} ${c.email}`,
      render: (c) => (
        <span className="block min-w-[170px]">
          <strong style={{ color: INK }}>{c.name || 'Sin nombre'}</strong>
          {c.email && <span className="block text-xs text-slate-500">{c.email}</span>}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      value: (c) => c.phone,
      stop: true,
      render: (c) => {
        const wa = whatsappUrl(c.phone)
        return c.phone ? (
          <span className="inline-flex items-center gap-2">
            {c.phone}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" title="Escribir por WhatsApp" aria-label="Escribir por WhatsApp" className="text-emerald-600 hover:text-emerald-800"><Icon d={ICONS.chat} size={15} /></a>}
          </span>
        ) : <span className="text-slate-300">—</span>
      },
    },
    {
      key: 'place',
      header: 'Ubicación',
      hide: 'lg',
      value: (c) => [c.department, c.municipality].filter(Boolean).join(' / '),
      render: (c) => <span className="text-slate-600">{[c.department, c.municipality].filter(Boolean).join(' / ') || '—'}</span>,
    },
    { key: 'orders', header: 'Pedidos', value: (c) => c.stats.orders, render: (c) => <span className="text-slate-700 font-semibold">{c.stats.orders}</span> },
    { key: 'spent', header: 'Comprado', value: (c) => c.stats.spent, render: (c) => <strong style={mono}>{formatPrice(c.stats.spent)}</strong> },
    { key: 'last', header: 'Última compra', hide: 'md', value: (c) => c.stats.last ?? '', render: (c) => <span className="text-slate-600 whitespace-nowrap">{day(c.stats.last)}</span> },
    {
      key: 'quotes',
      header: 'Cotizaciones',
      hide: 'md',
      value: (c) => c.stats.quoteCount,
      render: (c) => (
        <span className="inline-flex items-center gap-2">
          <span className="text-slate-700 font-semibold">{c.stats.quoteCount}</span>
          {c.stats.openQuotes > 0 && <Badge tone="amber">{c.stats.openQuotes} abiertas</Badge>}
        </span>
      ),
    },
    { key: 'source', header: 'Origen', hide: 'lg', value: (c) => `${c.source}${c.user_id ? ' cuenta' : ''}`, render: (c) => (
        <span className="inline-flex flex-wrap gap-1">
          <Badge tone={c.source === 'tienda' ? 'blue' : 'neutral'}>{c.source === 'tienda' ? 'Tienda' : c.source === 'whatsapp' ? 'WhatsApp' : 'Panel'}</Badge>
          {c.user_id && <Badge tone="green">Con cuenta</Badge>}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (c) => (
        <span className="inline-flex">
          <IconBtn title={can('customers.edit') ? 'Ver y editar' : 'Ver'} onClick={() => openCustomer(c)}><PencilIcon /></IconBtn>
          {can('customers.delete') && <IconBtn title="Eliminar" danger onClick={() => setToDelete(c)}><TrashIcon /></IconBtn>}
        </span>
      ),
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat label="Clientes" value={counts.todos} />
        <Stat label="Han comprado" value={counts.compraron} hint={`${formatPrice(totalSpent)} en total`} />
        <Stat label="Solo cotizaron" value={counts.cotizaron} hint={counts.cotizaron ? 'Oportunidad de venta' : undefined} />
        <Stat label="Sin actividad" value={counts.sin} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        initialSort={{ key: 'spent', dir: 'desc' }}
        searchPlaceholder="Buscar por nombre, teléfono o correo…"
        exportName="clientes"
        empty="Todavía no hay clientes. Se registran solos con cada pedido, o crea el primero."
        expanded={(c) => (
          <div className="pt-3 grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Compra</p>
              {c.stats.boughtList.length ? (
                <ul className="space-y-1">{c.stats.boughtList.slice(0, 4).map((p) => <li key={p.name} className="flex justify-between gap-3"><span>{p.name} <span className="text-slate-400">× {p.units}</span></span><span style={mono}>{formatPrice(p.total)}</span></li>)}</ul>
              ) : <p className="text-slate-400">Aún no ha comprado.</p>}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Cotiza</p>
              {c.stats.quotedList.length ? (
                <ul className="space-y-1">{c.stats.quotedList.slice(0, 4).map((p) => <li key={p.name} className="flex justify-between gap-3"><span>{p.name} <span className="text-slate-400">× {p.times}</span></span>{p.purchased ? <Badge tone="green">Ya compró</Badge> : <Badge tone="amber">Aún no</Badge>}</li>)}</ul>
              ) : <p className="text-slate-400">Aún no ha cotizado.</p>}
              <Btn size="sm" kind="secondary" className="mt-3" onClick={() => openCustomer(c)}>Ver ficha completa</Btn>
            </div>
          </div>
        )}
        toolbar={
          <>
            <div className="flex flex-wrap gap-2">
              {[['todos', 'Todos'], ['compraron', 'Compraron'], ['cotizaron', 'Solo cotizaron'], ['sin', 'Sin actividad']].map(([k, text]) => (
                <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{text} ({counts[k]})</Chip>
              ))}
            </div>
            {can('customers.create') && <Btn onClick={() => setDrawer({ open: true, customer: null })} className="sm:ml-auto h-10">+ Nuevo cliente</Btn>}
          </>
        }
      />

      <CustomerDrawer
        open={drawer.open}
        customer={selected}
        sales={data.sales}
        quotes={data.quotes}
        canEdit={drawer.customer ? can('customers.edit') : can('customers.create')}
        canQuote={can('quotes.create')}
        onClose={() => setDrawer({ open: false, customer: null })}
        onSaved={load}
        onError={fail}
        onNewQuote={(id) => setQuoteFor({ open: true, customerId: id })}
      />
      <QuoteDrawer
        open={quoteFor.open}
        customers={data.customers}
        products={products}
        presetCustomerId={quoteFor.customerId}
        onClose={() => setQuoteFor({ open: false, customerId: null })}
        onSaved={load}
        onError={fail}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar cliente?"
        message={toDelete ? `Se eliminará a ${toDelete.name || 'este cliente'} y sus cotizaciones. Sus pedidos se conservan, pero quedarán sin cliente asignado.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
