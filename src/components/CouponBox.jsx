import { useState } from 'react'
import { fetchCouponByCode } from '../admin/api'
import { formatPrice } from '../catalog'

const input = 'flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm uppercase'

// Campo de cupón: valida el código y guarda el cupón aplicado en el estado de la tienda.
export default function CouponBox({ subtotal, coupon, onChange }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const apply = async () => {
    const value = code.trim()
    if (!value) return
    setChecking(true)
    setError('')
    try {
      const found = await fetchCouponByCode(value)
      if (!found) setError('Cupón no válido.')
      else if (found.max_uses && found.used_count >= found.max_uses) setError('Este cupón ya alcanzó su límite de usos.')
      else if (found.expires_at && new Date(found.expires_at) < new Date()) setError('Este cupón ya venció.')
      else if (subtotal < Number(found.min_purchase || 0)) setError(`Compra mínima de ${formatPrice(found.min_purchase)} para este cupón.`)
      else onChange(found)
    } catch {
      setError('No se pudo validar el cupón.')
    } finally {
      setChecking(false)
    }
  }

  if (coupon) {
    return (
      <div className="flex items-center justify-between bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">
        <span>Cupón <strong>{coupon.code}</strong> aplicado</span>
        <button onClick={() => { onChange(null); setCode('') }} className="text-green-700/70 hover:text-green-900">Quitar</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <input type="text" placeholder="Código de cupón" value={code} onChange={(e) => setCode(e.target.value)} className={input} />
        <button onClick={apply} disabled={checking || !code.trim()} className="text-sm px-3 py-2 rounded-md border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
          {checking ? '...' : 'Aplicar'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
