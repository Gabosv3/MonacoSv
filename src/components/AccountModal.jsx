import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../admin/AuthContext'
import { authReturnError, clearAuthReturnError, googleEnabled } from '../lib/authProviders'
import { useSettings, useLogo } from '../settings'
import { INK, AMBER, display, mono } from './dv-ui'

const AccountContext = createContext({ openAccount: () => {} })
export const useAccount = () => useContext(AccountContext)

const field =
  'w-full h-12 rounded-none border border-[#141414]/25 bg-white px-4 text-[15px] text-[#141414] outline-none transition-colors placeholder:text-[#78716C] focus:border-[#141414] focus:ring-4 focus:ring-slate-900/5'

function friendly(err) {
  const msg = String(err?.message ?? '').toLowerCase()
  if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('email not confirmed')) return 'Falta confirmar tu correo. Revisa tu bandeja de entrada.'
  if (msg.includes('rate limit') || msg.includes('too many') || err?.status === 429) return 'Demasiados intentos. Espera unos minutos.'
  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider')) return 'El acceso con Google todavía no está activado. Usa tu correo por ahora.'
  if (msg.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('fetch') || msg.includes('network')) return 'No se pudo conectar. Revisa tu internet.'
  return err?.message || 'Algo salió mal. Inténtalo de nuevo.'
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
)

function AccountModal({ open, initialTab, next, message, onClose }) {
  const navigate = useNavigate()
  const { login, signUpCustomer, signInWithGoogle, requestPasswordReset, session } = useAuth()
  const { cfg } = useSettings()
  const logoImg = useLogo()
  const [tab, setTab] = useState(initialTab)
  const [forgot, setForgot] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  // Google solo se ofrece si está activado en Supabase (si no, el botón llevaría a una página de error)
  const [googleOn, setGoogleOn] = useState(true)
  useEffect(() => {
    googleEnabled().then(setGoogleOn)
  }, [])

  useEffect(() => {
    if (open) {
      setTab(initialTab)
      setForgot(false)
      setError(message || '') // por ejemplo, el aviso de un ingreso con Google que no se completó
      setNotice('')
    }
  }, [open, initialTab, message])

  // al iniciar sesión se cierra solo
  useEffect(() => {
    if (open && session) {
      onClose()
      if (next) navigate(next)
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const run = async (fn) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (forgot) {
      return run(async () => {
        await requestPasswordReset(email.trim(), '/cuenta/restablecer')
        setNotice('Si ese correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también el spam.')
      })
    }
    if (tab === 'login') return run(() => login(email.trim(), password))
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    return run(async () => {
      const { needsConfirmation } = await signUpCustomer({ email: email.trim(), password, fullName: name.trim(), next: next || '/cuenta' })
      if (needsConfirmation) setNotice(`Te enviamos un correo a ${email.trim()}. Confírmalo para activar tu cuenta y vuelve a iniciar sesión.`)
    })
  }

  const google = () => run(() => signInWithGoogle(next || '/cuenta'))

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-label="Tu cuenta" className="relative w-full sm:max-w-[440px] max-h-[100svh] overflow-y-auto rounded-t-none sm:rounded-none bg-white shadow-2xl p-6 sm:p-8">
        <button onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 w-9 h-9 flex items-center justify-center rounded-none text-2xl leading-none text-[#57534E] hover:bg-[#EDE8DF]">×</button>

        <div className="flex items-center gap-3">
          <img src={logoImg} alt="" className="w-10 h-10 object-contain rounded-none" />
          <span className="text-lg font-black tracking-tight" style={{ ...display, color: INK }}>{cfg.store_name.toUpperCase()}</span>
        </div>

        <h2 className="mt-6 text-2xl font-black leading-tight" style={{ ...display, color: INK }}>
          {forgot ? 'Recuperar acceso' : tab === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}
        </h2>
        <p className="mt-2 text-sm text-[#57534E]">
          {forgot ? 'Escribe tu correo y te enviamos un enlace.' : tab === 'login' ? 'Revisa tus pedidos y compra más rápido.' : 'Guarda tus datos, sigue tus pedidos y cotizaciones.'}
        </p>

        {!forgot && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-1 p-1 rounded-none bg-[#EDE8DF]" role="tablist">
              {[['login', 'Ingresar'], ['register', 'Crear cuenta']].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => {
                    setTab(key)
                    setError('')
                    setNotice('')
                  }}
                  className="h-10 rounded-none text-sm font-semibold transition-colors"
                  style={tab === key ? { backgroundColor: '#fff', color: INK, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' } : { color: '#64748b' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {googleOn ? (
              <>
                <button
                  type="button"
                  onClick={google}
                  disabled={busy}
                  className="mt-5 w-full h-12 flex items-center justify-center gap-3 rounded-none border border-[#141414]/25 bg-white text-sm font-semibold text-[#141414] hover:bg-[#F7F6F2] disabled:opacity-60 transition-colors"
                >
                  <GoogleIcon /> Continuar con Google
                </button>
                <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#78716C]" style={mono}>
                  <span className="flex-1 h-px bg-[#E2DCD0]" /> o con tu correo <span className="flex-1 h-px bg-[#E2DCD0]" />
                </div>
              </>
            ) : (
              <div className="mt-5" />
            )}
          </>
        )}

        <form onSubmit={submit} className={`space-y-4 ${forgot ? 'mt-6' : ''}`}>
          {!forgot && tab === 'register' && (
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Tu nombre" aria-label="Tu nombre" className={field} />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="Correo electrónico" aria-label="Correo electrónico" className={field} />
          {!forgot && (
            <div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  placeholder={tab === 'login' ? 'Contraseña' : 'Contraseña (mínimo 8 caracteres)'}
                  aria-label="Contraseña"
                  className={`${field} pr-20`}
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#57534E] hover:text-[#141414]">
                  {show ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              {tab === 'login' && (
                <button type="button" onClick={() => { setForgot(true); setError(''); setNotice('') }} className="mt-2 text-xs font-semibold text-[#57534E] underline hover:text-[#141414]">
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
          )}

          {error && <p role="alert" className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

          <button type="submit" disabled={busy} className="w-full h-12 rounded-none text-white text-[13px] font-bold uppercase tracking-[0.15em] hover:opacity-90 disabled:opacity-60 transition-opacity" style={{ backgroundColor: INK }}>
            {busy ? 'Un momento…' : forgot ? 'Enviar enlace' : tab === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
          </button>
        </form>

        {forgot && (
          <button onClick={() => { setForgot(false); setError(''); setNotice('') }} className="mt-5 text-sm text-[#57534E] hover:text-[#141414]">← Volver a ingresar</button>
        )}
        {!forgot && (
          <p className="mt-5 text-xs text-[#78716C] leading-relaxed">
            {tab === 'register' ? 'Al crear tu cuenta' : 'Al continuar'} aceptas nuestros{' '}
            <Link to="/terminos" onClick={onClose} className="underline underline-offset-2 hover:text-[#141414]">Términos</Link> y la{' '}
            <Link to="/privacidad" onClick={onClose} className="underline underline-offset-2 hover:text-[#141414]">Política de privacidad</Link>.{' '}
            {tab === 'register' && <span style={{ color: AMBER }}>Usamos tus datos para gestionar tus pedidos; no los vendemos.</span>}
          </p>
        )}
      </div>
    </div>
  )
}

// Un solo modal para toda la tienda: cualquier botón puede llamar a openAccount().
export function AccountProvider({ children }) {
  const [state, setState] = useState({ open: false, tab: 'login', next: null, message: '' })
  // openAccount('login', { next: '/checkout' }): al ingresar, sigue a esa página
  const openAccount = useCallback((tab = 'login', opts = {}) => setState({ open: true, tab, next: opts.next ?? null, message: opts.message ?? '' }), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])

  // Si Google devolvió un error al volver a la tienda (por ejemplo, cancelaron el ingreso), se explica
  // en el modal y se limpia la dirección, en vez de dejar al cliente en una página sin explicación.
  useEffect(() => {
    const message = authReturnError()
    if (!message) return
    clearAuthReturnError()
    openAccount('login', { message })
  }, [openAccount])

  return (
    <AccountContext.Provider value={{ openAccount }}>
      {children}
      <AccountModal open={state.open} initialTab={state.tab} next={state.next} message={state.message} onClose={close} />
    </AccountContext.Provider>
  )
}
