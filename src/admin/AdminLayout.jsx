import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { listProducts, listSales } from './api'
import { NoAccess } from './RequireAuth'
import logoImg from '../assets/logo.webp'
import { Icon, ICONS, INK, AMBER, display, mono } from '../components/ui'

const NAV = [
  { group: 'General', items: [{ to: '/admin', label: 'Dashboard', icon: ICONS.grid, end: true, perm: 'dashboard.view' }] },
  {
    group: 'Catálogo',
    items: [
      { to: '/admin/productos', label: 'Productos', icon: ICONS.box, perm: 'products.view' },
      { to: '/admin/categorias', label: 'Categorías', icon: ICONS.tag, perm: 'categories.view' },
      { to: '/admin/destacados', label: 'Destacados', icon: ICONS.star, perm: 'settings.view' },
      { to: '/admin/compras', label: 'Compras', icon: ICONS.cart, perm: 'purchases.view' },
    ],
  },
  {
    group: 'Ventas',
    items: [
      { to: '/admin/ventas', label: 'Pedidos', icon: ICONS.receipt, perm: 'sales.view' },
      { to: '/admin/clientes', label: 'Clientes', icon: ICONS.users, perm: 'customers.view' },
      { to: '/admin/cotizaciones', label: 'Cotizaciones', icon: ICONS.tag, perm: 'quotes.view' },
      { to: '/admin/logistica', label: 'Logística', icon: ICONS.truck, perm: 'shipments.view' },
      { to: '/admin/descuentos', label: 'Descuentos', icon: ICONS.percent, perm: 'discounts.view' },
      { to: '/admin/cupones', label: 'Cupones', icon: ICONS.ticket, perm: 'coupons.view' },
    ],
  },
  {
    group: 'Administración',
    items: [
      { to: '/admin/usuarios', label: 'Usuarios', icon: ICONS.users, perm: 'users.view' },
      { to: '/admin/roles', label: 'Roles y permisos', icon: ICONS.shield, perm: 'roles.view' },
      { to: '/admin/ajustes', label: 'Ajustes', icon: ICONS.cog, perm: 'settings.view' },
    ],
  },
]

const TITLES = {
  '/admin': 'Dashboard',
  '/admin/productos': 'Productos',
  '/admin/categorias': 'Categorías',
  '/admin/destacados': 'Fragancias destacadas',
  '/admin/compras': 'Compras',
  '/admin/ventas': 'Pedidos',
  '/admin/logistica': 'Logística',
  '/admin/clientes': 'Clientes',
  '/admin/cotizaciones': 'Cotizaciones',
  '/admin/descuentos': 'Descuentos',
  '/admin/cupones': 'Cupones',
  '/admin/usuarios': 'Usuarios',
  '/admin/roles': 'Roles y permisos',
  '/admin/ajustes': 'Ajustes de la tienda',
}

// cierra un menú desplegable al hacer clic fuera o pulsar Escape
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

const menuCls = 'absolute right-0 top-full mt-2 z-50 rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_50px_-15px_rgba(15,26,46,0.35)] overflow-hidden'
const itemCls = 'flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-slate-700 hover:bg-neutral-50 transition-colors'

const QUICK = [
  { label: 'Producto', to: '/admin/productos?nuevo=1', icon: ICONS.box, perm: 'products.create' },
  { label: 'Categoría', to: '/admin/categorias?nuevo=1', icon: ICONS.tag, perm: 'categories.create' },
  { label: 'Cliente', to: '/admin/clientes?nuevo=1', icon: ICONS.users, perm: 'customers.create' },
  { label: 'Cotización', to: '/admin/cotizaciones?nuevo=1', icon: ICONS.tag, perm: 'quotes.create' },
  { label: 'Pedido', to: '/admin/ventas?nuevo=1', icon: ICONS.receipt, perm: 'sales.create' },
  { label: 'Compra', to: '/admin/compras?nuevo=1', icon: ICONS.cart, perm: 'purchases.create' },
  { label: 'Descuento', to: '/admin/descuentos?nuevo=1', icon: ICONS.percent, perm: 'discounts.create' },
  { label: 'Cupón', to: '/admin/cupones?nuevo=1', icon: ICONS.ticket, perm: 'coupons.create' },
]

function TopBar({ title, email, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const quick = useDropdown()
  const bell = useDropdown()
  const user = useDropdown()
  const { can, access } = useAuth()
  const [alerts, setAlerts] = useState({ pending: [], low: [] })
  const roleLabel = access?.super ? 'Super administrador' : access?.roles?.map((r) => r.label).join(', ') || 'Administrador'

  // avisos: pedidos por confirmar y productos con poco stock (se refrescan al navegar)
  useEffect(() => {
    let alive = true
    Promise.all([
      can('sales.view') ? listSales().catch(() => []) : [],
      can('products.view') ? listProducts().catch(() => []) : [],
    ]).then(([sales, products]) => {
      if (!alive) return
      setAlerts({
        pending: sales.filter((s) => s.status === 'pendiente'),
        low: products.filter((p) => p.active && p.stock <= p.min_stock),
      })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, access])

  const total = alerts.pending.length + alerts.low.length
  const initial = (email ?? '?').charAt(0).toUpperCase()
  const quickItems = QUICK.filter((q) => can(q.perm))
  const go = (to) => {
    quick.setOpen(false)
    bell.setOpen(false)
    user.setOpen(false)
    navigate(to)
  }

  return (
    <div className="hidden lg:flex sticky top-0 z-20 h-[72px] items-center justify-between gap-6 px-10 bg-white/90 backdrop-blur border-b border-neutral-200">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400" style={mono}>
          Admin <span className="mx-1.5">/</span> <span className="text-slate-700">{title}</span>
        </p>
        <p className="text-sm text-slate-500 first-letter:uppercase">
          {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* creación rápida */}
        {quickItems.length > 0 && (
        <div className="relative" ref={quick.ref}>
          <button
            onClick={() => quick.setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={quick.open}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-white text-[12px] font-bold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: INK }}
          >
            <span className="text-base leading-none">+</span> Nuevo
          </button>
          {quick.open && (
            <div role="menu" className={`${menuCls} w-52`}>
              {quickItems.map((q) => (
                <button key={q.label} role="menuitem" onClick={() => go(q.to)} className={itemCls}>
                  <span style={{ color: AMBER }}><Icon d={q.icon} size={18} /></span> {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 h-10 px-4 rounded-xl border border-neutral-300 bg-white text-[12px] font-bold uppercase tracking-wider text-slate-700 hover:bg-neutral-50">
          <Icon d={ICONS.store} size={16} /> Ver tienda
        </a>

        {/* notificaciones */}
        <div className="relative" ref={bell.ref}>
          <button
            onClick={() => bell.setOpen((v) => !v)}
            aria-label={`Avisos${total ? `, ${total} pendientes` : ''}`}
            aria-haspopup="menu"
            aria-expanded={bell.open}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-300 bg-white text-slate-600 hover:bg-neutral-50"
          >
            <Icon d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zm4 9a2 2 0 004 0" size={18} />
            {total > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: AMBER }}>{total}</span>
            )}
          </button>
          {bell.open && (
            <div role="menu" className={`${menuCls} w-80`}>
              <p className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400" style={mono}>Avisos</p>
              {total === 0 ? (
                <p className="px-4 pb-5 pt-2 text-sm text-slate-500">Todo al día. No hay nada pendiente. ✓</p>
              ) : (
                <div className="pb-2">
                  {alerts.pending.length > 0 && (
                    <button role="menuitem" onClick={() => go('/admin/ventas')} className={itemCls}>
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-100 text-amber-700"><Icon d={ICONS.receipt} size={18} /></span>
                      <span>
                        <strong className="block text-slate-900">{alerts.pending.length} {alerts.pending.length === 1 ? 'pedido pendiente' : 'pedidos pendientes'}</strong>
                        <span className="text-xs text-slate-500">Por confirmar</span>
                      </span>
                    </button>
                  )}
                  {alerts.low.length > 0 && (
                    <button role="menuitem" onClick={() => go('/admin/productos')} className={itemCls}>
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-100 text-red-600"><Icon d={ICONS.alert} size={18} /></span>
                      <span>
                        <strong className="block text-slate-900">{alerts.low.length} {alerts.low.length === 1 ? 'producto con stock bajo' : 'productos con stock bajo'}</strong>
                        <span className="text-xs text-slate-500">{alerts.low.slice(0, 2).map((p) => p.name).join(', ')}{alerts.low.length > 2 ? '…' : ''}</span>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* usuario */}
        <div className="relative" ref={user.ref}>
          <button
            onClick={() => user.setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={user.open}
            className="flex items-center gap-2.5 h-10 pl-1.5 pr-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50"
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: AMBER }}>{initial}</span>
            <span className="hidden xl:block max-w-[160px] truncate text-sm font-semibold text-slate-700">{email}</span>
            <span className="text-[9px] text-slate-400">▼</span>
          </button>
          {user.open && (
            <div role="menu" className={`${menuCls} w-64`}>
              <div className="px-4 py-4 border-b border-neutral-100">
                <p className="text-sm font-bold truncate" style={{ color: INK }}>{email}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400" style={mono}>{roleLabel}</p>
              </div>
              <a href="/" target="_blank" rel="noopener noreferrer" className={itemCls}><Icon d={ICONS.store} size={18} /> Ver la tienda</a>
              <button role="menuitem" onClick={onLogout} className={`${itemCls} text-red-600 hover:bg-red-50`}><Icon d={ICONS.logout} size={18} /> Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// showAccount: en escritorio el usuario y «Ver tienda» viven en el menú superior;
// solo el panel móvil los necesita aquí.
function SidebarContent({ email, onNavigate, onLogout, showAccount = false }) {
  const { can, access } = useAuth()
  const initial = (email ?? '?').charAt(0).toUpperCase()
  const roleLabel = access?.super ? 'Super administrador' : access?.roles?.map((r) => r.label).join(', ') || 'Administrador'
  return (
    <div className="h-full flex flex-col text-white" style={{ backgroundColor: INK }}>
      <Link to="/admin" onClick={onNavigate} className="flex items-center gap-3 px-5 h-[72px] border-b border-white/10 flex-shrink-0">
        <img src={logoImg} alt="" className="w-9 h-9 object-contain rounded-lg" />
        <span className="leading-none">
          <span className="block text-lg font-black tracking-tight" style={display}>MONACOSV</span>
          <span className="block mt-1 text-[9px] uppercase tracking-[0.3em] text-white/45" style={mono}>Panel admin</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) })).filter((g) => g.items.length).map((g) => (
          <div key={g.group}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35" style={mono}>{g.group}</p>
            <div className="space-y-1">
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ backgroundColor: AMBER }} />}
                      <span style={{ color: isActive ? '#f59e0b' : undefined }}><Icon d={item.icon} size={18} /></span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {showAccount && (
      <>
      <div className="px-3 pb-3 flex-shrink-0">
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Icon d={ICONS.store} size={18} /> Ver la tienda
        </Link>
      </div>

      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3 flex-shrink-0">
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: AMBER }}>{initial}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/80 truncate">{email}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/40 truncate" style={mono}>{roleLabel}</p>
        </div>
        <button onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión" className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Icon d={ICONS.logout} size={18} />
        </button>
      </div>
      </>
      )}
    </div>
  )
}

export default function AdminLayout() {
  const { logout, session, access, accessLoading } = useAuth()
  const { pathname } = useLocation()
  const noAccess = !accessLoading && access && !access.legacy && (access.active === false || (!access.super && !(access.permissions ?? []).length))
  const [open, setOpen] = useState(false)
  const email = session?.user?.email

  // cierra el menú móvil al navegar
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="min-h-screen bg-[#f4f3f0] text-slate-900" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* escritorio: barra lateral fija */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
        <SidebarContent email={email} onLogout={logout} />
      </aside>

      {/* móvil: barra superior + panel deslizante */}
      <header className="lg:hidden sticky top-0 z-30 h-16 px-4 flex items-center justify-between text-white" style={{ backgroundColor: INK }}>
        <Link to="/admin" className="flex items-center gap-2.5">
          <img src={logoImg} alt="" className="w-8 h-8 object-contain rounded-lg" />
          <span className="text-base font-black tracking-tight" style={display}>MONACOSV</span>
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10">
          <Icon d={ICONS.menu} size={22} />
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] shadow-2xl">
            <SidebarContent email={email} onNavigate={() => setOpen(false)} onLogout={logout} showAccount />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <TopBar title={TITLES[pathname] ?? 'Panel'} email={email} onLogout={logout} />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
          <h1 className="text-2xl sm:text-3xl font-black uppercase leading-tight mb-8" style={{ ...display, color: INK }}>
            {TITLES[pathname] ?? 'Panel'}
          </h1>
          {noAccess ? (
            <NoAccess
              title={access.active === false ? 'Tu cuenta está desactivada' : 'Todavía no tienes un rol asignado'}
              text="Un administrador debe activar tu cuenta o asignarte un rol para que puedas usar el panel."
            />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  )
}
