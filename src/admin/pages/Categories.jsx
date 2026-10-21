import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../api'
import { useAuth } from '../AuthContext'
import { INK } from '../../components/ui'
import {
  Alert, Badge, Btn, ConfirmDialog, DataTable, Drawer, Field, IconBtn, PencilIcon, Section, Switch, TrashIcon, inputCls, textareaCls,
} from '../kit'

const EMPTY = { id: null, name: '', gender: 'hombre', description: '', active: true, sort: 0 }

const GENDERS = {
  hombre: { label: 'Para él', tone: 'blue' },
  mujer: { label: 'Para ella', tone: 'amber' },
  unisex: { label: 'Unisex', tone: 'neutral' },
}

// PostgREST tarda en enterarse de las tablas nuevas; este mensaje explica qué hacer.
const friendly = (e) =>
  /schema cache|does not exist/i.test(e.message)
    ? "Falta crear la tabla de categorías. Ejecuta supabase/categories.sql en el SQL Editor de Supabase y recarga."
    : e.message

export default function Categories() {
  const { can } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [previousName, setPreviousName] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    listCategories()
      .then(setCategories)
      .catch((e) => setError(friendly(e)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const openCreate = () => {
    setForm({ ...EMPTY, sort: categories.length + 1 })
    setPreviousName('')
    setOpen(true)
  }

  const openEdit = (c) => {
    setForm({ id: c.id, name: c.name, gender: c.gender, description: c.description, active: c.active, sort: c.sort })
    setPreviousName(c.name)
    setOpen(true)
  }

  // llega desde «+ Nuevo» del menú superior
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('nuevo')) {
      setParams({}, { replace: true })
      setForm(EMPTY)
      setPreviousName('')
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { name: form.name.trim(), gender: form.gender, description: form.description, active: form.active, sort: Number(form.sort) || 0 }
    try {
      if (form.id) await updateCategory(form.id, payload, previousName)
      else await createCategory(payload)
      setOpen(false)
      load()
    } catch (err) {
      setError(/duplicate|unique/i.test(err.message) ? 'Ya existe una categoría con ese nombre.' : friendly(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c) => {
    setCategories((list) => list.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)))
    try {
      await updateCategory(c.id, { active: !c.active })
    } catch (err) {
      setError(friendly(err))
      load()
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteCategory(toDelete.id)
      setToDelete(null)
      load()
    } catch (err) {
      setError(friendly(err))
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Categoría',
      value: (c) => c.name,
      render: (c) => (
        <span className="block min-w-[180px]">
          <strong style={{ color: INK }}>{c.name}</strong>
          {c.description && <span className="block text-xs text-slate-500 mt-0.5">{c.description}</span>}
        </span>
      ),
    },
    { key: 'gender', header: 'Para', value: (c) => GENDERS[c.gender].label, render: (c) => <Badge tone={GENDERS[c.gender].tone}>{GENDERS[c.gender].label}</Badge> },
    { key: 'product_count', header: 'Productos', value: (c) => c.product_count, render: (c) => <span className="text-slate-600">{c.product_count}</span> },
    { key: 'sort', header: 'Orden', hide: 'md', value: (c) => c.sort, render: (c) => <span className="text-slate-500">{c.sort}</span> },
    {
      key: 'active',
      header: 'Activa',
      value: (c) => (c.active ? 'Activa' : 'Inactiva'),
      stop: true,
      render: (c) => <Switch checked={c.active} onChange={() => can('categories.edit') && toggleActive(c)} label={`Activar ${c.name}`} />,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (c) => (
        <span className="inline-flex">
          {can('categories.edit') && <IconBtn title="Editar" onClick={() => openEdit(c)}><PencilIcon /></IconBtn>}
          {can('categories.delete') && <IconBtn title="Eliminar" danger onClick={() => setToDelete(c)}><TrashIcon /></IconBtn>}
        </span>
      ),
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={categories}
        loading={loading}
        initialSort={{ key: 'sort', dir: 'asc' }}
        searchPlaceholder="Buscar categoría…"
        empty="Todavía no hay categorías. Crea la primera."
        toolbar={can('categories.create') && <Btn onClick={openCreate} className="sm:ml-auto h-10">+ Nueva categoría</Btn>}
      />

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Editar categoría' : 'Nueva categoría'}
        subtitle="Organiza el catálogo y decide en qué sección de la tienda aparece."
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Btn>
            <Btn type="submit" form="category-form" disabled={saving}>{saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear categoría'}</Btn>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit}>
          <Section title="Categoría">
            <Field label="Nombre" className="col-span-2" hint={form.id && previousName !== form.name.trim() ? 'Al guardar, los productos de esta categoría se pasan al nombre nuevo.' : undefined}>
              <input required value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Bestias Árabes" className={inputCls} />
            </Field>
            <Field label="Para" className="col-span-2" hint="«Para ella» manda sus productos a la línea de mujer de la tienda.">
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(GENDERS).map(([key, g]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set({ gender: key })}
                    className="h-11 rounded-xl border text-sm font-semibold transition-colors"
                    style={form.gender === key ? { backgroundColor: INK, borderColor: INK, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#d4d4d8', color: '#475569' }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Descripción" className="col-span-2">
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Opcional" className={textareaCls} />
            </Field>
            <Field label="Orden" hint="Menor número, aparece primero.">
              <input type="number" value={form.sort} onChange={(e) => set({ sort: e.target.value })} className={inputCls} />
            </Field>
            <div className="flex items-center justify-between gap-4 self-center">
              <p className="text-sm font-semibold" style={{ color: INK }}>Activa</p>
              <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Activa" />
            </div>
          </Section>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar categoría?"
        message={
          toDelete
            ? toDelete.product_count
              ? `“${toDelete.name}” tiene ${toDelete.product_count} producto(s). Al eliminarla, esos productos conservan el texto de su categoría pero ya no estará en esta lista. Si solo quieres quitarla de la tienda, mejor desactívala.`
              : `Se eliminará la categoría “${toDelete.name}”.`
            : ''
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
