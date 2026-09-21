import { useEffect, useState } from 'react'
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '../api'

const EMPTY = { code: '', type: 'percent', value: '', max_uses: '', min_purchase: '', expires_at: '', active: true }

export default function Coupons() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    listCoupons().then(setCoupons).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createCoupon({
        ...form,
        code: form.code.trim().toUpperCase(),
        value: Number(form.value) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        min_purchase: Number(form.min_purchase) || 0,
        expires_at: form.expires_at || null,
      })
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleActive = async (c) => {
    try {
      await updateCoupon(c.id, { active: !c.active })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('¿Eliminar este cupón?')) return
    try {
      await deleteCoupon(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cupones</h1>
        <button onClick={() => setShowForm((v) => !v)} className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg">
          + Nuevo cupón
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 p-5 mb-6 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
          <input required placeholder="Código (ej. BIENVENIDO10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="percent">% Porcentaje</option>
            <option value="fixed">$ Monto fijo</option>
          </select>
          <input required type="number" step="0.01" placeholder="Valor" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" placeholder="Usos máx. (vacío = sin límite)" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Compra mínima" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <div className="col-span-2 sm:col-span-6 flex gap-2">
            <button type="submit" className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg">Crear cupón</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg border">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b">
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Usos</th>
              <th className="px-4 py-3">Vence</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Cargando…</td></tr>}
            {!loading && coupons.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Sin cupones todavía.</td></tr>
            )}
            {coupons.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3">{c.type === 'percent' ? `${c.value}%` : `$${c.value}`}</td>
                <td className="px-4 py-3 text-neutral-500">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                <td className="px-4 py-3 text-neutral-500">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-CO') : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {c.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => toggleActive(c)} className="text-neutral-600 hover:text-neutral-900">
                    {c.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => remove(c.id)} className="text-red-500 hover:text-red-700">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
