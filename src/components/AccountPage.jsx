import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../admin/AuthContext'
import { listMyOrders, listMyQuotes, saveMyProfile } from '../admin/api'
import { DEPARTMENTS, formatPrice } from '../catalog'
import { useAccount } from './AccountModal'
import { INK, AMBER, display, mono } from './ui'

const input =
  'w-full h-11 rounded-xl border border-neutral-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5'
const label = 'block mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500'

const ORDER_STATUS = {
  pendiente: ['Pendiente de confirmar', '#fef3c7', '#92400e'],
  confirmada: ['Confirmado', '#dbeafe', '#1e40af'],
  enviada: ['En camino', '#e0e7ff', '#3730a3'],
  entregada: ['Entregado', '#d1fae5', '#065f46'],
  cancelada: ['Cancelado', '#fee2e2', '#991b1b'],
}
const QUOTE_STATUS = {
  abierta: ['En revisión', '#fef3c7', '#92400e'],
  enviada: ['Respondida', '#dbeafe', '#1e40af'],
  ganada: ['Aceptada', '#d1fae5', '#065f46'],
  perdida: ['Cerrada', '#e2e8f0', '#334155'],
}

const day = (d) => new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })

function Pill({ map, value }) {
  const [text, bg, fg] = map[value] ?? [value, '#e2e8f0', '#334155']
  return <span className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ backgroundColor: bg, color: fg }}>{text}</span>
}

function List({ id, title, count, empty, children }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <h2 className="px-5 sm:px-6 py-4 border-b border-neutral-200 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>
        {title} <span className="text-slate-400">({count})</span>
      </h2>
      {count === 0 ? <p className="px-6 py-10 text-center text-sm text-slate-500">{empty}</p> : <ul className="divide-y divide-neutral-100">{children}</ul>}
    </section>
  )
}

const STEPS = ['Recibido', 'Confirmado', 'Enviado', 'Entregado']

// En qué paso va el pedido (0 a 3)
function stepOf(o) {
  const sh = o.shipment
  if (o.status === 'entregada' || sh?.status === 'entregado') return 3
  if (sh?.status === 'enviado' || sh?.shipped_at) return 2
  if (o.status === 'confirmada') return 1
  return 0
}

// Estado que ve el cliente: sigue al despacho (Logística) cuando ya existe
const statusOf = (o) => {
  if (o.status === 'cancelada') return 'cancelada'
  const step = stepOf(o)
  return step === 3 ? 'entregada' : step === 2 ? 'enviada' : o.status
}

const trackingLink = (sh) => {
  if (!sh?.tracking_url || !sh.tracking_number) return null
  return sh.tracking_url.includes('{guia}') ? sh.tracking_url.replace('{guia}', encodeURIComponent(sh.tracking_number)) : sh.tracking_url
}

function Row({ k, children }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium" style={{ color: INK }}>{children}</span>
    </div>
  )
}

// Un pedido que se abre para ver su detalle, estado y seguimiento
function OrderItem({ o }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])
  const [copied, setCopied] = useState(false)
  const sh = o.shipment
  const step = stepOf(o)
  const link = trackingLink(sh)
  const items = o.items ?? []
  const hasShipping = o.delivery_method !== 'retiro' && (sh != null || o.shipping_total != null)
  const shipping = o.delivery_method === 'retiro' ? 0 : Number(sh ? sh.cost : o.shipping_total) || 0
  const grand = Number(o.total) + shipping
  const place = o.delivery_method === 'retiro' ? 'Retiro en tienda' : [o.department, o.municipality].filter(Boolean).join(' / ') || 'Envío'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sh.tracking_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sin portapapeles */
    }
  }

  return (
    <li>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="w-full px-5 sm:px-6 py-4 text-left hover:bg-neutral-50 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold" style={{ color: INK }}>
            Pedido {o.order_number ? `#${o.order_number}` : ''} <span className="font-normal text-sm text-slate-500">· {day(o.created_at)}</span>
          </p>
          <Pill map={ORDER_STATUS} value={statusOf(o)} />
        </div>
        <p className="mt-1.5 text-sm text-slate-600">{items.map((i) => `${i.product_name} ×${i.quantity}`).join(', ')}</p>
        <p className="mt-1 flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">{place}</span>
          <span className="flex items-center gap-3">
            <strong style={mono}>{formatPrice(grand)}</strong>
            <span className="text-xs font-semibold underline text-slate-500">Ver detalle</span>
          </span>
        </p>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label={`Pedido ${o.order_number ?? ''}`} className="relative w-full sm:max-w-[520px] max-h-[92svh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-white px-5 sm:px-6 pt-5 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-xl font-black uppercase leading-tight" style={{ ...display, color: INK }}>Pedido {o.order_number ? `#${o.order_number}` : ''}</h3>
                <p className="mt-1 text-sm text-slate-500">{day(o.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill map={ORDER_STATUS} value={statusOf(o)} />
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="w-9 h-9 flex items-center justify-center rounded-lg text-2xl leading-none text-slate-500 hover:bg-neutral-100">×</button>
              </div>
            </div>
        <div className="px-5 sm:px-6 pb-6 pt-1 space-y-5">
          {o.status === 'cancelada' ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Este pedido fue cancelado.</p>
          ) : (
            <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Estado del pedido">
              {STEPS.map((label, i) => (
                <li key={label} className="text-center">
                  <div className="flex items-center">
                    <span className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : i <= step ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
                    <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${i <= step ? 'bg-emerald-500 text-white' : 'bg-neutral-200 text-slate-400'}`}>{i <= step ? '✓' : i + 1}</span>
                    <span className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? 'bg-transparent' : i < step ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
                  </div>
                  <p className={`mt-1.5 text-[11px] font-semibold ${i <= step ? 'text-slate-900' : 'text-slate-400'}`}>{label}</p>
                </li>
              ))}
            </ol>
          )}

          {o.delivery_method !== 'retiro' && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400" style={mono}>Seguimiento</p>
              {sh ? (
                <>
                  <Row k="Paquetera">{sh.carrier || 'Por asignar'}</Row>
                  <Row k="Estado del envío">{({ preparando: 'Preparando', enviado: 'En camino', entregado: 'Entregado', devuelto: 'Devuelto' })[sh.status] ?? sh.status}</Row>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Código de seguimiento</span>
                    {sh.tracking_number ? (
                      <span className="flex items-center gap-2">
                        <strong style={mono}>{sh.tracking_number}</strong>
                        <button type="button" onClick={copy} className="px-2 py-1 rounded-lg border border-neutral-300 text-[11px] font-bold text-slate-600 hover:bg-neutral-100">{copied ? 'Copiado' : 'Copiar'}</button>
                      </span>
                    ) : (
                      <span className="text-slate-400">Aún no disponible</span>
                    )}
                  </div>
                  {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold underline" style={{ color: AMBER }}>Rastrear mi paquete →</a>}
                </>
              ) : (
                <p className="text-sm text-slate-500">Todavía no sale a envío. Te mostraremos aquí la paquetera y el código cuando esté en camino.</p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <ul className="divide-y divide-neutral-100">
              {items.map((i, n) => (
                <li key={n} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 text-slate-700">{i.product_name} <span className="text-slate-400">×{i.quantity}</span></span>
                  <strong className="shrink-0" style={mono}>{formatPrice(i.subtotal ?? i.unit_price * i.quantity)}</strong>
                </li>
              ))}
            </ul>
            {o.subtotal != null && (
              <div className="border-t border-neutral-200 px-4 py-3 space-y-1">
                <Row k="Subtotal">{formatPrice(o.subtotal)}</Row>
                {Number(o.discount_total) > 0 && <Row k={`Descuento${o.coupon_code ? ` (${o.coupon_code})` : ''}`}>−{formatPrice(o.discount_total)}</Row>}
                {hasShipping && <Row k="Envío">{shipping > 0 ? formatPrice(shipping) : 'Gratis'}</Row>}
                <Row k="Total"><strong style={mono}>{formatPrice(grand)}</strong></Row>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Row k="Entrega">{place}</Row>
            {o.delivery_method !== 'retiro' && o.address && <Row k="Dirección">{o.address}</Row>}
            {o.delivery_date && <Row k="Día de entrega">{day(`${o.delivery_date}T12:00:00`)}</Row>}
            {o.delivery_window && <Row k="Horario">{o.delivery_window}</Row>}
            {o.invoice_number && <Row k="Factura">{o.invoice_number}</Row>}
          </div>
        </div>
          </div>
        </div>
      )}
    </li>
  )
}

// Mi cuenta: datos personales, pedidos y cotizaciones del cliente
export default function AccountPage() {
  const { session, loading, customer, reloadCustomer, logout, access } = useAuth()
  const { openAccount } = useAccount()
  const isStaff = !!access && (access.legacy || access.super || (access.permissions ?? []).length > 0)
  const [form, setForm] = useState({ name: '', phone: '', department: '', municipality: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [orders, setOrders] = useState([])
  const [quotes, setQuotes] = useState([])

  useEffect(() => {
    if (!customer) return
    setForm({
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      department: customer.department ?? '',
      municipality: customer.municipality ?? '',
      address: customer.address ?? '',
    })
    listMyOrders(customer.id).then(setOrders).catch(() => setOrders([]))
    listMyQuotes(customer.id).then(setQuotes).catch(() => setQuotes([]))
  }, [customer])

  useEffect(() => {
    if (window.location.hash === '#pedidos') document.getElementById('pedidos')?.scrollIntoView({ behavior: 'smooth' })
  }, [orders])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await saveMyProfile(form)
      await reloadCustomer()
      setNotice('Tus datos se guardaron.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const wrap = 'max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-12 py-10 lg:py-14'

  if (loading) return <div className={wrap}><div className="h-64 rounded-2xl bg-white border border-neutral-200 animate-pulse" /></div>

  if (!session) {
    return (
      <div className={wrap}>
        <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-black uppercase" style={{ ...display, color: INK }}>Tu cuenta</h1>
          <p className="mt-3 text-slate-500 max-w-md mx-auto">Ingresa o crea tu cuenta para ver tus pedidos, cotizaciones y guardar tus datos de entrega.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={() => openAccount('login')} className="px-6 h-12 rounded-xl text-white text-[12px] font-bold uppercase tracking-wider" style={{ backgroundColor: INK }}>Ingresar</button>
            <button onClick={() => openAccount('register')} className="px-6 h-12 rounded-xl border border-neutral-300 text-[12px] font-bold uppercase tracking-wider" style={{ color: INK }}>Crear cuenta</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={wrap}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400" style={mono}>Mi cuenta</p>
          <h1 className="mt-1 text-3xl font-black uppercase leading-tight" style={{ ...display, color: INK }}>
            Hola{customer?.name ? `, ${customer.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{session.user.email}</p>
        </div>
        <div className="flex gap-2">
          {isStaff && <Link to="/admin" className="h-10 px-4 inline-flex items-center rounded-xl border border-neutral-300 bg-white text-[12px] font-bold uppercase tracking-wider" style={{ color: INK }}>Ir al panel</Link>}
          <button onClick={logout} className="h-10 px-4 rounded-xl border border-neutral-300 bg-white text-[12px] font-bold uppercase tracking-wider text-slate-600 hover:bg-neutral-50">Cerrar sesión</button>
        </div>
      </div>

      {(
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          <form onSubmit={save} className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>Mis datos</h2>
            <div>
              <label className={label} htmlFor="acc-name">Nombre</label>
              <input id="acc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="acc-phone">Teléfono</label>
              <input id="acc-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="7000-0000" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="acc-dep">Departamento</label>
              <select id="acc-dep" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={input}>
                <option value="">Sin indicar</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="acc-mun">Municipio</label>
              <input id="acc-mun" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="acc-addr">Dirección o punto de referencia</label>
              <input id="acc-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={input} />
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{notice}</p>}
            <button type="submit" disabled={saving} className="w-full h-11 rounded-xl text-white text-[12px] font-bold uppercase tracking-wider disabled:opacity-60" style={{ backgroundColor: INK }}>
              {saving ? 'Guardando…' : 'Guardar mis datos'}
            </button>
            <p className="text-xs text-slate-400">Estos datos se rellenan solos cuando haces un pedido.</p>
          </form>

          <div className="space-y-6">
            <List id="pedidos" title="Mis pedidos" count={orders.length} empty="Todavía no has hecho pedidos.">
              {orders.map((o) => <OrderItem key={o.id} o={o} />)}
            </List>

            <List title="Mis cotizaciones" count={quotes.length} empty="Todavía no has cotizado nada.">
              {quotes.map((q) => (
                <li key={q.id} className="px-5 sm:px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold" style={{ color: INK }}>COT-{q.quote_number} <span className="font-normal text-sm text-slate-500">· {day(q.created_at)}</span></p>
                    <Pill map={QUOTE_STATUS} value={q.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{(q.quote_items ?? []).map((i) => `${i.product_name} ×${i.quantity}`).join(', ')}</p>
                  <p className="mt-1 text-right text-sm"><strong style={mono}>{formatPrice(q.total)}</strong></p>
                </li>
              ))}
            </List>
          </div>
        </div>
      )}
    </div>
  )
}
