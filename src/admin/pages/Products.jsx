import { useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { createProduct, deleteProduct, listCategories, listProducts, setFragranceFields, setImageForName, updateProduct } from '../api'
import ImageUpload from '../ImageUpload'
import { formatPrice } from '../../catalog'
import { useAuth } from '../AuthContext'
import { INK, mono } from '../../components/ui'
import {
  Alert, Badge, Btn, Chip, ConfirmDialog, DataTable, Drawer, Field, IconBtn, PencilIcon, Section, Stat, Switch, TagInput, TrashIcon,
  inputCls, textareaCls,
} from '../kit'

const EMPTY = {
  name: '',
  category: '',
  description: '',
  brand: '',
  kind: '',
  fixation: '',
  highlight: '',
  code: '',
  price: '',
  sale_price: '',
  tags: [],
  cost: '',
  volume: '',
  color: '#141414',
  image_url: '',
  stock: '',
  min_stock: '5',
  active: true,
}

const stockState = (p) => (p.stock <= 0 ? 'out' : p.stock <= p.min_stock ? 'low' : 'ok')

export default function Products() {
  const { can } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([]) // tabla categories (puede no existir aún)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importing, setImporting] = useState('') // texto de avance mientras se importa
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [applyAll, setApplyAll] = useState(true) // misma foto para las otras presentaciones
  const [originalImage, setOriginalImage] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('todos') // todos | activos | ocultos | bajo
  const [categoryFilter, setCategoryFilter] = useState('')

  // categorías ya usadas, para sugerirlas al escribir una nueva (así se van
  // "creando" categorías sin necesitar una tabla aparte)
  const categoryOptions = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  )

  const load = () => {
    setLoading(true)
    listCategories().then(setCategories).catch(() => setCategories([]))
    listProducts()
      .then(setProducts)
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

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const openCreate = () => {
    setEditingId(null)
    setOriginalImage('')
    setApplyAll(true)
    setForm(EMPTY)
    setOpen(true)
  }

  const openEdit = (p) => {
    setEditingId(p.id)
    setOriginalImage(p.image_url || '')
    setApplyAll(true)
    setForm({
      name: p.name,
      category: p.category,
      description: p.description,
      brand: p.brand ?? '',
      kind: p.kind ?? '',
      fixation: p.fixation ?? '',
      highlight: p.highlight ?? '',
      code: p.code ?? '',
      price: p.price,
      sale_price: p.sale_price ?? '',
      tags: p.tags ?? [],
      cost: p.cost,
      volume: p.volume,
      color: p.color,
      image_url: p.image_url || '',
      stock: p.stock,
      min_stock: p.min_stock,
      active: p.active,
    })
    setOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const price = Number(form.price) || 0
    const sale = form.sale_price === '' ? null : Number(form.sale_price)
    if (sale !== null && (!(sale >= 0) || sale >= price)) {
      setError('El precio con descuento debe ser menor que el precio de venta.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      sale_price: sale,
      tags: form.tags,
      image_url: form.image_url.trim() || null,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0,
    }
    try {
      if (editingId) await updateProduct(editingId, payload)
      else await createProduct(payload)
      // la foto nueva también se aplica a las demás presentaciones del producto
      if (siblings.length) {
        await setFragranceFields(payload.name, {
          brand: form.brand.trim(), kind: form.kind.trim(), fixation: form.fixation.trim(),
          highlight: form.highlight.trim(), code: form.code.trim(),
        })
      }
      if (applyAll && payload.image_url && payload.image_url !== originalImage && siblings.length) {
        await setImageForName(payload.name, payload.image_url)
      }
      setOpen(false)
      load()
    } catch (err) {
      setError(/column|schema cache/i.test(err.message) ? 'Falta actualizar la base de datos. Ejecuta supabase/product_fields.sql y supabase/accounts_and_settings.sql en el SQL Editor de Supabase y recarga.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  // Carga a la base de datos las cinco fragancias con las que arrancó la tienda
  const importInitial = async () => {
    setError('')
    setNotice('')
    setImporting('Preparando…')
    try {
      const { importInitialCatalog } = await import('../seedCatalog.js')
      const { created, skipped } = await importInitialCatalog(products, setImporting)
      setNotice(
        created
          ? `Listo: se cargaron ${created} presentaciones${skipped ? ` (${skipped} ya existían)` : ''} con sus fotos. Ajusta precios y stock a los reales.`
          : 'Esas fragancias ya estaban en el catálogo; no se cambió nada.'
      )
      load()
    } catch (err) {
      setError(
        /column|schema cache/i.test(err.message)
          ? 'Falta actualizar la base de datos. Ejecuta supabase/product_fields.sql y supabase/accounts_and_settings.sql en el SQL Editor de Supabase y vuelve a intentarlo.'
          : err.message
      )
      load()
    } finally {
      setImporting('')
    }
  }

  const toggleActive = async (p) => {
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
    try {
      await updateProduct(p.id, { active: !p.active })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteProduct(toDelete.id)
      setToDelete(null)
      load()
    } catch (err) {
      setError(err.message)
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const rows = useMemo(
    () =>
      products.filter((p) => {
        if (statusFilter === 'activos' && !p.active) return false
        if (statusFilter === 'ocultos' && p.active) return false
        if (statusFilter === 'bajo' && stockState(p) === 'ok') return false
        if (categoryFilter && p.category !== categoryFilter) return false
        return true
      }),
    [products, statusFilter, categoryFilter]
  )

  const lowCount = products.filter((p) => stockState(p) !== 'ok').length
  const inventory = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0)
  const siblings = products.filter((p) => p.name === form.name.trim() && p.id !== editingId)
  const effective = form.sale_price !== '' && Number(form.sale_price) < Number(form.price) ? Number(form.sale_price) : Number(form.price)
  const margin = form.price && form.cost ? effective - Number(form.cost) : null
  const salePct = form.sale_price !== '' && Number(form.price) > 0 && Number(form.sale_price) < Number(form.price)
    ? Math.round((1 - Number(form.sale_price) / Number(form.price)) * 100)
    : null
  const allBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort()
  const allTags = [...new Set(products.flatMap((p) => p.tags ?? []))].sort()

  const columns = [
    {
      key: 'name',
      header: 'Producto',
      value: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <span className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: `${p.color}22` }}>
            {p.image_url ? (
              <img src={p.image_url} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            ) : (
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold truncate" style={{ color: INK }}>{p.name}</span>
            <span className="block text-xs text-slate-500">{p.volume || 'Sin volumen'}</span>
            {(p.tags ?? []).length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1">
                {p.tags.slice(0, 3).map((t) => <span key={t} className="px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-semibold text-amber-800">{t}</span>)}
                {p.tags.length > 3 && <span className="text-[10px] text-slate-400">+{p.tags.length - 3}</span>}
              </span>
            )}
          </span>
        </div>
      ),
    },
    { key: 'category', header: 'Categoría', hide: 'md', value: (p) => p.category, render: (p) => (p.category ? <Badge>{p.category}</Badge> : <span className="text-slate-400">—</span>) },
    {
      key: 'price',
      header: 'Precio',
      value: (p) => Number(p.price),
      render: (p) =>
        p.sale_price != null && Number(p.sale_price) < Number(p.price) ? (
          <span className="inline-flex flex-col leading-tight">
            <span className="font-bold" style={{ ...mono, color: '#c2610c' }}>{formatPrice(p.sale_price)}</span>
            <span className="text-xs text-slate-400 line-through" style={mono}>{formatPrice(p.price)}</span>
          </span>
        ) : (
          <span className="font-bold" style={mono}>{formatPrice(p.price)}</span>
        ),
    },
    { key: 'cost', header: 'Costo', hide: 'lg', value: (p) => Number(p.cost), render: (p) => <span className="text-slate-500" style={mono}>{formatPrice(p.cost)}</span> },
    {
      key: 'stock',
      header: 'Stock',
      value: (p) => p.stock,
      render: (p) => {
        const s = stockState(p)
        return (
          <span className="inline-flex items-center gap-2">
            <strong style={{ color: INK }}>{p.stock}</strong>
            {s === 'out' && <Badge tone="red">Agotado</Badge>}
            {s === 'low' && <Badge tone="amber">Bajo</Badge>}
          </span>
        )
      },
    },
    {
      key: 'active',
      header: 'En tienda',
      value: (p) => (p.active ? 'Visible' : 'Oculto'),
      stop: true,
      render: (p) => <Switch checked={p.active} onChange={() => can('products.edit') && toggleActive(p)} label={`Mostrar ${p.name} en la tienda`} />,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (p) => (
        <span className="inline-flex items-center">
          {can('products.edit') && <IconBtn title="Editar" onClick={() => openEdit(p)}><PencilIcon /></IconBtn>}
          {can('products.delete') && <IconBtn title="Eliminar" danger onClick={() => setToDelete(p)}><TrashIcon /></IconBtn>}
        </span>
      ),
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert kind="ok" onClose={() => setNotice('')}>{notice}</Alert>}

      {!loading && products.length <= 1 && can('products.create') && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-bold" style={{ color: INK }}>Tu catálogo está casi vacío</p>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              Puedes cargar las 5 fragancias con las que arrancó la tienda (9PM, Khamrah Qahwa, Asad Zanzibar, Asad Elixir y Mandarin Sky) en 10 ml y 100 ml, con sus fotos, fichas y precios de ejemplo. Después las editas como cualquier producto.
            </p>
          </div>
          <Btn onClick={importInitial} disabled={!!importing}>{importing || 'Cargar fragancias iniciales'}</Btn>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat label="Productos" value={products.length} hint={`${products.filter((p) => p.active).length} visibles en la tienda`} />
        <Stat label="Stock bajo" value={lowCount} hint={lowCount ? 'Necesitan reposición' : 'Todo en orden'} />
        <Stat label="Categorías" value={categoryOptions.length} />
        <Stat label="Valor del inventario" value={formatPrice(inventory)} hint="A precio de venta" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        initialSort={{ key: 'name', dir: 'asc' }}
        searchPlaceholder="Buscar producto o categoría…"
        exportName="productos"
        empty="Todavía no hay productos. Crea el primero."
        toolbar={
          <>
            <div className="flex flex-wrap gap-2">
              <Chip active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')}>Todos</Chip>
              <Chip active={statusFilter === 'activos'} onClick={() => setStatusFilter('activos')}>Visibles</Chip>
              <Chip active={statusFilter === 'ocultos'} onClick={() => setStatusFilter('ocultos')}>Ocultos</Chip>
              <Chip active={statusFilter === 'bajo'} onClick={() => setStatusFilter('bajo')}>Stock bajo{lowCount ? ` (${lowCount})` : ''}</Chip>
            </div>
            {categoryOptions.length > 1 && (
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filtrar por categoría" className="h-9 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-slate-600">
                <option value="">Todas las categorías</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {can('products.create') && (
              <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <Btn kind="secondary" onClick={importInitial} disabled={!!importing} className="h-10">{importing || 'Cargar fragancias iniciales'}</Btn>
                <Btn onClick={openCreate} className="h-10">+ Nuevo producto</Btn>
              </span>
            )}
          </>
        }
      />

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Editar producto' : 'Nuevo producto'}
        subtitle="Una fila por presentación: repite el nombre y cambia el volumen (10 ml, 100 ml)."
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Btn>
            <Btn type="submit" form="product-form" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear producto'}</Btn>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit}>
          <Section title="Información">
            <Field label="Nombre" className="col-span-2">
              <input required value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Khamrah Qahwa" className={inputCls} />
            </Field>
            <Field
              label="Categoría"
              className="col-span-2 sm:col-span-1"
              hint={
                categories.length
                  ? (categories.find((c) => c.name === form.category)?.gender === 'mujer' ? 'Se mostrará en la línea «Para ella».' : 'Se administran en la sección Categorías.')
                  : 'Escribe «Para mujer» para la línea de ella.'
              }
            >
              {categories.length ? (
                <select value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>
                  <option value="">Sin categoría</option>
                  {/* conserva una categoría antigua que ya no esté en la lista */}
                  {form.category && !categories.some((c) => c.name === form.category) && <option value={form.category}>{form.category}</option>}
                  {categories.filter((c) => c.active || c.name === form.category).map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input list="category-options" value={form.category} onChange={(e) => set({ category: e.target.value })} placeholder="Bestias Árabes" className={inputCls} />
                  <datalist id="category-options">
                    {[...new Set([...categoryOptions, 'Para mujer'])].map((c) => <option key={c} value={c} />)}
                  </datalist>
                </>
              )}
            </Field>
            <Field label="Volumen" className="col-span-2 sm:col-span-1" hint="Ej. 10 ml o 100 ml.">
              <input value={form.volume} onChange={(e) => set({ volume: e.target.value })} placeholder="10 ml" className={inputCls} />
            </Field>
            <Field label="Descripción" className="col-span-2">
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Notas, sensación, ocasión ideal…" className={textareaCls} />
            </Field>
          </Section>

          <Section title="Ficha de la fragancia">
            <p className="col-span-2 -mt-1 text-xs text-slate-400">Se muestra en la tienda y se aplica a todas las presentaciones de «{form.name.trim() || 'este producto'}».</p>
            <Field label="Casa o marca">
              <input list="brand-options" value={form.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Ej. Lattafa" className={inputCls} />
              <datalist id="brand-options">{allBrands.map((b) => <option key={b} value={b} />)}</datalist>
            </Field>
            <Field label="Tipo">
              <input list="kind-options" value={form.kind} onChange={(e) => set({ kind: e.target.value })} placeholder="Eau de parfum" className={inputCls} />
              <datalist id="kind-options">{['Eau de parfum', 'Extrait de parfum', 'Eau de toilette', 'Parfum', 'Eau de cologne'].map((k) => <option key={k} value={k} />)}</datalist>
            </Field>
            <Field label="Fijación en piel">
              <input value={form.fixation} onChange={(e) => set({ fixation: e.target.value })} placeholder="12+ horas" className={inputCls} />
            </Field>
            <Field label="Código">
              <input value={form.code} onChange={(e) => set({ code: e.target.value })} placeholder="LT-KHQ" className={inputCls} />
            </Field>
            <Field label="Etiqueta destacada" className="col-span-2" hint="La frase que aparece sobre la foto. Ej. Bestia de fiestas & noche.">
              <input value={form.highlight} onChange={(e) => set({ highlight: e.target.value })} placeholder="Bestia de fiestas & noche" className={inputCls} />
            </Field>
          </Section>

          <Section title="Etiquetas">
            <div className="col-span-2">
              <TagInput value={form.tags} onChange={(tags) => set({ tags })} suggestions={allTags} placeholder="Ej. Vainilla, Canela, Fiestas, Invierno…" />
              <p className="mt-2 text-xs text-slate-400">Se muestran en la tienda y sirven para filtrar. Usa notas olfativas, ocasión o estilo.</p>
            </div>
          </Section>

          <Section title="Precio e inventario">
            <Field label="Precio de venta (USD)">
              <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => set({ price: e.target.value })} className={inputCls} />
            </Field>
            <Field
              label="Precio con descuento (USD)"
              hint={salePct !== null ? `${salePct}% de descuento · la tienda tacha el precio normal.` : 'Opcional. Déjalo vacío si no hay oferta.'}
            >
              <input type="number" step="0.01" min="0" value={form.sale_price} onChange={(e) => set({ sale_price: e.target.value })} placeholder="Sin descuento" className={inputCls} />
            </Field>
            <Field label="Costo (USD)" hint={margin !== null ? `Ganancia por unidad: ${formatPrice(margin)}` : undefined}>
              <input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set({ cost: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Stock">
              <input required type="number" min="0" value={form.stock} onChange={(e) => set({ stock: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Stock mínimo" hint="Avisa cuando baje de aquí.">
              <input type="number" min="0" value={form.min_stock} onChange={(e) => set({ min_stock: e.target.value })} className={inputCls} />
            </Field>
          </Section>

          <Section title="Imagen">
            <ImageUpload value={form.image_url} onChange={(url) => set({ image_url: url })} color={form.color} />
            {siblings.length > 0 && form.image_url && form.image_url !== originalImage && (
              <label className="col-span-2 flex items-start gap-3 rounded-xl bg-neutral-100 px-4 py-3 text-sm cursor-pointer">
                <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0f1a2e]" />
                <span>
                  <strong style={{ color: INK }}>Usar esta foto en las otras presentaciones</strong>
                  <span className="block text-xs text-slate-500">Hay {siblings.length} más de “{form.name.trim()}” ({siblings.map((p) => p.volume).filter(Boolean).join(', ')}).</span>
                </span>
              </label>
            )}
            <Field label="Color de respaldo" hint="Se usa si el producto no tiene foto.">
              <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} className="w-14 h-11 rounded-xl border border-neutral-300 bg-white p-1 cursor-pointer" />
            </Field>
          </Section>

          <Section title="Visibilidad">
            <div className="col-span-2 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: INK }}>Visible en la tienda</p>
                <p className="text-xs text-slate-500">Si lo ocultas, deja de mostrarse pero no se borra.</p>
              </div>
              <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Visible en la tienda" />
            </div>
          </Section>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar producto?"
        message={toDelete ? `Se eliminará “${toDelete.name}${toDelete.volume ? ` · ${toDelete.volume}` : ''}”. Esta acción no se puede deshacer. Si solo quieres quitarlo de la tienda, mejor ocúltalo.` : ''}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
