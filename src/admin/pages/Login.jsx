import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import AuthShell, { Alert, Label, field, primaryBtn, INK } from '../AuthShell'

// Traduce los errores de Supabase a mensajes claros.
function friendlyError(err, fallback) {
  const msg = String(err?.message ?? '').toLowerCase()
  if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('email not confirmed')) return 'Tu correo todavía no está confirmado.'
  if (msg.includes('rate limit') || msg.includes('too many') || err?.status === 429)
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  if (msg.includes('fetch') || msg.includes('network')) return 'No se pudo conectar. Revisa tu internet.'
  return fallback
}

export default function Login() {
  const { session, login, requestPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/admin" replace />

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setSent(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError(friendlyError(err, 'No se pudo iniciar sesión.'))
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(friendlyError(err, 'No se pudo enviar el correo. Inténtalo de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'forgot') {
    return (
      <AuthShell
        kicker="Recuperar acceso"
        title="¿Olvidaste tu contraseña?"
        subtitle="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva."
        footer={
          <button onClick={() => switchMode('login')} className="mt-8 inline-block text-sm text-slate-500 hover:text-slate-900">
            ← Volver a iniciar sesión
          </button>
        }
      >
        {sent ? (
          <div className="space-y-4">
            <Alert kind="ok">
              Si <strong>{email}</strong> tiene una cuenta, en unos minutos recibirás un correo con el enlace. Revisa también la carpeta de spam.
            </Alert>
            <button onClick={() => setSent(false)} className="text-sm text-slate-500 underline hover:text-slate-900">
              Usar otro correo o reenviar
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-5">
            <div>
              <Label htmlFor="email">Correo</Label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                autoFocus
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>
            {error && <Alert>{error}</Alert>}
            <button type="submit" disabled={loading} className={primaryBtn} style={{ backgroundColor: INK }}>
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
        )}
      </AuthShell>
    )
  }

  return (
    <AuthShell kicker="Acceso privado" title="Iniciar sesión" subtitle="Entra con tu cuenta de administrador.">
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <Label htmlFor="email">Correo</Label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="mb-2 text-[12px] font-semibold text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
            >
              ¿La olvidaste?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsOn(e.getModifierState?.('CapsLock') ?? false)}
              className={`${field} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          {capsOn && <p className="mt-2 text-xs font-semibold text-amber-700">Tienes activadas las mayúsculas.</p>}
        </div>

        {error && <Alert>{error}</Alert>}

        <button type="submit" disabled={loading} className={primaryBtn} style={{ backgroundColor: INK }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-xs text-slate-400 leading-relaxed">
        Acceso solo para el equipo de MonacoSV. Si no tienes cuenta, pídesela a quien administra la tienda.
      </p>
    </AuthShell>
  )
}
