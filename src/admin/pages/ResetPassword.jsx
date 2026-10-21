import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import AuthShell, { Alert, Label, field, primaryBtn, INK, mono } from '../AuthShell'

// 0–4 según largo y variedad de caracteres
function strength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const LEVELS = [
  { label: 'Muy débil', color: '#ef4444' },
  { label: 'Débil', color: '#f97316' },
  { label: 'Aceptable', color: '#eab308' },
  { label: 'Buena', color: '#22c55e' },
  { label: 'Excelente', color: '#16a34a' },
]

export default function ResetPassword() {
  const { session, loading: authLoading, updatePassword, access } = useAuth()
  const isStaff = !!access && (access.legacy || access.super || (access.permissions ?? []).length > 0)
  const fromStore = window.location.pathname.startsWith('/cuenta')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const level = strength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    setSaving(true)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      const msg = String(err?.message ?? '').toLowerCase()
      setError(
        msg.includes('different from the old')
          ? 'La contraseña nueva debe ser distinta de la anterior.'
          : 'No se pudo cambiar la contraseña. Pide un enlace nuevo e inténtalo otra vez.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Esperando a que Supabase lea el enlace del correo
  if (authLoading) {
    return (
      <AuthShell kicker="Recuperar acceso" title="Un momento…">
        <p className="text-sm text-slate-500">Verificando tu enlace.</p>
      </AuthShell>
    )
  }

  // Sin sesión de recuperación: el enlace es inválido, ya se usó o venció
  if (!session) {
    return (
      <AuthShell
        kicker="Recuperar acceso"
        title="Enlace no válido"
        subtitle="Este enlace ya se usó o venció. Pide uno nuevo para crear tu contraseña."
        footer={<span />}
      >
        <Link to={fromStore ? '/' : '/admin/login'} className={primaryBtn} style={{ backgroundColor: INK }}>
          {fromStore ? 'Volver a la tienda' : 'Pedir un enlace nuevo'}
        </Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell kicker="Listo" title="Contraseña actualizada" subtitle={isStaff ? 'Ya puedes entrar al panel con tu contraseña nueva.' : 'Ya puedes entrar a tu cuenta con tu contraseña nueva.'} footer={<span />}>
        <button onClick={() => navigate(isStaff ? '/admin' : '/cuenta')} className={primaryBtn} style={{ backgroundColor: INK }}>
          {isStaff ? 'Ir al panel' : 'Ir a mi cuenta'}
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      kicker="Recuperar acceso"
      title="Nueva contraseña"
      subtitle="Elige una contraseña segura de al menos 8 caracteres."
      footer={<span />}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="new-password">Contraseña nueva</Label>
          <div className="relative">
            <input
              id="new-password"
              type={show ? 'text' : 'password'}
              required
              autoFocus
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
            >
              {show ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          {password && (
            <div className="mt-3">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-1.5 flex-1 rounded-full bg-neutral-200">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{ width: i < level ? '100%' : '0%', backgroundColor: LEVELS[level].color }}
                    />
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold" style={{ ...mono, color: LEVELS[level].color }}>{LEVELS[level].label}</p>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="confirm-password">Repite la contraseña</Label>
          <input
            id="confirm-password"
            type={show ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="Escríbela otra vez"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={field}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <button type="submit" disabled={saving} className={primaryBtn} style={{ backgroundColor: INK }}>
          {saving ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthShell>
  )
}
