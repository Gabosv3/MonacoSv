import { useEffect, useState } from 'react'
import { createProduct, deleteProduct, listProducts, updateProduct } from '../api'
import { formatCOP } from '../../products'

const EMPTY = {
  name: '',
  category: '',
  description: '',
  price: '',
  cost: '',
  volume: '',
  color: '#141414',
  stock: '',
  min_stock: '5',
  active: true,
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    listProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      cost: p.cost,
      volume: p.volume,
      color: p.color,
      stock: p.stock,
      min_stock: p.min_stock,
      active: p.active,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0,
    }
    try {
      if (editingId) {
        await updateProduct(editingId, payload)
      } else {
        await createProduct(payload)
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return
    try {
      await deleteProduct(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button
          onClick={openCreate}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          + Nuevo producto
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 p-5 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2 sm:col-span-1" />
          <input placeholder="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Volumen (ej. 50 ml)" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input required type="number" step="0.01" placeholder="Precio de venta" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Costo" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input required type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" placeholder="Stock mínimo" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-9 h-9 border rounded" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Activo (visible en la tienda)
          </label>
          <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2 sm:col-span-3" rows={2} />
          <div className="col-span-2 sm:col-span-3 flex gap-2">
            <button type="submit" className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg">
              {editingId ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg border">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Cargando…</td></tr>
            )}
            {!loading && products.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Sin productos todavía.</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  {p.name}
                </td>
                <td className="px-4 py-3 text-neutral-500">{p.category}</td>
                <td className="px-4 py-3">{formatCOP(p.price)}</td>
                <td className="px-4 py-3">
                  <span className={p.stock <= p.min_stock ? 'text-red-600 font-semibold' : ''}>{p.stock}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {p.active ? 'Activo' : 'Oculto'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => openEdit(p)} className="text-neutral-600 hover:text-neutral-900">Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
