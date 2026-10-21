import { useMemo } from 'react'
import { formatPrice } from '../catalog'
import { useSettings } from '../settings'
import { useAuth } from '../admin/AuthContext'
import { useAccount } from './AccountModal'
import CouponBox from './CouponBox'
import { PriceTag } from './ui'
import { couponAmount, effectivePrice } from '../pricing'

// Carrito: solo los productos, el cupón y el total. El pago se hace aparte,
// en /checkout, y solo con la sesión iniciada para guardar los datos del cliente.
export default function CartDrawer({ items, discounts, subtotal, coupon, onCoupon, onClose, onRemove, onQty, onCheckout }) {
  const { cfg } = useSettings()
  const { session } = useAuth()
  const { openAccount } = useAccount()
  const freeMin = Number(cfg.free_shipping_min) || 0

  const discount = useMemo(() => couponAmount(coupon, subtotal), [coupon, subtotal])
  const total = Math.max(0, subtotal - discount)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full shadow-xl flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Tu carrito</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-neutral-500 hover:text-neutral-900 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {items.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-500 text-sm">Tu carrito está vacío.</p>
              <button onClick={onClose} className="mt-4 text-sm font-semibold underline text-neutral-900">Seguir viendo fragancias</button>
            </div>
          )}

          {items.map(({ product, qty }) => (
            <div key={product.id} className="flex gap-3 items-center">
              <div className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: `${product.color}22` }}>
                {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-contain" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{product.name}{product.volume ? ` · ${product.volume}` : ''}</p>
                <p className="text-xs text-neutral-500"><PriceTag price={effectivePrice(discounts, product)} original={Number(product.price)} badge={false} /> c/u</p>
              </div>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => onQty(product.id, Math.max(1, Number(e.target.value)))}
                aria-label={`Cantidad de ${product.name}`}
                className="w-14 border border-neutral-300 rounded-md px-2 py-1 text-sm"
              />
              <button onClick={() => onRemove(product.id)} className="text-neutral-400 hover:text-red-500 text-sm">Quitar</button>
            </div>
          ))}

          {items.length > 0 && (
            <div className="pt-3 border-t border-neutral-100">
              <CouponBox subtotal={subtotal} coupon={coupon} onChange={onCoupon} />
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-neutral-200 space-y-3">
            <div className="text-sm space-y-1">
              <div className="flex justify-between text-neutral-500"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {coupon && <div className="flex justify-between text-green-600"><span>Cupón {coupon.code}</span><span>-{formatPrice(discount)}</span></div>}
              <div className="flex justify-between font-semibold text-base pt-1"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>

            {freeMin > 0 && (
              <div>
                <p className="text-xs text-neutral-600">{total >= freeMin ? '🎉 ¡Tu pedido tiene envío gratis!' : `Te faltan ${formatPrice(freeMin - total)} para el envío gratis.`}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${Math.min(100, (total / freeMin) * 100)}%` }} />
                </div>
              </div>
            )}

            {session ? (
              <button onClick={onCheckout} className="block w-full py-3 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
                Continuar al pago
              </button>
            ) : (
              <>
                <p className="rounded-lg bg-neutral-100 px-3 py-2.5 text-xs text-neutral-600 leading-relaxed">
                  Para hacer tu pedido necesitas una cuenta: así guardamos tus datos de entrega y puedes ver tus pedidos.
                </p>
                <button onClick={() => openAccount('login', { next: '/checkout' })} className="block w-full py-3 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition-colors">
                  Ingresar para continuar
                </button>
                <button onClick={() => openAccount('register', { next: '/checkout' })} className="block w-full py-2.5 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                  Crear mi cuenta
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
