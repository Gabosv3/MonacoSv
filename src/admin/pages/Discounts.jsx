import { useEffect, useState } from 'react'
import { createDiscount, deleteDiscount, listDiscounts, updateDiscount } from '../api'

const EMPTY = { name: '', type: 'percent', value: '', scope: 'all', scope_value: '', active: true }

export default function Discounts() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    listDiscounts().then(setDiscounts).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createDiscount({ ...form, value: Number(form.value) || 0 })
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleActive = async (d) => {
    try {
      await updateDiscount(d.id, { active: !d.active })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('¿Eliminar este descuento?')) return
    try {
      await deleteDiscount(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Descuentos</h1>
        <button onClick={() => setShowForm((v) => !v)} className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg">
          + Nuevo descuento
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 p-5 mb-6 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="percent">% Porcentaje</option>
            <option value="fixed">$ Monto fijo</option>
          </select>
          <input required type="number" step="0.01" placeholder="Valor" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">Todo el catálogo</option>
            <option value="category">Una categoría</option>
            <option value="product">Un producto</option>
          </select>
          {form.scope !== 'all' && (
            <input placeholder={form.scope === 'category' ? 'Nombre de categoría' : 'ID de producto'} value={form.scope_value} onChange={(e) => setForm({ ...form, scope_value: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
          )}
          <div className="col-span-2 sm:col-span-5 flex gap-2">
            <button type="submit" className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg">Crear descuento</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg border">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Aplica a</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-400">Cargando…</td></tr>}
            {!loading && discounts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-400">Sin descuentos todavía.</td></tr>
            )}
            {discounts.map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <td className="px-4 py-3">{d.name}</td>
                <td className="px-4 py-3">{d.type === 'percent' ? `${d.value}%` : `$${d.value}`}</td>
                <td className="px-4 py-3 text-neutral-500">{d.scope === 'all' ? 'Todo' : `${d.scope}: ${d.scope_value}`}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${d.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {d.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => toggleActive(d)} className="text-neutral-600 hover:text-neutral-900">
                    {d.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => remove(d.id)} className="text-red-500 hover:text-red-700">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
