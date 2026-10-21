import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProducts, listSales } from '../api'
import { formatPrice } from '../../catalog'
import { Icon, ICONS, INK, AMBER, mono } from '../../components/ui'

const DAYS = 14
const STATUS = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
  confirmada: { label: 'Confirmada', cls: 'bg-emerald-100 text-emerald-800' },
  cancelada: { label: 'Cancelada', cls: 'bg-neutral-200 text-neutral-600' },
}

const dayKey = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
}

function timeAgo(date) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(date)) / 60000))
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

function Card({ title, action, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400" style={mono}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Kpi({ icon, label, value, hint, tone = INK }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400" style={mono}>{label}</p>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tone}14`, color: tone }}>
          <Icon d={icon} size={18} />
        </span>
      </div>
      <p className="mt-3 text-2xl sm:text-3xl font-black tracking-tight" style={{ color: INK }}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function SalesChart({ data }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-2 h-44">
        {data.map((d) => (
          <div key={d.key} className="group relative flex-1 h-full flex items-end">
            <div
              className="w-full rounded-t-md transition-opacity group-hover:opacity-80"
              style={{
                height: `${Math.max((d.total / max) * 100, d.total ? 4 : 1.5)}%`,
                backgroundColor: d.isToday ? AMBER : d.total ? INK : '#e5e7eb',
              }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] text-white" style={{ backgroundColor: INK }}>
              <strong>{formatPrice(d.total)}</strong> · {d.count} {d.count === 1 ? 'pedido' : 'pedidos'}
              <br />
              <span className="opacity-60">{d.full}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2 text-[10px] text-slate-400" style={mono}>
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center">{i % 2 === (DAYS % 2 ? 0 : 1) || data.length < 8 ? d.label : ''}</span>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listProducts(), listSales()])
      .then(([p, s]) => {
        setProducts(p)
        setSales(s)
      })
      .catch(() => setError('No se pudieron cargar los datos. Revisa tu conexión e inténtalo de nuevo.'))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const valid = sales.filter((s) => s.status !== 'cancelada')
    const now = new Date()
    const todayKey = dayKey(now)

    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - (DAYS - 1 - i))
      return {
        key: dayKey(d),
        label: d.toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', ''),
        full: d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }),
        isToday: dayKey(d) === todayKey,
        total: 0,
        count: 0,
      }
    })
    const byKey = Object.fromEntries(days.map((d) => [d.key, d]))
    valid.forEach((s) => {
      const d = byKey[dayKey(s.created_at)]
      if (d) {
        d.total += Number(s.total)
        d.count += 1
      }
    })

    const today = byKey[todayKey]
    const monthSales = valid.filter((s) => {
      const d = new Date(s.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const monthTotal = monthSales.reduce((sum, s) => sum + Number(s.total), 0)
    const periodTotal = days.reduce((sum, d) => sum + d.total, 0)

    const since = new Date(now)
    since.setDate(now.getDate() - 30)
    const tally = new Map()
    valid
      .filter((s) => new Date(s.created_at) >= since)
      .forEach((s) =>
        (s.sale_items ?? []).forEach((it) => {
          const cur = tally.get(it.product_name) ?? { name: it.product_name, qty: 0, revenue: 0 }
          cur.qty += it.quantity
          cur.revenue += Number(it.subtotal)
          tally.set(it.product_name, cur)
        })
      )
    const top = [...tally.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)

    const active = products.filter((p) => p.active)
    return {
      days,
      today,
      monthTotal,
      monthCount: monthSales.length,
      periodTotal,
      top,
      stockValue: products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0),
      stockCost: products.reduce((sum, p) => sum + Number(p.cost) * p.stock, 0),
      lowStock: active.filter((p) => p.stock <= p.min_stock).sort((a, b) => a.stock - b.stock),
      pending: sales.filter((s) => s.status === 'pendiente'),
      recent: sales.slice(0, 6),
    }
  }, [products, sales])

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-white border border-neutral-200 animate-pulse" />)}
      </div>
    )
  }

  if (error) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
  }

  const maxTop = Math.max(...stats.top.map((t) => t.qty), 1)

  return (
    <div className="space-y-6">
      {/* indicadores */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={ICONS.wallet} label="Ventas de hoy" value={formatPrice(stats.today.total)} hint={`${stats.today.count} ${stats.today.count === 1 ? 'pedido' : 'pedidos'}`} tone={AMBER} />
        <Kpi icon={ICONS.trend} label="Ventas del mes" value={formatPrice(stats.monthTotal)} hint={`${stats.monthCount} ${stats.monthCount === 1 ? 'pedido' : 'pedidos'}`} tone="#16a34a" />
        <Kpi icon={ICONS.receipt} label="Pendientes" value={stats.pending.length} hint={stats.pending.length ? 'Por confirmar' : 'Todo al día'} tone="#d97706" />
        <Kpi icon={ICONS.alert} label="Stock bajo" value={stats.lowStock.length} hint={stats.lowStock.length ? 'Productos por reponer' : 'Inventario sano'} tone={stats.lowStock.length ? '#dc2626' : '#64748b'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        <Card title={`Ventas · últimos ${DAYS} días`} action={<strong className="text-sm" style={{ color: INK }}>{formatPrice(stats.periodTotal)}</strong>}>
          <SalesChart data={stats.days} />
        </Card>

        <Card title="Más vendidos · 30 días">
          {stats.top.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Aún no hay ventas en este periodo.</p>
          ) : (
            <ol className="space-y-4">
              {stats.top.map((t, i) => (
                <li key={t.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold truncate" style={{ color: INK }}><span className="text-slate-400 mr-2" style={mono}>{i + 1}</span>{t.name}</span>
                    <span className="text-slate-500 flex-shrink-0">{t.qty} {t.qty === 1 ? 'unidad' : 'unidades'}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
                    <div className="h-full rounded-full" style={{ width: `${(t.qty / maxTop) * 100}%`, backgroundColor: i === 0 ? AMBER : INK }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Pedidos pendientes" action={<Link to="/admin/ventas" className="text-xs font-semibold underline text-slate-500 hover:text-slate-900">Ver todos</Link>}>
          {stats.pending.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No hay pedidos por confirmar. ✓</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.pending.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: INK }}>{s.customer_name || 'Cliente sin nombre'}</p>
                    <p className="text-xs text-slate-500">{timeAgo(s.created_at)}{s.customer_phone ? ` · ${s.customer_phone}` : ''}</p>
                  </div>
                  <span className="font-bold flex-shrink-0" style={mono}>{formatPrice(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Stock bajo" action={<Link to="/admin/productos" className="text-xs font-semibold underline text-slate-500 hover:text-slate-900">Productos</Link>}>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Todo el inventario está por encima del mínimo. ✓</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate"><strong style={{ color: INK }}>{p.name}</strong> <span className="text-slate-400">{p.volume}</span></span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${p.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                    {p.stock <= 0 ? 'Agotado' : `${p.stock} en stock`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card title="Últimos pedidos" action={<Link to="/admin/ventas" className="text-xs font-semibold underline text-slate-500 hover:text-slate-900">Ver todos</Link>}>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Todavía no hay pedidos.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[480px]">
                <tbody className="divide-y divide-neutral-100">
                  {stats.recent.map((s) => {
                    const st = STATUS[s.status] ?? STATUS.pendiente
                    return (
                      <tr key={s.id}>
                        <td className="py-3 px-1">
                          <p className="font-semibold" style={{ color: INK }}>{s.customer_name || 'Cliente sin nombre'}</p>
                          <p className="text-xs text-slate-500">{timeAgo(s.created_at)} · {s.source === 'tienda' ? 'Tienda' : 'Admin'}</p>
                        </td>
                        <td className="py-3 px-1"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span></td>
                        <td className="py-3 px-1 text-right font-bold" style={mono}>{formatPrice(s.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Inventario">
          <p className="text-3xl font-black tracking-tight" style={{ color: INK }}>{formatPrice(stats.stockValue)}</p>
          <p className="mt-1 text-xs text-slate-500">Valor a precio de venta</p>
          <div className="mt-5 pt-5 border-t border-neutral-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">A costo</span>
            <strong style={mono}>{formatPrice(stats.stockCost)}</strong>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">Margen potencial</span>
            <strong style={{ ...mono, color: '#16a34a' }}>{formatPrice(stats.stockValue - stats.stockCost)}</strong>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">Productos activos</span>
            <strong>{products.filter((p) => p.active).length}</strong>
          </div>
        </Card>
      </div>
    </div>
  )
}

