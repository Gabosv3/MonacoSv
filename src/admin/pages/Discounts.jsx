import { useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { createDiscount, deleteDiscount, listDiscounts, listProducts, updateDiscount } from '../api'
import { INK } from '../../components/ui'
import { formatPrice } from '../../catalog'
import { useAuth } from '../AuthContext'
import {
  Alert, Badge, Btn, ConfirmDialog, DataTable, Drawer, Field, IconBtn, PencilIcon, Section, Switch, TrashIcon, inputCls,
} from '../kit'

const EMPTY = { name: '', type: 'percent', value: '', scope: 'all', scope_value: '', active: true }

const SCOPE_LABEL = { all: 'Todo el catálogo', category: 'Categoría', product: 'Producto' }

export default function Discounts() {
  const { can } = useAuth()
  const [discounts, setDiscounts] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([listDiscounts(), listProducts()])
      .then(([d, p]) => {
        setDiscounts(d)
        setProducts(p)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // llega desde «+ Nuevo» del menú superior
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('nuevo')) {
      setParams({}, { replace: true })
      setEditingId(null)
      setForm(EMPTY)
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products])
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const productName = (id) => {
    const p = products.find((x) => x.id === id)
    return p ? `${p.name}${p.volume ? ` · ${p.volume}` : ''}` : id
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY)
    setOpen(true)
  }

  const openEdit = (d) => {
    setEditingId(d.id)
    setForm({ name: d.name, type: d.type, value: d.value, scope: d.scope, scope_value: d.scope_value ?? '', active: d.active })
    setOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.scope !== 'all' && !form.scope_value) return setError('Elige a qué se aplica el descuento.')
    setSaving(true)
    setError('')
    const payload = { ...form, value: Number(form.value) || 0, scope_value: form.scope === 'all' ? null : form.scope_value }
    try {
      if (editingId) await updateDiscount(editingId, payload)
      else await createDiscount(payload)
      setOpen(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (d) => {
    setDiscounts((list) => list.map((x) => (x.id === d.id ? { ...x, active: !x.active } : x)))
    try {
      await updateDiscount(d.id, { active: !d.active })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteDiscount(toDelete.id)
      setToDelete(null)
      load()
    } catch (err) {
      setError(err.message)
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Nombre', value: (d) => d.name, render: (d) => <span className="font-semibold" style={{ color: INK }}>{d.name}</span> },
    {
      key: 'value',
      header: 'Descuento',
      value: (d) => Number(d.value),
      render: (d) => <Badge tone="amber">{d.type === 'percent' ? `${Number(d.value)}%` : formatPrice(d.value)} {d.type === 'percent' ? 'OFF' : 'de descuento'}</Badge>,
    },
    {
      key: 'scope',
      header: 'Aplica a',
      hide: 'sm',
      value: (d) => `${SCOPE_LABEL[d.scope]} ${d.scope === 'product' ? productName(d.scope_value) : d.scope_value ?? ''}`,
      render: (d) => (
        <span className="text-slate-600">
          {d.scope === 'all' ? SCOPE_LABEL.all : d.scope === 'category' ? <>Categoría: <strong>{d.scope_value}</strong></> : <>Producto: <strong>{productName(d.scope_value)}</strong></>}
        </span>
      ),
    },
    { key: 'active', header: 'Activo', value: (d) => (d.active ? 'Activo' : 'Inactivo'), stop: true, render: (d) => <Switch checked={d.active} onChange={() => can('discounts.edit') && toggleActive(d)} label={`Activar ${d.name}`} /> },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (d) => (
        <span className="inline-flex">
          {can('discounts.edit') && <IconBtn title="Editar" onClick={() => openEdit(d)}><PencilIcon /></IconBtn>}
          {can('discounts.delete') && <IconBtn title="Eliminar" danger onClick={() => setToDelete(d)}><TrashIcon /></IconBtn>}
        </span>
      ),
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={discounts}
        loading={loading}
        initialSort={{ key: 'name', dir: 'asc' }}
        searchPlaceholder="Buscar descuento…"
        empty="Todavía no hay descuentos. Crea el primero."
        toolbar={can('discounts.create') && <Btn onClick={openCreate} className="sm:ml-auto h-10">+ Nuevo descuento</Btn>}
      />

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Editar descuento' : 'Nuevo descuento'}
        subtitle="Se aplica automáticamente en la tienda mientras esté activo."
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Btn>
            <Btn type="submit" form="discount-form" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear descuento'}</Btn>
          </>
        }
      >
        <form id="discount-form" onSubmit={handleSubmit}>
          <Section title="Descuento">
            <Field label="Nombre" className="col-span-2">
              <input required value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Lanzamiento octubre" className={inputCls} />
            </Field>
            <Field label="Tipo">
              <select value={form.type} onChange={(e) => set({ type: e.target.value })} className={inputCls}>
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </Field>
            <Field label={form.type === 'percent' ? 'Porcentaje' : 'Monto (USD)'}>
              <input required type="number" step="0.01" min="0" max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={(e) => set({ value: e.target.value })} className={inputCls} />
            </Field>
          </Section>

          <Section title="Aplica a">
            <Field label="Alcance" className="col-span-2">
              <select value={form.scope} onChange={(e) => set({ scope: e.target.value, scope_value: '' })} className={inputCls}>
                <option value="all">Todo el catálogo</option>
                <option value="category">Una categoría</option>
                <option value="product">Un producto</option>
              </select>
            </Field>
            {form.scope === 'category' && (
              <Field label="Categoría" className="col-span-2">
                <select required value={form.scope_value} onChange={(e) => set({ scope_value: e.target.value })} className={inputCls}>
                  <option value="">Elige una categoría…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            )}
            {form.scope === 'product' && (
              <Field label="Producto" className="col-span-2">
                <select required value={form.scope_value} onChange={(e) => set({ scope_value: e.target.value })} className={inputCls}>
                  <option value="">Elige un producto…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.volume ? ` · ${p.volume}` : ''}</option>)}
                </select>
              </Field>
            )}
            <div className="col-span-2 flex items-center justify-between gap-4 pt-1">
              <p className="text-sm font-semibold" style={{ color: INK }}>Activo</p>
              <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Activo" />
            </div>
          </Section>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar descuento?"
        message={toDelete ? `Se eliminará “${toDelete.name}”. Los precios de la tienda volverán a la normalidad.` : ''}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
