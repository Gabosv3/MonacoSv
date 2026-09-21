import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/compras', label: 'Compras' },
  { to: '/admin/ventas', label: 'Ventas' },
  { to: '/admin/descuentos', label: 'Descuentos' },
  { to: '/admin/cupones', label: 'Cupones' },
]

export default function AdminLayout() {
  const { logout, session } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-100 flex text-neutral-900">
      <aside className="w-56 flex-shrink-0 bg-[#0a0a0a] text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-extrabold tracking-tight">MonacoSV</p>
          <p className="text-[11px] text-neutral-400 uppercase tracking-widest">Admin</p>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-5 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white font-semibold' : 'text-neutral-400 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[11px] text-neutral-500 truncate mb-2">{session?.user?.email}</p>
          <button
            onClick={logout}
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 sm:p-8">
        <Outlet />
      </main>
    </div>
  )
}
