import { useEffect, useMemo, useState } from 'react'
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
import { Icon, ICONS, INK, AMBER, display, mono, PriceTag } from './ui'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const field = 'w-full h-12 rounded-xl border border-neutral-300 bg-white px-4 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5'
const label = 'block mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500'
const rpcMissing = (err) => /could not find the function|schema cache/i.test(err?.message ?? '')
const wrap = 'max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-12 py-10 lg:py-14'

// Pago: solo con sesión iniciada. Los datos se rellenan con los guardados en la
// cuenta y, si el cliente quiere, se guardan para la próxima vez.
export default function CheckoutPage({ items, discounts, subtotal, coupon, onCoupon, onOrderPlaced }) {
  const { cfg, wa } = useSettings()
  const { session, loading, customer, reloadCustomer } = useAuth()
  const { openAccount } = useAccount()
  const freeMin = Number(cfg.free_shipping_min) || 0

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [delivery, setDelivery] = useState('envio')
  const [department, setDepartment] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [saveData, setSaveData] = useState(true)
  const [carriers, setCarriers] = useState([]) // paqueteras con su precio de envío
  const [carrierId, setCarrierId] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(null) // 'order' | 'orderWa' | 'quote' | 'draft'
  const [result, setResult] = useState(null)
  const [sendInfo, setSendInfo] = useState('')
  const [failedDraft, setFailedDraft] = useState(false)

  useEffect(() => {
    listShippingOptions().then(setCarriers).catch(() => setCarriers([]))
  }, [])

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
  const store = { name: cfg.store_name, city: cfg.city, whatsapp: cfg.whatsapp, email: cfg.contact_email }

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

  const validate = () => {
    if (!name.trim() || !phone.trim()) {
      setFormError('Escribe tu nombre y tu teléfono para registrar el pedido.')
      return false
    }
    if (delivery === 'envio' && (!department || !municipality.trim())) {
      setFormError('Elige tu departamento y escribe tu municipio para coordinar el envío.')
      return false
    }
    if (delivery === 'envio' && carriers.length > 0 && !carrierId) {
      setFormError('Elige con quién quieres recibir tu envío.')
      return false
    }
    setFormError('')
    return true
  }

  const rememberData = async () => {
    if (!saveData) return
    try {
      await saveMyProfile({ name: name.trim(), phone: phone.trim(), department: delivery === 'envio' ? department : customer?.department ?? '', municipality: delivery === 'envio' ? municipality.trim() : customer?.municipality ?? '', address: delivery === 'envio' ? address.trim() : customer?.address ?? '' })
      await reloadCustomer()
    } catch {
      /* si el teléfono ya es de otro cliente, el pedido igual queda registrado */
    }
  }

  const confirmOrder = async (thenWhatsApp) => {
    if (!items.length || busy || !validate()) return
    const win = thenWhatsApp ? window.open('', '_blank') : null
    setBusy(thenWhatsApp ? 'orderWa' : 'order')
    setFailedDraft(false)
    setSendInfo('')
    try {
      let data
      try {
        const res = await placeOrder({
          customer: { ...customerData(), delivery_method: delivery },
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
        if (!rpcMissing(err)) throw err
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
      await rememberData()
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
        /row-level security|violates|permission denied/i.test(err.message)
          ? 'No pudimos registrar tu pedido en el sistema. Puedes enviarlo igual por WhatsApp.'
          : err.message || 'No pudimos registrar tu pedido.'
      )
      setFailedDraft(true)
    } finally {
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
  if (loading) return <div className={wrap}><div className="h-72 rounded-2xl bg-white border border-neutral-200 animate-pulse" /></div>

  if (!session) {
    return (
      <div className={wrap}>
        <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-black uppercase" style={{ ...display, color: INK }}>Ingresa para continuar</h1>
          <p className="mt-3 text-slate-500 max-w-md mx-auto">Para hacer tu pedido necesitas una cuenta. Así guardamos tus datos de entrega y puedes ver tus pedidos cuando quieras.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={() => openAccount('login', { next: '/checkout' })} className="px-6 h-12 rounded-xl text-white text-[12px] font-bold uppercase tracking-wider" style={{ backgroundColor: INK }}>Ingresar</button>
            <button onClick={() => openAccount('register', { next: '/checkout' })} className="px-6 h-12 rounded-xl border border-neutral-300 text-[12px] font-bold uppercase tracking-wider" style={{ color: INK }}>Crear cuenta</button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- pedido registrado ----------
  if (result) {
    const { data, draft, keepCart } = result
    const isQuote = data.kind === 'cotizacion'
    return (
      <div className={wrap}>
        <div className="max-w-xl mx-auto rounded-3xl border border-neutral-200 bg-white p-6 sm:p-10">
          <div className="text-center">
            <span className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl" aria-hidden>✓</span>
            <h1 className="mt-5 text-2xl font-black uppercase leading-tight" style={{ ...display, color: INK }}>
              {draft ? 'Pedido enviado por WhatsApp' : isQuote ? `Cotización${data.number ? ` COT-${data.number}` : ''} registrada` : `¡Pedido${data.number ? ` #${data.number}` : ''} recibido!`}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {draft ? 'Aún no quedó en el sistema, pero te abrimos WhatsApp con tu pedido para que lo atendamos y lo registremos nosotros.' : isQuote ? 'Se abrió WhatsApp con tu cotización. Te respondemos con la disponibilidad.' : 'Te escribiremos por WhatsApp para confirmar el pago y la entrega.'}
            </p>
          </div>

          <div className="mt-7 rounded-2xl border border-neutral-200 divide-y divide-neutral-100 text-sm">
            {data.items.map((i, idx) => (
              <div key={idx} className="flex justify-between gap-3 px-4 py-3">
                <span className="text-slate-700">{i.name} <span className="text-slate-400">× {i.qty}</span></span>
                <span className="font-semibold">{formatPrice(i.unit * i.qty)}</span>
              </div>
            ))}
            {data.discount > 0 && <div className="flex justify-between px-4 py-3 text-green-700"><span>Cupón {data.couponCode}</span><span>-{formatPrice(data.discount)}</span></div>}
            {data.shipping != null && <div className="flex justify-between px-4 py-3"><span className="text-slate-700">Envío{data.carrier ? ` · ${data.carrier}` : ''}</span><span className="font-semibold">{data.shipping > 0 ? formatPrice(data.shipping) : 'Gratis'}</span></div>}
            <div className="flex justify-between px-4 py-3.5 font-bold text-base"><span>Total</span><span>{formatPrice(data.total + (data.shipping || 0))}</span></div>
          </div>
          {!isQuote && (
            <p className="mt-3 text-xs text-slate-500">
              {data.customer.delivery === 'retiro' ? 'Retiro en tienda' : `Envío a ${[data.customer.municipality, data.customer.department].filter(Boolean).join(', ')}`} · {data.customer.name} · {data.customer.phone}
            </p>
          )}

          <div className="mt-7 space-y-3">
            <button onClick={() => openWhatsApp(data)} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
              <Icon d={ICONS.chat} size={17} /> Abrir WhatsApp
            </button>
            <button onClick={async () => downloadBlob(await buildOrderPdf(data, store), pdfFilename(data))} className="w-full h-11 rounded-xl border border-neutral-300 text-sm font-medium text-slate-700 hover:bg-neutral-50 transition-colors">Descargar PDF</button>
            {sendInfo && <p role="status" className="text-xs text-green-700 text-center leading-relaxed">{sendInfo}</p>}
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {keepCart && <button onClick={() => setResult(null)} className="font-semibold underline text-slate-900">Volver al pago</button>}
            <Link to="/fragancias" className="font-semibold underline text-slate-900">Seguir comprando</Link>
            {!isQuote && !draft && <Link to="/cuenta" className="font-semibold underline text-slate-900">Ver mis pedidos</Link>}
          </div>
        </div>
      </div>
    )
  }

  // ---------- carrito vacío ----------
  if (items.length === 0) {
    return (
      <div className={wrap}>
        <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-16 text-center">
          <h1 className="text-2xl font-black uppercase" style={{ ...display, color: INK }}>Tu carrito está vacío</h1>
          <p className="mt-3 text-slate-500">Agrega tus fragancias favoritas para continuar con el pago.</p>
          <Link to="/fragancias" className="inline-block mt-7 px-6 h-12 leading-[48px] rounded-xl text-white text-[12px] font-bold uppercase tracking-wider" style={{ backgroundColor: INK }}>Ver catálogo</Link>
        </div>
      </div>
    )
  }

  // ---------- formulario de pago ----------
  return (
    <div className={wrap}>
      <nav className="text-[11px] uppercase tracking-wider text-slate-400" style={mono}>
        <Link to="/fragancias" className="hover:text-slate-700">Catálogo</Link> <span className="mx-1.5">/</span> <span className="text-slate-600">Pago</span>
      </nav>
      <h1 className="mt-3 text-3xl sm:text-4xl font-black uppercase leading-tight" style={{ ...display, color: INK }}>Finalizar pedido</h1>

      <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>1 · Tus datos</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="co-name">Nombre *</label>
                <input id="co-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} />
              </div>
              <div>
                <label className={label} htmlFor="co-phone">Teléfono (WhatsApp) *</label>
                <input id="co-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="7000-0000" className={field} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Correo de tu cuenta</label>
                <input value={session.user.email} readOnly className={`${field} bg-neutral-50 text-slate-500`} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>2 · Entrega</h2>
            <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Tipo de entrega">
              {[['envio', 'Envío a domicilio'], ['retiro', 'Retiro en tienda']].map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDelivery(key)}
                  className="h-12 rounded-xl border text-sm font-semibold transition-colors"
                  style={delivery === key ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#d4d4d8', color: '#475569' }}
                >
                  {text}
                </button>
              ))}
            </div>
            {delivery === 'envio' ? (
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label} htmlFor="co-dep">Departamento *</label>
                  <select id="co-dep" value={department} onChange={(e) => setDepartment(e.target.value)} className={field}>
                    <option value="">Elige…</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="co-mun">Municipio *</label>
                  <input id="co-mun" value={municipality} onChange={(e) => setMunicipality(e.target.value)} className={field} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="co-addr">Dirección o punto de referencia</label>
                  <input id="co-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Colonia, calle, casa…" className={field} />
                </div>
                {carriers.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className={label} id="co-carrier-label">¿Con quién quieres tu envío? *</span>
                    <div className="grid gap-2" role="radiogroup" aria-labelledby="co-carrier-label">
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
                            onClick={() => setCarrierId(c.id)}
                            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${on ? 'border-slate-900 bg-slate-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                          >
                            <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${on ? 'border-slate-900 bg-slate-900 shadow-[inset_0_0_0_3px_#fff]' : 'border-neutral-300'}`} />
                            <span className="min-w-0 flex-1 font-semibold text-slate-900 truncate">{c.name}</span>
                            <span className={`shrink-0 text-sm font-bold ${price === 0 ? 'text-green-700' : 'text-slate-900'}`} style={mono}>{price === 0 ? 'Gratis' : formatPrice(price)}</span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">El costo es por todo el pedido{freeMin > 0 ? `; es gratis desde ${formatPrice(freeMin)}` : ''}.</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Recoges tu pedido en {cfg.city}. Te avisamos por WhatsApp cuando esté listo.</p>
            )}
            <div className="mt-4">
              <label className={label} htmlFor="co-notes">Nota para tu pedido (opcional)</label>
              <textarea id="co-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 resize-none" />
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={saveData} onChange={(e) => setSaveData(e.target.checked)} className="w-4 h-4 accent-[#0f1a2e]" />
              Guardar estos datos en mi cuenta para la próxima vez
            </label>
          </section>
        </div>

        {/* resumen */}
        <aside className="lg:sticky lg:top-[200px] rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>Resumen</h2>
          <ul className="space-y-3">
            {items.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: `${product.color}22` }}>
                  {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-contain" />}
                </span>
                <span className="flex-1 min-w-0 text-sm">
                  <span className="block font-medium text-slate-900 truncate">{product.name}{product.volume ? ` · ${product.volume}` : ''}</span>
                  <span className="text-xs text-slate-500">{qty} × <PriceTag price={effectivePrice(discounts, product)} original={Number(product.price)} badge={false} /></span>
                </span>
                <strong className="text-sm" style={mono}>{formatPrice(effectivePrice(discounts, product) * qty)}</strong>
              </li>
            ))}
          </ul>

          <CouponBox subtotal={subtotal} coupon={coupon} onChange={onCoupon} />

          <div className="text-sm space-y-1.5 pt-1 border-t border-neutral-100">
            <div className="flex justify-between text-slate-500 pt-3"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {coupon && <div className="flex justify-between text-green-600"><span>Cupón {coupon.code}</span><span>-{formatPrice(discount)}</span></div>}
            {delivery === 'envio' && carriers.length > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Envío{carrier ? ` · ${carrier.name}` : ''}</span>
                <span>{carrier ? (shipping > 0 ? formatPrice(shipping) : 'Gratis') : 'Elige tu paquetera'}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1"><span>Total</span><span style={mono}>{formatPrice(grandTotal)}</span></div>
          </div>

          {freeMin > 0 && (
            <div>
              <p className="text-xs text-slate-600">{total >= freeMin ? '🎉 ¡Tu pedido tiene envío gratis!' : `Te faltan ${formatPrice(freeMin - total)} para el envío gratis.`}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${Math.min(100, (total / freeMin) * 100)}%` }} />
              </div>
            </div>
          )}

          {formError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              {formError}
              {failedDraft && <button onClick={() => sendDraft()} disabled={!!busy} className="mt-2 block font-semibold underline">Enviar igual por WhatsApp</button>}
            </div>
          )}

          <div className="space-y-2.5">
            <button onClick={() => confirmOrder(false)} disabled={!!busy} className="w-full h-12 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors">
              {busy === 'order' ? 'Registrando tu pedido…' : 'Confirmar pedido'}
            </button>
            <button onClick={() => confirmOrder(true)} disabled={!!busy} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-green-600 text-green-700 text-sm font-semibold hover:bg-green-50 disabled:opacity-60 transition-colors">
              <Icon d={ICONS.chat} size={16} /> {busy === 'orderWa' ? 'Registrando…' : 'Confirmar y avisar por WhatsApp'}
            </button>
            <button onClick={quote} disabled={!!busy} className="w-full h-11 rounded-xl border border-neutral-300 text-slate-700 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 transition-colors">
              {busy === 'quote' ? 'Preparando…' : 'Solo cotizar por WhatsApp'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
