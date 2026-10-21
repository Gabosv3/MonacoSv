import { useEffect, useMemo, useState } from 'react'
import { formatPrice } from '../../catalog'
import { INK, mono } from '../../components/ui'
import { Btn, Drawer, Field, Section, inputCls, textareaCls } from '../kit'
import { createCustomer, createQuote } from '../api'

const unitPriceOf = (p) => (p.sale_price != null && Number(p.sale_price) < Number(p.price) ? Number(p.sale_price) : Number(p.price))
const label = (p) => `${p.name}${p.volume ? ` · ${p.volume}` : ''} — ${formatPrice(unitPriceOf(p))}`
const EMPTY_LINE = { product_id: '', quantity: 1, unit_price: '' }

// Crear una cotización: de un cliente existente o de uno nuevo.
export default function QuoteDrawer({ open, customers, products, presetCustomerId, onClose, onSaved, onError }) {
  const [mode, setMode] = useState('existing')
  const [customerId, setCustomerId] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [lines, setLines] = useState([EMPTY_LINE])
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setCustomerId(presetCustomerId ?? '')
      setMode(presetCustomerId || customers.length ? 'existing' : 'new')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const available = useMemo(() => products.filter((p) => p.active), [products])
  const sortedCustomers = useMemo(() => [...customers].sort((a, b) => (a.name || '~').localeCompare(b.name || '~', 'es')), [customers])
  const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const pick = (i, productId) => {
    const p = available.find((x) => x.id === productId)
    setLine(i, { product_id: productId, unit_price: p ? String(unitPriceOf(p)) : '' })
  }

  const priced = lines
    .map((l) => ({ ...l, product: available.find((p) => p.id === l.product_id) }))
    .filter((l) => l.product && Number(l.quantity) > 0)
  const total = priced.reduce((s, l) => s + Number(l.unit_price || 0) * Number(l.quantity), 0)

  const close = () => {
    setLines([EMPTY_LINE])
    setValidUntil('')
    setNotes('')
    setNewName('')
    setNewPhone('')
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!priced.length) return onError(new Error('Agrega al menos un producto a la cotización.'))
    if (mode === 'existing' && !customerId) return onError(new Error('Elige el cliente de la cotización.'))
    if (mode === 'new' && !newName.trim() && !newPhone.trim()) return onError(new Error('Escribe el nombre o el teléfono del cliente nuevo.'))
    setSaving(true)
    try {
      let cid = customerId
      if (mode === 'new') {
        const created = await createCustomer({ name: newName.trim(), phone: newPhone.trim(), source: 'admin' })
        cid = created.id
      }
      await createQuote({
        customer_id: cid,
        status: 'abierta',
        source: 'admin',
        notes,
        valid_until: validUntil || null,
        items: priced.map((l) => ({
          product_id: l.product.id,
          product_name: l.product.volume ? `${l.product.name} (${l.product.volume})` : l.product.name,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price || 0),
        })),
      })
      onSaved()
      close()
    } catch (err) {
      onError(/duplicate|unique/i.test(err.message) ? new Error('Ya existe un cliente con ese teléfono.') : err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Nueva cotización"
      subtitle="Registra lo que el cliente quiere cotizar. Después puedes convertirla en pedido."
      footer={
        <>
          <Btn kind="secondary" type="button" onClick={close}>Cancelar</Btn>
          <Btn type="submit" form="quote-form" disabled={saving}>{saving ? 'Guardando…' : `Guardar cotización · ${formatPrice(total)}`}</Btn>
        </>
      }
    >
      <form id="quote-form" onSubmit={submit}>
        <Section title="Cliente">
          <div className="col-span-2 grid grid-cols-2 gap-2">
            {[['existing', 'Cliente registrado'], ['new', 'Cliente nuevo']].map(([key, text]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className="h-10 rounded-xl border text-sm font-semibold transition-colors"
                style={mode === key ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#d4d4d8', color: '#475569' }}
              >
                {text}
              </button>
            ))}
          </div>
          {mode === 'existing' ? (
            <Field label="Cliente" className="col-span-2">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                <option value="">Elige un cliente…</option>
                {sortedCustomers.map((c) => <option key={c.id} value={c.id}>{c.name || 'Sin nombre'}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Nombre">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del cliente" className={inputCls} />
              </Field>
              <Field label="Teléfono">
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="7000-0000" className={inputCls} />
              </Field>
            </>
          )}
        </Section>

        <Section title="Productos cotizados">
          {lines.map((l, i) => (
            <div key={i} className="col-span-2 grid grid-cols-[1fr_70px_90px_auto] gap-2 items-end">
              <Field label={i === 0 ? 'Producto' : ''}>
                <select value={l.product_id} onChange={(e) => pick(i, e.target.value)} className={inputCls}>
                  <option value="">Elige un producto…</option>
                  {available.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
                </select>
              </Field>
              <Field label={i === 0 ? 'Cant.' : ''}>
                <input type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={inputCls} />
              </Field>
              <Field label={i === 0 ? 'Precio' : ''}>
                <input type="number" step="0.01" min="0" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} className={inputCls} />
              </Field>
              <button
                type="button"
                onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls))}
                disabled={lines.length === 1}
                aria-label="Quitar producto"
                className="h-11 w-9 rounded-xl text-xl text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-between">
            <Btn type="button" kind="secondary" size="sm" onClick={() => setLines((ls) => [...ls, EMPTY_LINE])}>+ Agregar producto</Btn>
            <p className="text-sm text-slate-500">Total <strong className="text-base" style={{ ...mono, color: INK }}>{formatPrice(total)}</strong></p>
          </div>
        </Section>

        <Section title="Detalles">
          <Field label="Válida hasta" className="col-span-2" hint="Opcional.">
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notas" className="col-span-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Pidió descuento por 3 unidades" className={textareaCls} />
          </Field>
        </Section>
      </form>
    </Drawer>
  )
}
