import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Dashboard from './pages/Dashboard'

// Primera página del panel: el dashboard si el usuario puede verlo; si no, la
// primera sección a la que sí tenga acceso.
const FALLBACKS = [
  ['products.view', '/admin/productos'],
  ['categories.view', '/admin/categorias'],
  ['sales.view', '/admin/ventas'],
  ['customers.view', '/admin/clientes'],
  ['quotes.view', '/admin/cotizaciones'],
  ['shipments.view', '/admin/logistica'],
  ['purchases.view', '/admin/compras'],
  ['discounts.view', '/admin/descuentos'],
  ['coupons.view', '/admin/cupones'],
  ['users.view', '/admin/usuarios'],
  ['roles.view', '/admin/roles'],
  ['settings.view', '/admin/ajustes'],
]

export default function AdminHome() {
  const { can, accessLoading } = useAuth()
  if (accessLoading) return <p className="text-sm text-slate-400">Cargando…</p>
  if (can('dashboard.view')) return <Dashboard />
  const next = FALLBACKS.find(([perm]) => can(perm))
  return next ? <Navigate to={next[1]} replace /> : null
}
