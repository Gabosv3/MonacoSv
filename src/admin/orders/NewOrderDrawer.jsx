import { useMemo, useState } from 'react'
import { formatPrice } from '../../catalog'
import { INK, mono } from '../../components/ui'
import { Btn, Drawer, Field, Section, inputCls } from '../kit'
import { createSale } from '../api'
import { DeliveryFields } from './OrderDrawer'

const EMPTY = {
  customer_name: '',
  customer_phone: '',
  delivery_method: 'envio',
  department: '',
  municipality: '',
  address: '',
  notes: '',
  delivery_date: '',
  delivery_window: '',
  courier_id: '',
}

const label = (p) => `${p.name}${p.volume ? ` · ${p.volume}` : ''} — ${formatPrice(p.price)}`

// Crear un pedido a mano (por ejemplo, uno recibido por WhatsApp).
export default function NewOrderDrawer({ open, products, couriers, onClose, onCreated, onError }) {
  const [form, setForm] = useState(EMPTY)
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }])
  const [saving, setSaving] = useState(false)

  const available = useMemo(() => products.filter((p) => p.active), [products])
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const priced = lines
    .map((l) => ({ ...l, product: available.find((p) => p.id === l.product_id) }))
    .filter((l) => l.product && Number(l.quantity) > 0)
  const total = priced.reduce((s, l) => s + Number(l.product.price) * Number(l.quantity), 0)

  const close = () => {
    setForm(EMPTY)
    setLines([{ product_id: '', quantity: 1 }])
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!priced.length) return onError(new Error('Agrega al menos un producto al pedido.'))
    setSaving(true)
    try {
      await createSale({
        ...form,
        courier_id: form.courier_id || null,
        delivery_date: form.delivery_date || null,
        subtotal: total,
        discount_total: 0,
        total,
        status: 'confirmada',
        source: 'admin',
        items: priced.map((l) => ({
          product_id: l.product.id,
          product_name: l.product.volume ? `${l.product.name} (${l.product.volume})` : l.product.name,
          quantity: Number(l.quantity),
          unit_price: Number(l.product.price),
        })),
      })
      onCreated()
      close()
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Nuevo pedido"
      subtitle="Para pedidos que llegan por WhatsApp, llamada o en persona. Entra como confirmado y descuenta stock."
      footer={
        <>
          <Btn kind="secondary" type="button" onClick={close}>Cancelar</Btn>
          <Btn type="submit" form="new-order-form" disabled={saving}>{saving ? 'Creando…' : `Crear pedido · ${formatPrice(total)}`}</Btn>
        </>
      }
    >
      <form id="new-order-form" onSubmit={submit}>
        <Section title="Cliente">
          <Field label="Nombre" className="col-span-2">
            <input required value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} placeholder="Nombre del cliente" className={inputCls} />
          </Field>
          <Field label="Teléfono" className="col-span-2">
            <input value={form.customer_phone} onChange={(e) => set({ customer_phone: e.target.value })} placeholder="7000-0000" className={inputCls} />
          </Field>
        </Section>

        <Section title="Productos">
          {lines.map((l, i) => (
            <div key={i} className="col-span-2 grid grid-cols-[1fr_84px_auto] gap-2 items-end">
              <Field label={i === 0 ? 'Producto' : ''}>
                <select value={l.product_id} onChange={(e) => setLine(i, { product_id: e.target.value })} className={inputCls}>
                  <option value="">Elige un producto…</option>
                  {available.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
                </select>
              </Field>
              <Field label={i === 0 ? 'Cant.' : ''}>
                <input type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={inputCls} />
              </Field>
              <button
                type="button"
                onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls))}
                disabled={lines.length === 1}
                aria-label="Quitar producto"
                className="h-11 w-10 rounded-xl text-xl text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-between">
            <Btn type="button" kind="secondary" size="sm" onClick={() => setLines((ls) => [...ls, { product_id: '', quantity: 1 }])}>+ Agregar otro producto</Btn>
            <p className="text-sm text-slate-500">Total <strong className="text-base" style={{ ...mono, color: INK }}>{formatPrice(total)}</strong></p>
          </div>
        </Section>

        <Section title="Entrega">
          <DeliveryFields form={form} set={set} couriers={couriers} />
        </Section>
      </form>
    </Drawer>
  )
}
