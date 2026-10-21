import { Link, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { INK, display } from '../components/ui'

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white text-sm">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export function NoAccess({ title = 'No tienes permiso para ver esta página', text }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center">
      <p className="text-5xl mb-4" aria-hidden>🔒</p>
      <h2 className="text-xl font-black uppercase" style={{ ...display, color: INK }}>{title}</h2>
      <p className="mt-3 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        {text ?? 'Pídele a un administrador que te asigne el rol o el permiso necesario.'}
      </p>
      <Link to="/admin" className="inline-block mt-6 px-5 py-3 rounded-xl text-white text-[12px] font-bold uppercase tracking-wider" style={{ backgroundColor: INK }}>
        Volver al inicio del panel
      </Link>
    </div>
  )
}

// Envuelve una página del panel: solo se muestra si el usuario tiene el permiso.
export function RequirePermission({ perm, children }) {
  const { can, accessLoading } = useAuth()
  if (accessLoading) return <p className="text-sm text-slate-400">Cargando permisos…</p>
  if (!can(perm)) return <NoAccess />
  return children
}
