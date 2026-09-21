import { useEffect, useState } from 'react'
import { listProducts, listSales } from '../api'
import { formatCOP } from '../../products'

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listProducts(), listSales()])
      .then(([p, s]) => {
        setProducts(p)
        setSales(s)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-neutral-400 text-sm">Cargando…</p>

  const stockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)
  const lowStock = products.filter((p) => p.stock <= p.min_stock)
  const pending = sales.filter((s) => s.status === 'pendiente')
  const today = new Date().toDateString()
  const todaySales = sales.filter((s) => new Date(s.created_at).toDateString() === today && s.status !== 'cancelada')
  const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total), 0)

  const cards = [
    { label: 'Valor del inventario', value: formatCOP(stockValue) },
    { label: 'Ventas de hoy', value: `${todaySales.length} · ${formatCOP(todayTotal)}` },
    { label: 'Pedidos pendientes', value: pending.length },
    { label: 'Productos con poco stock', value: lowStock.length },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-5 mb-6">
          <p className="font-semibold text-red-600 mb-3">Stock bajo</p>
          <ul className="text-sm space-y-1">
            {lowStock.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-red-600 font-medium">{p.stock} unidades</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <p className="font-semibold text-amber-600 mb-3">Pedidos pendientes por confirmar</p>
          <ul className="text-sm space-y-1">
            {pending.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.customer_name || 'Cliente sin nombre'}</span>
                <span className="font-medium">{formatCOP(s.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
