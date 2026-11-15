import { useEffect, useMemo, useRef } from 'react'
import { formatPrice } from '../catalog'
import { useSettings } from '../settings'
import { useAuth } from '../admin/AuthContext'
import { useAccount } from './AccountModal'
import CouponBox from './CouponBox'
import { PriceTag, display } from './dv-ui'
import { couponAmount, effectivePrice } from '../pricing'

// Bolsa: solo los productos, el cupón y el total. El pago se hace aparte,
// en /checkout, y solo con la sesión iniciada para guardar los datos del cliente.
export default function CartDrawer({ items, discounts, subtotal, coupon, onCoupon, onClose, onRemove, onQty, onCheckout }) {
  const { cfg } = useSettings()
  const { session } = useAuth()
  const { openAccount } = useAccount()
  const freeMin = Number(cfg.free_shipping_min) || 0

  const discount = useMemo(() => couponAmount(coupon, subtotal), [coupon, subtotal])
  const total = Math.max(0, subtotal - discount)
  const units = items.reduce((n, i) => n + i.qty, 0)
  const closeBtn = useRef(null)

  // al abrir, el foco entra en la bolsa; al cerrar, vuelve a donde estaba
  useEffect(() => {
    const before = document.activeElement
    closeBtn.current?.focus()
    return () => before?.focus?.()
  }, [])

  // Escape cierra la bolsa
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const step = 'w-10 h-10 flex items-center justify-center text-lg text-[#141414] hover:bg-[#F7F6F2] disabled:opacity-30'

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Tu bolsa">
      <div className="absolute inset-0 bg-[#141414]/45" onClick={onClose} />
      <div className="relative bg-white text-[#141414] w-full max-w-[440px] h-full shadow-2xl flex flex-col" data-lenis-prevent>
        <div className="px-6 h-20 border-b border-[#141414]/10 flex items-center justify-between flex-shrink-0">
          <h2 className="text-[2rem] leading-none" style={display}>
            Tu bolsa {units > 0 && <span className="ml-1 text-[15px] font-medium tracking-normal text-[#57534E]" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>({units})</span>}
          </h2>
          <button ref={closeBtn} onClick={onClose} aria-label="Cerrar la bolsa" className="w-11 h-11 -mr-2 flex items-center justify-center text-2xl leading-none text-[#57534E] hover:text-[#141414]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[16px] text-[#57534E]">Tu bolsa está vacía.</p>
              <button onClick={onClose} className="mt-6 min-h-12 px-6 border border-[#141414] text-[14px] font-semibold hover:bg-[#141414] hover:text-white transition-colors">Seguir viendo fragancias</button>
            </div>
          )}

          <ul className="divide-y divide-[#141414]/10">
            {items.map(({ product, qty }) => {
              const unit = effectivePrice(discounts, product)
              return (
                <li key={product.id} className="py-5 flex gap-4">
                  <div className="w-20 h-24 flex-shrink-0 bg-[#F7F6F2] flex items-center justify-center">
                    {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-contain p-2 mix-blend-multiply" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold leading-snug">{product.name}</p>
                        <p className="mt-0.5 text-[13px] text-[#57534E]">{product.volume}</p>
                      </div>
                      <p className="text-[15px] font-semibold tabular-nums whitespace-nowrap">{formatPrice(unit * qty)}</p>
                    </div>
                    <p className="mt-1 text-[13px] text-[#57534E]"><PriceTag price={unit} original={Number(product.price)} badge={false} priceClass="font-normal" /> c/u</p>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <div className="flex items-center border border-[#141414]/20" role="group" aria-label={`Cantidad de ${product.name}`}>
                        <button type="button" className={step} onClick={() => onQty(product.id, qty - 1)} disabled={qty <= 1} aria-label="Quitar una unidad">−</button>
                        <span className="w-9 text-center text-[15px] font-medium tabular-nums" aria-live="polite">{qty}</span>
                        <button type="button" className={step} onClick={() => onQty(product.id, qty + 1)} aria-label="Agregar una unidad">+</button>
                      </div>
                      <button onClick={() => onRemove(product.id)} className="text-[13px] text-[#57534E] underline underline-offset-4 hover:text-[#141414]">Quitar</button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {items.length > 0 && (
            <div className="py-5 border-t border-[#141414]/10">
              <CouponBox subtotal={subtotal} coupon={coupon} onChange={onCoupon} />
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-[#141414]/10 space-y-4 flex-shrink-0 bg-white">
            <div className="text-[15px] space-y-1.5 tabular-nums">
              <div className="flex justify-between text-[#57534E]"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {coupon && <div className="flex justify-between text-emerald-700"><span>Cupón {coupon.code}</span><span>−{formatPrice(discount)}</span></div>}
              <div className="flex justify-between font-semibold text-[18px] pt-1"><span>Total</span><span>{formatPrice(total)}</span></div>
              <p className="text-[13px] text-[#57534E]">El envío se calcula en el siguiente paso.</p>
            </div>

            {freeMin > 0 && (
              <div>
                <p className="text-[13px] text-[#57534E]">{total >= freeMin ? 'Tu pedido tiene envío gratis.' : `Te faltan ${formatPrice(freeMin - total)} para el envío gratis.`}</p>
                <div className="mt-2 h-1 bg-[#EDE8DF] overflow-hidden">
                  <div className="h-full bg-[#141414] transition-all duration-500" style={{ width: `${Math.min(100, (total / freeMin) * 100)}%` }} />
                </div>
              </div>
            )}

            <button onClick={onCheckout} className="block w-full min-h-14 bg-[#141414] text-white text-[15px] font-semibold hover:bg-[#2B2B2B] transition-colors">
              Continuar al pago →
            </button>
            {!session && (
              <p className="text-center text-[13px] text-[#57534E]">
                No necesitas cuenta para comprar.{' '}
                <button onClick={() => openAccount('login', { next: '/checkout' })} className="font-semibold text-[#141414] underline underline-offset-4">Ya tengo cuenta</button>
              </p>
            )}
            <p className="text-center text-[13px] text-[#57534E]">Coordinamos el pago y la entrega contigo por WhatsApp.</p>
            <button onClick={onClose} className="block w-full text-center text-[14px] font-semibold underline underline-offset-4 hover:text-[#57534E]">Seguir comprando</button>
          </div>
        )}
      </div>
    </div>
  )
}
