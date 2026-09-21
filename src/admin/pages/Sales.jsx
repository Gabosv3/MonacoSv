import { Fragment, useEffect, useState } from 'react'
import { listSales, updateSaleStatus } from '../api'
import { formatCOP } from '../../products'

const STATUS_STYLE = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
}

export default function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)

  const load = () => {
    setLoading(true)
    listSales().then(setSales).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const changeStatus = async (id, status) => {
    try {
      await updateSaleStatus(id, status)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ventas</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Cargando…</td></tr>}
            {!loading && sales.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">Sin ventas todavía.</td></tr>
            )}
            {sales.map((s) => (
              <Fragment key={s.id}>
                <tr className="border-b last:border-0 cursor-pointer hover:bg-neutral-50" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                  <td className="px-4 py-3 text-neutral-500">{new Date(s.created_at).toLocaleString('es-CO')}</td>
                  <td className="px-4 py-3">{s.customer_name || '—'}{s.customer_phone ? ` · ${s.customer_phone}` : ''}</td>
                  <td className="px-4 py-3 text-neutral-500 capitalize">{s.source}</td>
                  <td className="px-4 py-3 font-medium">{formatCOP(s.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {s.status !== 'confirmada' && (
                      <button onClick={() => changeStatus(s.id, 'confirmada')} className="text-green-600 hover:text-green-800">Confirmar</button>
                    )}
                    {s.status !== 'cancelada' && (
                      <button onClick={() => changeStatus(s.id, 'cancelada')} className="text-red-500 hover:text-red-700">Cancelar</button>
                    )}
                  </td>
                </tr>
                {openId === s.id && (
                  <tr className="bg-neutral-50 border-b">
                    <td colSpan={6} className="px-4 py-3">
                      <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2">Productos</p>
                      <ul className="text-sm space-y-1">
                        {s.sale_items?.map((item) => (
                          <li key={item.id} className="flex justify-between max-w-md">
                            <span>{item.product_name} × {item.quantity}</span>
                            <span>{formatCOP(item.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                      {s.coupon_code && <p className="text-xs text-neutral-500 mt-2">Cupón aplicado: {s.coupon_code} (−{formatCOP(s.discount_total)})</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
