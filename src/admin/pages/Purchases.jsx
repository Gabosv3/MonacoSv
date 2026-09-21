import { useEffect, useState } from 'react'
import { createPurchase, listProducts, listPurchases } from '../api'
import { formatCOP } from '../../products'

export default function Purchases() {
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ product_id: '', quantity: '', unit_cost: '', supplier: '', notes: '' })

  const load = () => {
    setLoading(true)
    Promise.all([listPurchases(), listProducts()])
      .then(([p, prods]) => {
        setPurchases(p)
        setProducts(prods)
        if (!form.product_id && prods[0]) setForm((f) => ({ ...f, product_id: prods[0].id }))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id) return
    try {
      await createPurchase({
        product_id: form.product_id,
        quantity: Number(form.quantity) || 0,
        unit_cost: Number(form.unit_cost) || 0,
        supplier: form.supplier,
        notes: form.notes,
      })
      setForm({ ...form, quantity: '', unit_cost: '', supplier: '', notes: '' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Compras</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 p-5 mb-6 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
        <div className="col-span-2 sm:col-span-2">
          <label className="block text-xs text-neutral-500 mb-1">Producto</label>
          <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Cantidad</label>
          <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Costo unitario</label>
          <input required type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Proveedor</label>
          <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg h-[38px]">
          Registrar
        </button>
      </form>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Costo unitario</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Cargando…</td></tr>}
            {!loading && purchases.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Sin compras registradas.</td></tr>
            )}
            {purchases.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-neutral-500">{new Date(p.purchased_at).toLocaleDateString('es-CO')}</td>
                <td className="px-4 py-3">{p.products?.name ?? '—'}</td>
                <td className="px-4 py-3">{p.quantity}</td>
                <td className="px-4 py-3">{formatCOP(p.unit_cost)}</td>
                <td className="px-4 py-3 font-medium">{formatCOP(p.total)}</td>
                <td className="px-4 py-3 text-neutral-500">{p.supplier || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
