import { useEffect, useState } from 'react'
import { DEPARTMENTS, formatPrice } from '../../catalog'
import { INK, mono } from '../../components/ui'
import { Btn, Drawer, Field, Section, inputCls, textareaCls } from '../kit'
import { updateSale } from '../api'
import { fmtDateTime, orderLabel } from './shared'

const STATUSES = [
  ['pendiente', 'Pendiente'],
  ['confirmada', 'Confirmada'],
  ['entregada', 'Entregada'],
  ['cancelada', 'Cancelada'],
]

export function DeliveryFields({ form, set, couriers }) {
  const pickup = form.delivery_method === 'retiro'
  return (
    <>
      <div className="col-span-2 grid grid-cols-2 gap-2">
        {[['envio', 'Envío a domicilio'], ['retiro', 'Retiro en tienda']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => set({ delivery_method: key })}
            className="h-11 rounded-xl border text-sm font-semibold transition-colors"
            style={form.delivery_method === key ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#d4d4d8', color: '#475569' }}
          >
            {label}
          </button>
        ))}
      </div>
      {!pickup && (
        <>
          <Field label="Departamento">
            <select value={form.department} onChange={(e) => set({ department: e.target.value })} className={inputCls}>
              <option value="">Elige…</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Municipio">
            <input value={form.municipality} onChange={(e) => set({ municipality: e.target.value })} placeholder="Ej. Santiago de María" className={inputCls} />
          </Field>
          <Field label="Dirección o punto de referencia" className="col-span-2">
            <input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Colonia, calle, casa…" className={inputCls} />
          </Field>
        </>
      )}
      <Field label="Fecha de entrega">
        <input type="date" value={form.delivery_date} onChange={(e) => set({ delivery_date: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Horario">
        <input value={form.delivery_window} onChange={(e) => set({ delivery_window: e.target.value })} placeholder="2:00 PM - 3:00 PM" className={inputCls} />
      </Field>
      <Field label="Encomendista" className="col-span-2">
        <select value={form.courier_id} onChange={(e) => set({ courier_id: e.target.value })} className={inputCls}>
          <option value="">Sin asignar</option>
          {couriers.filter((c) => c.active || c.id === form.courier_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Notas del pedido" className="col-span-2">
        <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Indicaciones para la entrega…" className={textareaCls} />
      </Field>
    </>
  )
}

const toForm = (o) => ({
  customer_name: o.customer_name ?? '',
  customer_phone: o.customer_phone ?? '',
  delivery_method: o.delivery_method ?? 'envio',
  department: o.department ?? '',
  municipality: o.municipality ?? '',
  address: o.address ?? '',
  notes: o.notes ?? '',
  delivery_date: o.delivery_date ?? '',
  delivery_window: o.delivery_window ?? '',
  courier_id: o.courier_id ?? '',
  status: o.status,
})

export default function OrderDrawer({ order, couriers, canUpdate, onClose, onSaved, onInvoice, onError }) {
  const [form, setForm] = useState(order ? toForm(order) : null)
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm(order ? toForm(order) : null), [order])

  if (!order || !form) return <Drawer open={false} onClose={onClose} />

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSale(order.id, {
        ...form,
        courier_id: form.courier_id || null,
        delivery_date: form.delivery_date || null,
        ...(form.delivery_method === 'retiro' ? { department: '', municipality: '', address: '' } : {}),
      })
      onSaved()
      onClose()
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Pedido ${orderLabel(order)}`.trim()}
      subtitle={`Recibido ${fmtDateTime(order.created_at)} · ${order.source === 'tienda' ? 'desde la tienda' : 'creado en el panel'}`}
      footer={
        <>
          <Btn kind="secondary" type="button" onClick={onClose}>{canUpdate ? 'Cancelar' : 'Cerrar'}</Btn>
          {canUpdate && <Btn type="submit" form="order-form" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Btn>}
        </>
      }
    >
      <form id="order-form" onSubmit={save}>
        <fieldset disabled={!canUpdate} className="contents">
          <Section title="Cliente">
            <Field label="Nombre" className="col-span-2">
              <input value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Teléfono" className="col-span-2">
              <input value={form.customer_phone} onChange={(e) => set({ customer_phone: e.target.value })} className={inputCls} />
            </Field>
          </Section>

          <Section title="Entrega">
            <DeliveryFields form={form} set={set} couriers={couriers} />
          </Section>

          <Section title="Estado">
            <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STATUSES.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set({ status: key })}
                  className="h-10 rounded-xl border text-xs font-semibold transition-colors"
                  style={form.status === key ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#d4d4d8', color: '#475569' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>
        </fieldset>

        <Section title="Productos">
          <ul className="col-span-2 divide-y divide-neutral-100 text-sm">
            {(order.sale_items ?? []).map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-2">
                <span>{i.product_name} <span className="text-slate-400">× {i.quantity}</span></span>
                <span style={mono}>{formatPrice(i.subtotal)}</span>
              </li>
            ))}
            {(order.sale_items ?? []).length === 0 && <li className="py-2 text-slate-400">Sin productos</li>}
          </ul>
          <div className="col-span-2 space-y-1.5 border-t border-neutral-200 pt-3 text-sm">
            <p className="flex justify-between text-slate-500"><span>Subtotal</span><span style={mono}>{formatPrice(order.subtotal)}</span></p>
            {order.coupon_code && <p className="flex justify-between text-slate-500"><span>Cupón {order.coupon_code}</span><span style={mono}>−{formatPrice(order.discount_total)}</span></p>}
            <p className="flex justify-between font-bold"><span>Total</span><span style={mono}>{formatPrice(order.total)}</span></p>
          </div>
        </Section>

        <Section title="Factura">
          <div className="col-span-2 flex items-center justify-between gap-4">
            {order.invoice_number ? (
              <p className="text-sm">Facturado como <strong style={mono}>{order.invoice_number}</strong></p>
            ) : (
              <p className="text-sm text-slate-500">Este pedido aún no tiene factura.</p>
            )}
            {!order.invoice_number && canUpdate && (
              <Btn kind="secondary" size="sm" type="button" onClick={() => onInvoice(order)}>Facturar</Btn>
            )}
          </div>
        </Section>
      </form>
    </Drawer>
  )
}
