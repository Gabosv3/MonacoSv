import { useEffect, useMemo, useState } from 'react'
import { createUserAccount, listRoles, listUsers, setUserRoles, updateProfile } from '../api'
import { useAuth } from '../AuthContext'
import { INK, AMBER, mono } from '../../components/ui'
import { Alert, Badge, Btn, Chip, DataTable, Drawer, Field, IconBtn, PencilIcon, Section, Stat, Switch, inputCls } from '../kit'

// PostgREST tarda en enterarse de las tablas nuevas; este mensaje explica qué hacer.
const friendly = (e) =>
  /schema cache/i.test(e.message)
    ? "Supabase todavía no ve las tablas nuevas. Ejecuta en el SQL Editor: NOTIFY pgrst, 'reload schema'; y recarga esta página."
    : e.message

const EMPTY = { id: null, email: '', full_name: '', password: '', role_ids: [], active: true }

const initials = (u) => (u.full_name || u.email || '?').trim().charAt(0).toUpperCase()

export default function Users() {
  const { can, session, requestPasswordReset, reloadAccess } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('todos') // todos | activos | inactivos | sin-rol
  const [showPassword, setShowPassword] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([listUsers(), listRoles()])
      .then(([u, r]) => {
        setUsers(u)
        setRoles(r)
      })
      .catch((e) => setError(friendly(e)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const me = session?.user?.id
  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles])
  const superRole = roles.find((r) => r.name === 'super-admin')
  const isEditing = !!form.id
  const canSave = isEditing ? can('users.edit') : can('users.create')

  const counts = {
    todos: users.length,
    activos: users.filter((u) => u.active).length,
    inactivos: users.filter((u) => !u.active).length,
    'sin-rol': users.filter((u) => u.role_ids.length === 0).length,
  }

  const rows = useMemo(
    () =>
      users.filter((u) => {
        if (filter === 'activos') return u.active
        if (filter === 'inactivos') return !u.active
        if (filter === 'sin-rol') return u.role_ids.length === 0
        return true
      }),
    [users, filter]
  )

  const openCreate = () => {
    setForm(EMPTY)
    setShowPassword(false)
    setOpen(true)
  }

  const openEdit = (u) => {
    setForm({ id: u.id, email: u.email ?? '', full_name: u.full_name, password: '', role_ids: u.role_ids, active: u.active })
    setOpen(true)
  }

  const toggleRole = (id) =>
    setForm((f) => ({ ...f, role_ids: f.role_ids.includes(id) ? f.role_ids.filter((r) => r !== id) : [...f.role_ids, id] }))

  // ¿se dejaría al sistema sin ningún super administrador activo?
  const wouldLeaveNoSuper = (userId, nextRoleIds, nextActive) => {
    if (!superRole) return false
    const others = users.filter((u) => u.id !== userId && u.active && u.role_ids.includes(superRole.id))
    const stillSuper = nextActive && nextRoleIds.includes(superRole.id)
    return !stillSuper && others.length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (isEditing && wouldLeaveNoSuper(form.id, form.role_ids, form.active)) {
      return setError('No puedes quitar al último Super Administrador activo: nadie podría administrar el sistema.')
    }
    if (!isEditing && form.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    setSaving(true)
    try {
      let userId = form.id
      if (!isEditing) {
        const created = await createUserAccount({ email: form.email.trim(), password: form.password, full_name: form.full_name.trim() })
        userId = created.id
        // el perfil lo crea un trigger; damos un instante a que exista
        await new Promise((r) => setTimeout(r, 600))
      }
      await updateProfile(userId, { full_name: form.full_name.trim(), active: form.active })
      await setUserRoles(userId, form.role_ids)
      setOpen(false)
      setNotice(isEditing ? 'Usuario actualizado.' : `Usuario creado. Si en Supabase está activada la confirmación por correo, ${form.email} debe confirmar su cuenta antes de entrar.`)
      load()
      if (userId === me) reloadAccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u) => {
    if (u.id === me) return setError('No puedes desactivar tu propia cuenta.')
    if (wouldLeaveNoSuper(u.id, u.role_ids, !u.active)) {
      return setError('No puedes desactivar al último Super Administrador.')
    }
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)))
    try {
      await updateProfile(u.id, { active: !u.active })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  const sendReset = async (u) => {
    setError('')
    try {
      await requestPasswordReset(u.email)
      setNotice(`Enviamos un enlace para cambiar la contraseña a ${u.email}.`)
    } catch (err) {
      setError(err.message)
    }
  }

  const columns = [
    {
      key: 'user',
      header: 'Usuario',
      value: (u) => `${u.full_name} ${u.email}`,
      render: (u) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: u.active ? AMBER : '#a1a1aa' }}>{initials(u)}</span>
          <span className="min-w-0">
            <span className="block font-semibold truncate" style={{ color: INK }}>
              {u.full_name || 'Sin nombre'}{u.id === me && <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">(tú)</span>}
            </span>
            <span className="block text-xs text-slate-500 truncate">{u.email}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      value: (u) => u.role_ids.map((id) => roleById[id]?.label).filter(Boolean).join(', '),
      render: (u) =>
        u.role_ids.length ? (
          <span className="flex flex-wrap gap-1.5">
            {u.role_ids.map((id) => roleById[id] && <Badge key={id} tone={roleById[id].name === 'super-admin' ? 'blue' : 'neutral'}>{roleById[id].label}</Badge>)}
          </span>
        ) : (
          <Badge tone="amber">Sin rol</Badge>
        ),
    },
    {
      key: 'created_at',
      header: 'Alta',
      hide: 'lg',
      value: (u) => u.created_at,
      render: (u) => <span className="text-slate-600">{new Date(u.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</span>,
    },
    {
      key: 'active',
      header: 'Activo',
      value: (u) => (u.active ? 'Activo' : 'Inactivo'),
      stop: true,
      render: (u) => <Switch checked={u.active} onChange={() => can('users.edit') && toggleActive(u)} label={`Activar a ${u.email}`} />,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (u) => (can('users.edit') ? <IconBtn title="Editar" onClick={() => openEdit(u)}><PencilIcon /></IconBtn> : null),
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert kind="ok" onClose={() => setNotice('')}>{notice}</Alert>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat label="Usuarios" value={counts.todos} />
        <Stat label="Activos" value={counts.activos} />
        <Stat label="Inactivos" value={counts.inactivos} />
        <Stat label="Sin rol" value={counts['sin-rol']} hint={counts['sin-rol'] ? 'No pueden entrar al panel' : undefined} />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        initialSort={{ key: 'user', dir: 'asc' }}
        searchPlaceholder="Buscar por nombre o correo…"
        exportName="usuarios"
        empty="Todavía no hay usuarios."
        toolbar={
          <>
            <div className="flex flex-wrap gap-2">
              {[['todos', 'Todos'], ['activos', 'Activos'], ['inactivos', 'Inactivos'], ['sin-rol', 'Sin rol']].map(([k, label]) => (
                <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{label} ({counts[k]})</Chip>
              ))}
            </div>
            {can('users.create') && <Btn onClick={openCreate} className="sm:ml-auto h-10">+ Nuevo usuario</Btn>}
          </>
        }
      />

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={isEditing ? 'Editar usuario' : 'Nuevo usuario'}
        subtitle={isEditing ? form.email : 'Crea la cuenta y elige qué roles tendrá.'}
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Btn>
            {canSave && <Btn type="submit" form="user-form" disabled={saving}>{saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear usuario'}</Btn>}
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit}>
          <Section title="Cuenta">
            <Field label="Nombre completo" className="col-span-2">
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ej. Ana Martínez" className={inputCls} />
            </Field>
            <Field label="Correo" className="col-span-2">
              <input required type="email" disabled={isEditing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="persona@correo.com" className={inputCls} />
            </Field>
            {!isEditing && (
              <Field label="Contraseña inicial" className="col-span-2" hint="Mínimo 8 caracteres. La persona podrá cambiarla con «¿La olvidaste?».">
                <div className="relative">
                  <input required type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${inputCls} pr-20`} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold uppercase text-slate-500 hover:text-slate-900">
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </Field>
            )}
            <div className="col-span-2 flex items-center justify-between gap-4 pt-1">
              <div>
                <p className="text-sm font-semibold" style={{ color: INK }}>Cuenta activa</p>
                <p className="text-xs text-slate-500">Si la desactivas, no podrá usar el panel.</p>
              </div>
              <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Cuenta activa" />
            </div>
          </Section>

          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>Roles</h3>
          <div className="space-y-2.5">
            {roles.map((r) => {
              const checked = form.role_ids.includes(r.id)
              const locked = r.name === 'super-admin' && !can('roles.edit') && !(users.find((u) => u.id === me)?.role_ids ?? []).includes(r.id)
              return (
                <label key={r.id} className={`flex items-start gap-3 rounded-2xl border bg-white p-4 transition-colors ${checked ? 'border-slate-900' : 'border-neutral-200'} ${locked ? 'opacity-50' : 'cursor-pointer hover:border-slate-400'}`}>
                  <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggleRole(r.id)} className="mt-1 w-4 h-4 accent-[#0f1a2e]" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold" style={{ color: INK }}>{r.label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{r.description || '—'}</span>
                    <span className="block text-[11px] text-slate-400 mt-1" style={mono}>{r.is_system ? 'Todos los permisos' : `${r.permissions.length} permisos`}</span>
                  </span>
                </label>
              )
            })}
          </div>

          {isEditing && form.email && (
            <div className="mt-7 rounded-2xl border border-neutral-200 bg-white p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: INK }}>Contraseña</p>
                <p className="text-xs text-slate-500">Le enviamos un enlace al correo para que cree una nueva.</p>
              </div>
              <Btn kind="secondary" size="sm" type="button" onClick={() => sendReset({ email: form.email })}>Enviar enlace</Btn>
            </div>
          )}
        </form>
      </Drawer>
    </div>
  )
}
