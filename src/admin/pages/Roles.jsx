import { useEffect, useMemo, useState } from 'react'
import { deleteRole, listPermissions, listRoles, saveRole } from '../api'
import { useAuth } from '../AuthContext'
import { INK, AMBER, mono } from '../../components/ui'
import {
  Alert, Badge, Btn, ConfirmDialog, DataTable, Drawer, Field, IconBtn, PencilIcon, Section, TrashIcon, inputCls, textareaCls,
} from '../kit'

// PostgREST tarda en enterarse de las tablas nuevas; este mensaje explica qué hacer.
const friendly = (e) =>
  /schema cache/i.test(e.message)
    ? "Supabase todavía no ve las tablas nuevas. Ejecuta en el SQL Editor: NOTIFY pgrst, 'reload schema'; y recarga esta página."
    : e.message

const EMPTY = { id: null, name: '', label: '', description: '', permissions: [] }

const slug = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export default function Roles() {
  const { can, reloadAccess } = useAuth()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([listRoles(), listPermissions()])
      .then(([r, p]) => {
        setRoles(r)
        setPermissions(p)
      })
      .catch((e) => setError(friendly(e)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // permisos agrupados por módulo, para la matriz del formulario
  const modules = useMemo(() => {
    const map = new Map()
    permissions.forEach((p) => {
      if (!map.has(p.module)) map.set(p.module, [])
      map.get(p.module).push(p)
    })
    return [...map.entries()]
  }, [permissions])

  const readOnly = !!form.id && roles.find((r) => r.id === form.id)?.is_system
  const canSave = form.id ? can('roles.edit') : can('roles.create')

  const openCreate = () => {
    setForm(EMPTY)
    setOpen(true)
  }

  const openEdit = (r) => {
    setForm({ id: r.id, name: r.name, label: r.label, description: r.description, permissions: r.permissions })
    setOpen(true)
  }

  const togglePermission = (name) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(name) ? f.permissions.filter((p) => p !== name) : [...f.permissions, name],
    }))

  const toggleModule = (items, all) =>
    setForm((f) => {
      const names = items.map((i) => i.name)
      const rest = f.permissions.filter((p) => !names.includes(p))
      return { ...f, permissions: all ? rest : [...rest, ...names] }
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveRole({ ...form, name: form.id ? form.name : slug(form.label) })
      setOpen(false)
      load()
      reloadAccess() // por si se editó un rol del propio usuario
    } catch (err) {
      setError(/duplicate|unique/i.test(err.message) ? 'Ya existe un rol con ese nombre.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteRole(toDelete.id)
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
    {
      key: 'label',
      header: 'Rol',
      value: (r) => r.label,
      render: (r) => (
        <span className="block min-w-[180px]">
          <span className="flex items-center gap-2">
            <strong style={{ color: INK }}>{r.label}</strong>
            {r.is_system && <Badge tone="blue">Sistema</Badge>}
          </span>
          <span className="block text-xs text-slate-500 mt-0.5" style={mono}>{r.name}</span>
        </span>
      ),
    },
    { key: 'description', header: 'Descripción', hide: 'md', value: (r) => r.description, render: (r) => <span className="text-slate-600">{r.description || '—'}</span> },
    {
      key: 'permissions',
      header: 'Permisos',
      value: (r) => (r.is_system ? permissions.length : r.permissions.length),
      render: (r) => (
        <span className="block min-w-[120px]">
          <strong style={{ color: INK }}>{r.is_system ? permissions.length : r.permissions.length}</strong>
          <span className="text-slate-400"> / {permissions.length}</span>
          <span className="mt-1.5 block h-1.5 rounded-full bg-neutral-100">
            <span className="block h-full rounded-full" style={{ width: `${permissions.length ? ((r.is_system ? permissions.length : r.permissions.length) / permissions.length) * 100 : 0}%`, backgroundColor: AMBER }} />
          </span>
        </span>
      ),
    },
    { key: 'user_count', header: 'Usuarios', value: (r) => r.user_count, render: (r) => <span className="text-slate-600">{r.user_count}</span> },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (r) => (
        <span className="inline-flex">
          <IconBtn title={r.is_system ? 'Ver' : 'Editar'} onClick={() => openEdit(r)}><PencilIcon /></IconBtn>
          {!r.is_system && can('roles.delete') && <IconBtn title="Eliminar" danger onClick={() => setToDelete(r)}><TrashIcon /></IconBtn>}
        </span>
      ),
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={roles}
        loading={loading}
        initialSort={{ key: 'label', dir: 'asc' }}
        searchPlaceholder="Buscar rol…"
        empty="Todavía no hay roles."
        toolbar={can('roles.create') && <Btn onClick={openCreate} className="sm:ml-auto h-10">+ Nuevo rol</Btn>}
      />

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? (readOnly ? 'Rol del sistema' : 'Editar rol') : 'Nuevo rol'}
        subtitle={readOnly ? 'El Super Administrador tiene todos los permisos y no se puede modificar.' : 'Elige qué puede hacer cada persona que tenga este rol.'}
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setOpen(false)}>{readOnly ? 'Cerrar' : 'Cancelar'}</Btn>
            {!readOnly && canSave && (
              <Btn type="submit" form="role-form" disabled={saving}>{saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear rol'}</Btn>
            )}
          </>
        }
      >
        <form id="role-form" onSubmit={handleSubmit}>
          <Section title="Rol">
            <Field label="Nombre" className="col-span-2" hint={!form.id && form.label ? `Identificador: ${slug(form.label)}` : undefined}>
              <input required disabled={readOnly} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ej. Atención al cliente" className={inputCls} />
            </Field>
            <Field label="Descripción" className="col-span-2">
              <textarea disabled={readOnly} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="¿Para qué sirve este rol?" className={textareaCls} />
            </Field>
          </Section>

          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>
            Permisos ({readOnly ? permissions.length : form.permissions.length} de {permissions.length})
          </h3>
          <div className="space-y-3">
            {modules.map(([module, items]) => {
              const selected = readOnly ? items.length : items.filter((i) => form.permissions.includes(i.name)).length
              const all = selected === items.length
              return (
                <div key={module} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                    <p className="text-sm font-bold" style={{ color: INK }}>{module} <span className="font-normal text-slate-400">· {selected}/{items.length}</span></p>
                    {!readOnly && (
                      <button type="button" onClick={() => toggleModule(items, all)} className="text-xs font-semibold text-slate-500 underline hover:text-slate-900">
                        {all ? 'Quitar todos' : 'Marcar todos'}
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {items.map((p) => {
                      const checked = readOnly || form.permissions.includes(p.name)
                      return (
                        <label key={p.name} className={`flex items-center gap-3 px-4 py-3 text-sm ${readOnly ? '' : 'cursor-pointer hover:bg-neutral-50'}`}>
                          <input type="checkbox" checked={checked} disabled={readOnly} onChange={() => togglePermission(p.name)} className="w-4 h-4 accent-[#0f1a2e]" />
                          <span className="flex-1 text-slate-700">{p.label}</span>
                          <code className="text-[11px] text-slate-400" style={mono}>{p.name}</code>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar rol?"
        message={toDelete ? `Se eliminará el rol “${toDelete.label}”${toDelete.user_count ? ` y ${toDelete.user_count} usuario(s) lo perderán` : ''}. Esta acción no se puede deshacer.` : ''}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
