import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DEPARTMENTS, formatPrice } from '../catalog'
import { useSettings } from '../settings'
import { useAuth } from '../admin/AuthContext'
import { createSale, listShippingOptions, placeOrder, requestQuote, saveMyProfile } from '../admin/api'
import { useAccount } from './AccountModal'
import CouponBox from './CouponBox'
import { couponAmount, effectivePrice } from '../pricing'
import { buildOrderPdf, pdfFilename } from '../lib/orderPdf'
import { downloadBlob } from '../lib/sendPdf'
import { Icon, ICONS, INK, display, mono, PriceTag } from './dv-ui'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const field = 'w-full h-12 rounded-none border border-[#141414]/25 bg-white px-4 text-[15px] text-[#141414] outline-none transition-colors placeholder:text-[#78716C] focus:border-[#141414] focus:ring-4 focus:ring-slate-900/5 aria-[invalid=true]:border-red-600'
const label = 'block mb-1.5 text-[13px] font-semibold text-[#141414]'
const rpcMissing = (err) => /could not find the function|schema cache/i.test(err?.message ?? '')

// Borrador de los datos del pago: al ingresar con Google el navegador sale de la tienda y vuelve,
// y sin esto el cliente tendría que escribir todo otra vez. Solo en esta pestaña; se borra al
// registrar el pedido.
const DRAFT_KEY = 'duumvir_checkout_draft'
const readDraft = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY))
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}
const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* sin almacenamiento */
  }
}
const wrap = 'max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 pt-8 pb-20 lg:pt-12 lg:pb-24'

// Pago: con cuenta o como invitado. Con cuenta, los datos se rellenan con los guardados
// y, si el cliente quiere, se guardan para la próxima vez. Sin cuenta se piden solo los
// datos de contacto y entrega; el servidor acepta ese pedido cuando está instalado
// supabase/guest_checkout.sql (si no, se ofrece enviarlo por WhatsApp).
export default function CheckoutPage({ items, discounts, subtotal, coupon, onCoupon, onOrderPlaced }) {
  const { cfg, wa } = useSettings()
  const { session, loading, customer, reloadCustomer } = useAuth()
  const { openAccount } = useAccount()
  const freeMin = Number(cfg.free_shipping_min) || 0

  const [draft] = useState(readDraft)
  const [name, setName] = useState(draft.name ?? '')
  const [phone, setPhone] = useState(draft.phone ?? '')
  const [delivery, setDelivery] = useState(draft.delivery === 'retiro' ? 'retiro' : 'envio')
  const [department, setDepartment] = useState(draft.department ?? '')
  const [municipality, setMunicipality] = useState(draft.municipality ?? '')
  const [address, setAddress] = useState(draft.address ?? '')
  const [notes, setNotes] = useState(draft.notes ?? '')
  const [saveData, setSaveData] = useState(true)
  const [carriers, setCarriers] = useState([]) // paqueteras con su precio de envío
  const [carrierId, setCarrierId] = useState(draft.carrierId ?? '')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(null) // 'order' | 'orderWa' | 'quote' | 'draft'
  const [result, setResult] = useState(null)
  const [sendInfo, setSendInfo] = useState('')
  const [failedDraft, setFailedDraft] = useState(false)
  const [invalid, setInvalid] = useState('') // id del campo que falta completar
  // identificador de este envío: si el mismo pedido llega dos veces, el servidor no lo duplica
  const requestId = useRef(crypto.randomUUID?.() ?? null)
  const sending = useRef(false) // candado inmediato contra el doble clic (el estado tarda un render)

  useEffect(() => {
    listShippingOptions().then(setCarriers).catch(() => setCarriers([]))
  }, [])

  // el borrador se guarda mientras se llena el formulario (no con el pedido ya registrado)
  useEffect(() => {
    if (result) return
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ name, phone, delivery, department, municipality, address, notes, carrierId }))
    } catch {
      /* sin almacenamiento: no hay borrador */
    }
  }, [name, phone, delivery, department, municipality, address, notes, carrierId, result])

  // datos guardados en la cuenta
  useEffect(() => {
    if (!customer) return
    setName((v) => v || customer.name || '')
    setPhone((v) => v || customer.phone || '')
    setDepartment((v) => v || customer.department || '')
    setMunicipality((v) => v || customer.municipality || '')
    setAddress((v) => v || customer.address || '')
  }, [customer])

  const discount = useMemo(() => couponAmount(coupon, subtotal), [coupon, subtotal])
  const total = Math.max(0, subtotal - discount)
  const carrier = carriers.find((c) => c.id === carrierId)
  // envío gratis desde el mínimo; si no, el precio de la paquetera elegida
  const shipping = delivery === 'envio' && carrier ? (freeMin > 0 && total >= freeMin ? 0 : Number(carrier.price) || 0) : 0
  const grandTotal = total + shipping
  const store = { name: cfg.store_name, logo: cfg.logo_url, tagline: cfg.tagline, city: cfg.city, whatsapp: cfg.whatsapp, email: cfg.contact_email }

  const customerData = () => ({
    name: name.trim(),
    phone: phone.trim(),
    delivery,
    department: delivery === 'envio' ? department : '',
    municipality: delivery === 'envio' ? municipality.trim() : '',
    address: delivery === 'envio' ? address.trim() : '',
    notes: notes.trim(),
    carrier_id: delivery === 'envio' ? carrierId : '',
  })

  const localData = (kind, number) => ({
    kind,
    number,
    createdAt: new Date().toISOString(),
    customer: customerData(),
    items: items.map((i) => ({
      name: i.product.volume ? `${i.product.name} (${i.product.volume})` : i.product.name,
      qty: i.qty,
      unit: effectivePrice(discounts, i.product),
    })),
    subtotal,
    discount,
    couponCode: coupon?.code ?? null,
    total,
    shipping: delivery === 'envio' && carrier ? shipping : undefined,
    carrier: delivery === 'envio' ? carrier?.name : undefined,
  })

  // Mensaje de WhatsApp (texto). Los datos ya quedan guardados en el sistema,
  // así que no se adjunta ningún archivo.
  const messageText = (data) => {
    const money = (n) => formatPrice(n)
    const isQuote = data.kind === 'cotizacion'
    const lines = data.items.map((i, n) => `${n + 1}. *${i.name}* — Cant: ${i.qty} — ${money(i.unit)} c/u — Subtotal: ${money(i.unit * i.qty)}`)
    const c = data.customer
    const head = isQuote
      ? `¡Hola! Me gustaría cotizar los siguientes productos${data.number ? ` (COT-${data.number})` : ''}:`
      : data.number
        ? `¡Hola! Acabo de hacer mi pedido #${data.number}:`
        : '¡Hola! Quiero hacer el siguiente pedido:'
    const delivery = isQuote
      ? []
      : [c.delivery === 'retiro' ? 'Entrega: retiro en tienda' : `Entrega: ${[c.municipality, c.department].filter(Boolean).join(', ')}${c.address ? ` — ${c.address}` : ''}`]
    return [
      head,
      '',
      ...lines,
      '',
      ...(data.discount > 0 ? [`Cupón ${data.couponCode ?? ''}: -${money(data.discount)}`] : []),
      ...(data.shipping != null ? [`Envío${data.carrier ? ` (${data.carrier})` : ''}: ${data.shipping > 0 ? money(data.shipping) : 'Gratis'}`] : []),
      `*Total: ${money(data.total + (data.shipping || 0))}*`,
      ...(delivery.length ? ['', ...delivery] : []),
      '',
      isQuote ? '¿Están disponibles?' : '¿Me confirman el pago y la entrega?',
      ...(c.name ? ['', `Soy ${c.name}${c.phone ? ` · ${c.phone}` : ''}.`] : []),
    ].join('\n')
  }

  // Abre WhatsApp directo con el mensaje. `win` es la pestaña abierta dentro del clic
  // (así el navegador no la bloquea aunque haya pasado tiempo guardando el pedido).
  const openWhatsApp = (data, win) => {
    const url = wa(messageText(data))
    if (win) win.location.href = url
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  const fail = (id, message) => {
    setFormError(message)
    setInvalid(id)
    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      el?.focus({ preventScroll: true })
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return false
  }
  const clearInvalid = (id) => {
    if (invalid !== id) return
    setInvalid('')
    setFormError('')
  }
  const fieldError = (id) => invalid === id && <p id={`${id}-error`} className="mt-1.5 text-[13px] text-red-700">{formError}</p>

  const validate = () => {
    if (!name.trim()) return fail('co-name', 'Escribe tu nombre para registrar el pedido.')
    if (!phone.trim()) return fail('co-phone', 'Escribe tu teléfono para coordinar el pedido por WhatsApp.')
    if (!session && phone.replace(/\D/g, '').length < 8) return fail('co-phone', 'Escribe un teléfono válido, de al menos 8 dígitos.')
    if (delivery === 'envio' && !department) return fail('co-dep', 'Elige tu departamento para coordinar el envío.')
    if (delivery === 'envio' && !municipality.trim()) return fail('co-mun', 'Escribe tu municipio para coordinar el envío.')
    if (delivery === 'envio' && carriers.length > 0 && !carrierId) return fail('co-carrier', 'Elige con quién quieres recibir tu envío.')
    setFormError('')
    setInvalid('')
    return true
  }

  const rememberData = async () => {
    if (!saveData || !session) return
    try {
      await saveMyProfile({ name: name.trim(), phone: phone.trim(), department: delivery === 'envio' ? department : customer?.department ?? '', municipality: delivery === 'envio' ? municipality.trim() : customer?.municipality ?? '', address: delivery === 'envio' ? address.trim() : customer?.address ?? '' })
      await reloadCustomer()
    } catch {
      /* si el teléfono ya es de otro cliente, el pedido igual queda registrado */
    }
  }

  const confirmOrder = async (thenWhatsApp) => {
    if (!items.length || busy || sending.current || !validate()) return
    sending.current = true
    const win = thenWhatsApp ? window.open('', '_blank') : null
    setBusy(thenWhatsApp ? 'orderWa' : 'order')
    setFailedDraft(false)
    setSendInfo('')
    try {
      let data
      try {
        const res = await placeOrder({
          customer: { ...customerData(), delivery_method: delivery, request_id: requestId.current },
          items: items.map((i) => ({ product_id: i.product.id, quantity: i.qty })),
          coupon: coupon?.code ?? null,
        })
        data = {
          kind: 'pedido',
          number: res.order_number,
          createdAt: res.created_at,
          customer: customerData(),
          items: res.items.map((i) => ({ name: i.product_name, qty: i.quantity, unit: Number(i.unit_price) })),
          subtotal: Number(res.subtotal),
          discount: Number(res.discount_total),
          couponCode: res.coupon_code,
          total: Number(res.total),
          shipping: delivery === 'envio' ? Number(res.shipping_total) || 0 : undefined,
          carrier: delivery === 'envio' ? res.carrier || undefined : undefined,
        }
      } catch (err) {
        // (solo con sesión: sin cuenta no se registra nada con precios enviados por el navegador)
        if (!rpcMissing(err) || !session) throw err
        // la función del servidor aún no está instalada: se usa el registro de siempre
        const sale = await createSale({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          delivery_method: delivery,
          department: delivery === 'envio' ? department : '',
          municipality: delivery === 'envio' ? municipality.trim() : '',
          address: delivery === 'envio' ? address.trim() : '',
          notes: notes.trim(),
          subtotal,
          discount_total: discount,
          coupon_code: coupon?.code ?? null,
          total,
          status: 'pendiente',
          source: 'tienda',
          items: items.map((i) => ({
            product_id: UUID_RE.test(String(i.product.id)) ? i.product.id : null,
            product_name: i.product.volume ? `${i.product.name} (${i.product.volume})` : i.product.name,
            quantity: i.qty,
            unit_price: effectivePrice(discounts, i.product),
          })),
        })
        data = localData('pedido', sale?.order_number ?? null)
      }
      // guardar los datos en la cuenta no retrasa la confirmación: ya tiene su propio manejo de errores
      void rememberData()
      requestId.current = crypto.randomUUID?.() ?? null // el siguiente pedido es otro envío
      clearDraft() // el pedido ya quedó registrado: no se conservan sus datos de entrega
      setResult({ data })
      onOrderPlaced?.()
      window.scrollTo({ top: 0 })
      if (thenWhatsApp) openWhatsApp(data, win)
    } catch (err) {
      if (thenWhatsApp) {
        // el pedido no quedó en el sistema, pero el mensaje se envía igual y nosotros lo registramos
        await sendDraft(win, true)
        return
      }
      setFormError(
        !session && /inicia sesi[oó]n|permission denied|not authorized|jwt|could not find the function|schema cache/i.test(err.message ?? '')
          ? 'Todavía no podemos registrar en el sistema los pedidos sin cuenta. Envíalo por WhatsApp y lo registramos nosotros, o ingresa con tu cuenta.'
          : /row-level security|violates|permission denied/i.test(err.message)
            ? 'No pudimos registrar tu pedido en el sistema. Puedes enviarlo igual por WhatsApp.'
            : err.message || 'No pudimos registrar tu pedido.'
      )
      setInvalid('')
      setFailedDraft(true)
    } finally {
      sending.current = false
      setBusy(null)
    }
  }

  const quote = async () => {
    if (!items.length || busy) return
    if (!name.trim() && !phone.trim()) {
      setFormError('Escribe tu nombre o tu teléfono para registrar la cotización.')
      return
    }
    setFormError('')
    setBusy('quote')
    setSendInfo('')
    const win = window.open('', '_blank')
    let number = null
    try {
      number = await requestQuote({
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        department: delivery === 'envio' ? department : '',
        municipality: delivery === 'envio' ? municipality.trim() : '',
        items: items.map((i) => ({ product_id: i.product.id, product_name: i.product.name, quantity: i.qty, unit_price: effectivePrice(discounts, i.product) })),
      })
    } catch (err) {
      console.warn('No se pudo registrar la cotización:', err.message)
    }
    try {
      const data = localData('cotizacion', number)
      setResult({ data, keepCart: true })
      window.scrollTo({ top: 0 })
      openWhatsApp(data, win)
    } catch (err) {
      win?.close()
      setFormError(err.message || 'No se pudo abrir WhatsApp.')
    } finally {
      setBusy(null)
    }
  }

  const sendDraft = async (win, force) => {
    if (!items.length || (busy && !force)) {
      win?.close()
      return
    }
    setBusy('draft')
    try {
      const data = localData('pedido', null)
      setResult({ data, draft: true, keepCart: true })
      window.scrollTo({ top: 0 })
      openWhatsApp(data, win)
    } catch (err) {
      win?.close()
      setFormError(err.message || 'No se pudo abrir WhatsApp.')
    } finally {
      setBusy(null)
    }
  }

  // ---------- sin sesión ----------
  if (loading) return <div className={wrap}><div className="h-72 rounded-none bg-white border border-[#141414]/12 animate-pulse" /></div>

  // ---------- pedido registrado ----------
  if (result) {
    const { data, draft, keepCart } = result
    const isQuote = data.kind === 'cotizacion'
    return (
      <div className={wrap}>
        <div className="max-w-xl mx-auto rounded-none border border-[#141414]/12 bg-white p-6 sm:p-10">
          <div className="text-center">
            <span className="mx-auto w-14 h-14 rounded-full bg-[#141414] text-white flex items-center justify-center text-2xl" aria-hidden>✓</span>
            <h1 className="mt-5 text-[2rem] leading-tight" style={{ ...display, color: INK }} role="status">
              {draft ? 'Pedido enviado por WhatsApp' : isQuote ? `Cotización${data.number ? ` COT-${data.number}` : ''} registrada` : `¡Pedido${data.number ? ` #${data.number}` : ''} recibido!`}
            </h1>
            <p className="mt-2 text-sm text-[#57534E]">
              {draft ? 'Aún no quedó en el sistema, pero te abrimos WhatsApp con tu pedido para que lo atendamos y lo registremos nosotros.' : isQuote ? 'Se abrió WhatsApp con tu cotización. Te respondemos con la disponibilidad.' : 'Te escribiremos por WhatsApp para confirmar el pago y la entrega.'}
            </p>
          </div>

          <div className="mt-7 rounded-none border border-[#141414]/12 divide-y divide-[#141414]/12 text-sm">
            {data.items.map((i, idx) => (
              <div key={idx} className="flex justify-between gap-3 px-4 py-3">
                <span className="text-[#141414]">{i.name} <span className="text-[#78716C]">× {i.qty}</span></span>
                <span className="font-semibold">{formatPrice(i.unit * i.qty)}</span>
              </div>
            ))}
            {data.discount > 0 && <div className="flex justify-between px-4 py-3 text-green-700"><span>Cupón {data.couponCode}</span><span>-{formatPrice(data.discount)}</span></div>}
            {data.shipping != null && <div className="flex justify-between px-4 py-3"><span className="text-[#141414]">Envío{data.carrier ? ` · ${data.carrier}` : ''}</span><span className="font-semibold">{data.shipping > 0 ? formatPrice(data.shipping) : 'Gratis'}</span></div>}
            <div className="flex justify-between px-4 py-3.5 font-bold text-base"><span>Total</span><span>{formatPrice(data.total + (data.shipping || 0))}</span></div>
          </div>
          {!isQuote && (
            <p className="mt-3 text-xs text-[#57534E]">
              {data.customer.delivery === 'retiro' ? 'Retiro en tienda' : `Envío a ${[data.customer.municipality, data.customer.department].filter(Boolean).join(', ')}`} · {data.customer.name} · {data.customer.phone}
            </p>
          )}

          <div className="mt-7 space-y-3">
            <button onClick={() => openWhatsApp(data)} className="w-full h-12 flex items-center justify-center gap-2 rounded-none bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
              <Icon d={ICONS.chat} size={17} /> Abrir WhatsApp
            </button>
            <button onClick={async () => downloadBlob(await buildOrderPdf(data, store), pdfFilename(data))} className="w-full h-11 rounded-none border border-[#141414]/25 text-sm font-medium text-[#141414] hover:bg-[#F7F6F2] transition-colors">Descargar PDF</button>
            {sendInfo && <p role="status" className="text-xs text-green-700 text-center leading-relaxed">{sendInfo}</p>}
          </div>

          <div className="mt-8 pt-6 border-t border-[#141414]/12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {keepCart && <button onClick={() => setResult(null)} className="font-semibold underline text-[#141414]">Volver al pago</button>}
            <Link to="/fragancias" className="font-semibold underline text-[#141414]">Seguir comprando</Link>
            {!isQuote && !draft && session && <Link to="/cuenta" className="font-semibold underline text-[#141414]">Ver mis pedidos</Link>}
          </div>
        </div>
      </div>
    )
  }

  // ---------- carrito vacío ----------
  if (items.length === 0) {
    return (
      <div className={wrap}>
        <div className="rounded-none border border-[#141414]/12 bg-white px-6 py-16 text-center">
          <h1 className="text-[2rem]" style={{ ...display, color: INK }}>Tu bolsa está vacía</h1>
          <p className="mt-3 text-[#57534E]">Agrega tus fragancias favoritas para continuar con el pago.</p>
          <Link to="/fragancias" className="inline-block mt-7 px-7 h-12 leading-[48px] text-white text-[14px] font-semibold hover:bg-[#2B2B2B] transition-colors" style={{ backgroundColor: INK }}>Ver catálogo</Link>
        </div>
      </div>
    )
  }

  // ---------- formulario de pago ----------
  return (
    <div className={wrap}>
      <nav className="text-[13px] text-[#78716C]" aria-label="Ruta">
        <Link to="/fragancias" className="hover:text-[#141414]">← Seguir comprando</Link>
      </nav>
      <h1 className="mt-4 text-[clamp(2.25rem,4vw,3.25rem)] leading-none" style={{ ...display, color: INK }}>Finalizar pedido</h1>
      <p className="mt-3 text-[15px] text-[#57534E]">Registramos tu pedido y te escribimos por WhatsApp para coordinar el pago y la entrega.</p>
      {!session && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border border-[#141414]/12 bg-white px-5 py-4">
          <p className="text-[15px]"><strong className="font-semibold">Compras como invitado.</strong> <span className="text-[#57534E]">No necesitas crear una cuenta.</span></p>
          <button type="button" onClick={() => openAccount('login', { next: '/checkout' })} className="text-[14px] font-semibold underline underline-offset-4 hover:text-[#57534E]">Ya tengo cuenta: ingresar</button>
        </div>
      )}

      <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="space-y-6">
          <section className="rounded-none border border-[#141414]/12 bg-white p-5 sm:p-6">
            <h2 className="text-[17px] font-semibold" style={{ color: INK }}><span className="mr-2 text-[#78716C] tabular-nums">1</span>Tus datos</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="co-name">Nombre *</label>
                <input id="co-name" value={name} onChange={(e) => { setName(e.target.value); clearInvalid('co-name') }} autoComplete="name" required aria-invalid={invalid === 'co-name'} aria-describedby={invalid === 'co-name' ? 'co-name-error' : undefined} className={field} />
                {fieldError('co-name')}
              </div>
              <div>
                <label className={label} htmlFor="co-phone">Teléfono (WhatsApp) *</label>
                <input id="co-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); clearInvalid('co-phone') }} autoComplete="tel" placeholder="7000-0000" required aria-invalid={invalid === 'co-phone'} aria-describedby={invalid === 'co-phone' ? 'co-phone-error' : undefined} className={field} />
                {fieldError('co-phone')}
              </div>
              {session && (
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="co-email">Correo de tu cuenta</label>
                  <input id="co-email" value={session.user.email} readOnly className={`${field} bg-[#F7F6F2] text-[#57534E]`} />
                </div>
              )}
            </div>
          </section>

          <section className="rounded-none border border-[#141414]/12 bg-white p-5 sm:p-6">
            <h2 className="text-[17px] font-semibold" style={{ color: INK }}><span className="mr-2 text-[#78716C] tabular-nums">2</span>Entrega</h2>
            <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Tipo de entrega">
              {[['envio', 'Envío a domicilio'], ['retiro', 'Retiro en tienda']].map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setDelivery(key); setInvalid(''); setFormError('') }}
                  aria-pressed={delivery === key}
                  className="h-12 rounded-none border text-[14px] font-semibold transition-colors"
                  style={delivery === key ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: 'rgba(20,20,20,0.25)', color: INK }}
                >
                  {text}
                </button>
              ))}
            </div>
            {delivery === 'envio' ? (
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label} htmlFor="co-dep">Departamento *</label>
                  <select id="co-dep" value={department} onChange={(e) => { setDepartment(e.target.value); clearInvalid('co-dep') }} required aria-invalid={invalid === 'co-dep'} aria-describedby={invalid === 'co-dep' ? 'co-dep-error' : undefined} className={field}>
                    <option value="">Elige…</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {fieldError('co-dep')}
                </div>
                <div>
                  <label className={label} htmlFor="co-mun">Municipio *</label>
                  <input id="co-mun" value={municipality} onChange={(e) => { setMunicipality(e.target.value); clearInvalid('co-mun') }} required aria-invalid={invalid === 'co-mun'} aria-describedby={invalid === 'co-mun' ? 'co-mun-error' : undefined} className={field} />
                  {fieldError('co-mun')}
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="co-addr">Dirección o punto de referencia</label>
                  <input id="co-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Colonia, calle, casa…" className={field} />
                </div>
                {carriers.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className={label} id="co-carrier-label">¿Con quién quieres tu envío? *</span>
                    <div id="co-carrier" tabIndex={-1} className="grid gap-2 outline-none" role="radiogroup" aria-labelledby="co-carrier-label" aria-invalid={invalid === 'co-carrier'}>
                      {carriers.map((c) => {
                        const free = freeMin > 0 && total >= freeMin
                        const price = free ? 0 : Number(c.price) || 0
                        const on = carrierId === c.id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => { setCarrierId(c.id); clearInvalid('co-carrier') }}
                            className={`flex items-center gap-3 rounded-none border-2 px-4 py-3 text-left transition-colors ${on ? 'border-[#141414] bg-[#F7F6F2]' : 'border-[#141414]/12 hover:border-[#141414]/25'}`}
                          >
                            <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${on ? 'border-[#141414] bg-[#141414] shadow-[inset_0_0_0_3px_#fff]' : 'border-[#141414]/25'}`} />
                            <span className="min-w-0 flex-1 font-semibold text-[#141414] truncate">{c.name}</span>
                            <span className={`shrink-0 text-sm font-bold ${price === 0 ? 'text-green-700' : 'text-[#141414]'}`} style={mono}>{price === 0 ? 'Gratis' : formatPrice(price)}</span>
                          </button>
                        )
                      })}
                    </div>
                    {fieldError('co-carrier')}
                    <p className="mt-2 text-[13px] text-[#57534E]">El costo es por todo el pedido{freeMin > 0 ? `; es gratis desde ${formatPrice(freeMin)}` : ''}.</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#57534E]">Recoges tu pedido en {cfg.city}. Te avisamos por WhatsApp cuando esté listo.</p>
            )}
            <div className="mt-4">
              <label className={label} htmlFor="co-notes">Nota para tu pedido (opcional)</label>
              <textarea id="co-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-none border border-[#141414]/25 bg-white px-4 py-3 text-[15px] outline-none focus:border-[#141414] focus:ring-4 focus:ring-slate-900/5 resize-none" />
            </div>
            {session && (
              <label className="mt-4 flex items-center gap-3 text-sm text-[#57534E] cursor-pointer">
                <input type="checkbox" checked={saveData} onChange={(e) => setSaveData(e.target.checked)} className="w-4 h-4 accent-[#141414]" />
                Guardar estos datos en mi cuenta para la próxima vez
              </label>
            )}
          </section>
        </div>

        {/* resumen */}
        <aside aria-label="Resumen del pedido" className="lg:sticky lg:top-28 rounded-none border border-[#141414]/12 bg-white p-5 sm:p-6 space-y-5">
          <h2 className="text-[17px] font-semibold" style={{ color: INK }}>Tu pedido</h2>
          <ul className="space-y-3">
            {items.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center gap-3">
                <span className="w-14 h-16 flex-shrink-0 overflow-hidden flex items-center justify-center bg-[#F7F6F2]">
                  {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" />}
                </span>
                <span className="flex-1 min-w-0 text-sm">
                  <span className="block font-medium text-[#141414] truncate">{product.name}{product.volume ? ` · ${product.volume}` : ''}</span>
                  <span className="text-xs text-[#57534E]">{qty} × <PriceTag price={effectivePrice(discounts, product)} original={Number(product.price)} badge={false} /></span>
                </span>
                <strong className="text-sm" style={mono}>{formatPrice(effectivePrice(discounts, product) * qty)}</strong>
              </li>
            ))}
          </ul>

          <CouponBox subtotal={subtotal} coupon={coupon} onChange={onCoupon} />

          <div className="text-sm space-y-1.5 pt-1 border-t border-[#141414]/12">
            <div className="flex justify-between text-[#57534E] pt-3"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {coupon && <div className="flex justify-between text-green-600"><span>Cupón {coupon.code}</span><span>-{formatPrice(discount)}</span></div>}
            {delivery === 'envio' && carriers.length > 0 && (
              <div className="flex justify-between text-[#57534E]">
                <span>Envío{carrier ? ` · ${carrier.name}` : ''}</span>
                <span>{carrier ? (shipping > 0 ? formatPrice(shipping) : 'Gratis') : 'Elige tu paquetera'}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline font-semibold text-[20px] pt-2 mt-1 border-t border-[#141414]/12"><span>Total</span><span style={mono}>{formatPrice(grandTotal)}</span></div>
          </div>

          {freeMin > 0 && (
            <div>
              <p className="text-[13px] text-[#57534E]">{total >= freeMin ? 'Tu pedido tiene envío gratis.' : `Te faltan ${formatPrice(freeMin - total)} para el envío gratis.`}</p>
              <div className="mt-2 h-1 bg-[#EDE8DF] overflow-hidden">
                <div className="h-full bg-[#141414] transition-all duration-500" style={{ width: `${Math.min(100, (total / freeMin) * 100)}%` }} />
              </div>
            </div>
          )}

          {formError && (
            <div role="alert" className="rounded-none border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              {formError}
              {failedDraft && <button onClick={() => sendDraft()} disabled={!!busy} className="mt-2 block font-semibold underline">Enviar igual por WhatsApp</button>}
            </div>
          )}

          <div className="space-y-2.5">
            <button onClick={() => confirmOrder(false)} disabled={!!busy} aria-busy={busy === 'order'} className="w-full min-h-14 rounded-none bg-[#141414] text-white text-[15px] font-semibold hover:bg-[#2B2B2B] disabled:opacity-60 transition-colors">
              {busy === 'order' ? 'Registrando tu pedido…' : 'Confirmar pedido'}
            </button>
            <button onClick={() => confirmOrder(true)} disabled={!!busy} className="w-full min-h-12 flex items-center justify-center gap-2 rounded-none border border-[#141414] text-[#141414] text-[14px] font-semibold hover:bg-[#141414] hover:text-white disabled:opacity-60 transition-colors">
              <Icon d={ICONS.chat} size={16} /> {busy === 'orderWa' ? 'Registrando…' : 'Confirmar y avisar por WhatsApp'}
            </button>
            <button onClick={quote} disabled={!!busy} className="w-full min-h-11 text-[14px] font-semibold text-[#57534E] underline underline-offset-4 hover:text-[#141414] disabled:opacity-60">
              {busy === 'quote' ? 'Preparando…' : 'Solo cotizar por WhatsApp'}
            </button>
            <p className="text-[13px] leading-relaxed text-[#57534E]">Al confirmar no se hace ningún cobro en línea: el pago se coordina contigo por WhatsApp.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
