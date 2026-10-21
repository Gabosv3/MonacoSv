import { useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { createPurchase, listProducts, listPurchases } from '../api'
import { formatPrice } from '../../catalog'
import { useAuth } from '../AuthContext'
import { INK, mono } from '../../components/ui'
import { Alert, Btn, DataTable, Drawer, Field, Section, Stat, inputCls, textareaCls } from '../kit'

const EMPTY = { product_id: '', quantity: '', unit_cost: '', supplier: '', notes: '' }

const productLabel = (p) => `${p.name}${p.volume ? ` · ${p.volume}` : ''}`

export default function Purchases() {
  const { can } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [productFilter, setProductFilter] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listPurchases(), listProducts()])
      .then(([p, prods]) => {
        setPurchases(p)
        setProducts(prods)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // llega desde «+ Nuevo» del menú superior
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('nuevo') && products.length) {
      setParams({}, { replace: true })
      setForm({ ...EMPTY, product_id: products[0].id })
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const openCreate = () => {
    setForm({ ...EMPTY, product_id: products[0]?.id ?? '' })
    setOpen(true)
  }

  // al elegir producto sugiere su costo actual
  const pickProduct = (id) => {
    const p = products.find((x) => x.id === id)
    set({ product_id: id, unit_cost: form.unit_cost || (p?.cost ? String(p.cost) : '') })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id) return
    setSaving(true)
    setError('')
    try {
      await createPurchase({
        product_id: form.product_id,
        quantity: Number(form.quantity) || 0,
        unit_cost: Number(form.unit_cost) || 0,
        supplier: form.supplier,
        notes: form.notes,
      })
      setOpen(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const rows = useMemo(
    () => (productFilter ? purchases.filter((p) => p.product_id === productFilter) : purchases),
    [purchases, productFilter]
  )

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const monthPurchases = purchases.filter((p) => new Date(p.purchased_at) >= monthStart)
  const totalSpent = purchases.reduce((s, p) => s + Number(p.total), 0)
  const monthSpent = monthPurchases.reduce((s, p) => s + Number(p.total), 0)
  const units = purchases.reduce((s, p) => s + p.quantity, 0)
  const lineTotal = (Number(form.quantity) || 0) * (Number(form.unit_cost) || 0)

  const columns = [
    { key: 'purchased_at', header: 'Fecha', value: (p) => p.purchased_at, render: (p) => <span className="text-slate-600 whitespace-nowrap">{new Date(p.purchased_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</span> },
    { key: 'product', header: 'Producto', value: (p) => p.products?.name ?? '', render: (p) => <span className="font-semibold" style={{ color: INK }}>{p.products?.name ?? '—'}</span> },
    { key: 'quantity', header: 'Cantidad', value: (p) => p.quantity },
    { key: 'unit_cost', header: 'Costo unitario', hide: 'md', value: (p) => Number(p.unit_cost), render: (p) => <span style={mono}>{formatPrice(p.unit_cost)}</span> },
    { key: 'total', header: 'Total', value: (p) => Number(p.total), render: (p) => <span className="font-bold" style={mono}>{formatPrice(p.total)}</span> },
    { key: 'supplier', header: 'Proveedor', hide: 'sm', value: (p) => p.supplier, render: (p) => <span className="text-slate-600">{p.supplier || '—'}</span> },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat label="Compras registradas" value={purchases.length} />
        <Stat label="Unidades compradas" value={units} />
        <Stat label="Gasto del mes" value={formatPrice(monthSpent)} hint={`${monthPurchases.length} compras`} />
        <Stat label="Gasto total" value={formatPrice(totalSpent)} />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        initialSort={{ key: 'purchased_at', dir: 'desc' }}
        searchPlaceholder="Buscar producto o proveedor…"
        exportName="compras"
        empty="Todavía no hay compras registradas."
        toolbar={
          <>
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} aria-label="Filtrar por producto" className="h-9 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-slate-600 max-w-[200px]">
              <option value="">Todos los productos</option>
              {products.map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}
            </select>
            {can('purchases.create') && <Btn onClick={openCreate} disabled={!products.length} className="sm:ml-auto h-10">+ Registrar compra</Btn>}
          </>
        }
      />

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar compra"
        subtitle="Al guardar, el stock del producto aumenta automáticamente."
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Btn>
            <Btn type="submit" form="purchase-form" disabled={saving}>{saving ? 'Guardando…' : 'Registrar compra'}</Btn>
          </>
        }
      >
        <form id="purchase-form" onSubmit={handleSubmit}>
          <Section title="Compra">
            <Field label="Producto" className="col-span-2">
              <select required value={form.product_id} onChange={(e) => pickProduct(e.target.value)} className={inputCls}>
                {products.map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}
              </select>
            </Field>
            <Field label="Cantidad">
              <input required type="number" min="1" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Costo unitario (USD)">
              <input required type="number" step="0.01" min="0" value={form.unit_cost} onChange={(e) => set({ unit_cost: e.target.value })} className={inputCls} />
            </Field>
            <div className="col-span-2 flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-3 text-sm">
              <span className="text-slate-500">Total de la compra</span>
              <strong className="text-lg" style={mono}>{formatPrice(lineTotal)}</strong>
            </div>
          </Section>
          <Section title="Detalles">
            <Field label="Proveedor" className="col-span-2">
              <input value={form.supplier} onChange={(e) => set({ supplier: e.target.value })} placeholder="Opcional" className={inputCls} />
            </Field>
            <Field label="Notas" className="col-span-2">
              <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Opcional" className={textareaCls} />
            </Field>
          </Section>
        </form>
      </Drawer>
    </div>
  )
}
