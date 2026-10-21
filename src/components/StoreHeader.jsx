import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logoImg from '../assets/logo.webp'
import { useSettings } from '../settings'
import { useAuth } from '../admin/AuthContext'
import { useAccount } from './AccountModal'
import { BottlePlaceholder } from './HomeHero'
import CatalogDrawer from './CatalogDrawer'
import { Icon, ICONS, INK, AMBER, display, mono } from './ui'

const NAV = [
  { label: 'Inicio', to: '/' },
  { label: 'Fragancias', to: '/fragancias' },
  { label: 'Para ella', to: '/fragancias?gen=mujer' },
  { label: 'Decants', to: '/fragancias?tam=decant' },
  { label: 'Botellas', to: '/fragancias?tam=botella' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Contacto', to: '/contacto' },
]

function SearchBox({ fragrances, onDone, autoFocus }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    const needle = value.trim().toLowerCase()
    if (!needle) return []
    return fragrances
      .filter((f) => `${f.name} ${f.brand} ${f.tag}`.toLowerCase().includes(needle))
      .slice(0, 5)
  }, [value, fragrances])

  const go = (text) => {
    const term = text.trim()
    if (!term) return
    navigate(`/fragancias?q=${encodeURIComponent(term)}`)
    setValue('')
    setOpen(false)
    onDone?.()
  }

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          go(value)
        }}
        role="search"
        className="flex items-center gap-3 h-11 lg:h-12 rounded-xl border border-neutral-300 bg-white px-4 focus-within:border-slate-400 focus-within:bg-white transition-colors"
      >
        <span className="text-slate-400"><Icon d={ICONS.search} size={18} /></span>
        <input
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar fragancia…"
          aria-label="Buscar fragancia"
          className="flex-1 min-w-0 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
        />
      </form>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          {results.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(f.name)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50"
              >
                {f.image ? <img src={f.image} alt="" className="w-9 h-9 object-contain flex-shrink-0" /> : <BottlePlaceholder className="w-9 h-9 flex-shrink-0" />}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate" style={{ color: INK }}>{f.name}</span>
                  {f.brand && <span className="block text-[10px] uppercase tracking-wider text-slate-400" style={mono}>{f.brand}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function StoreHeader({ itemCount, onCart, fragrances = [], featured = fragrances }) {
  const { cfg, wa } = useSettings()
  const { session, customer, access, logout } = useAuth()
  const { openAccount } = useAccount()
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)
  const isStaff = !!access && (access.legacy || access.super || (access.permissions ?? []).length > 0)
  const displayName = customer?.name || session?.user?.user_metadata?.full_name || session?.user?.email || ''
  const accountInitial = (displayName || '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!accountOpen) return
    const onDown = (e) => accountRef.current && !accountRef.current.contains(e.target) && setAccountOpen(false)
    const onKey = (e) => e.key === 'Escape' && setAccountOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])
  const [menuOpen, setMenuOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const closeCatalog = useCallback(() => setCatalogOpen(false), [])
  const { pathname, search } = useLocation()
  const here = pathname + search

  // Fila 2 de escritorio: información de la tienda (el catálogo vive en el panel)
  const perks = [
    { icon: ICONS.shield, label: 'Batch code garantizado' },
    { icon: ICONS.check, label: 'Decants con sello hermético' },
    { icon: ICONS.truck, label: cfg.coverage },
    { icon: ICONS.box, label: 'Despacho C807 / Cargo Express' },
    { icon: ICONS.chat, label: 'Asesoría por WhatsApp', href: wa() },
  ]

  const action = 'hidden lg:flex items-center gap-3 text-left leading-snug'

  return (
    <>
      <div className="border-b border-neutral-200 bg-white text-[10px] sm:text-[11px] uppercase tracking-wider" style={{ color: INK }}>
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 h-9 flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 font-semibold min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="truncate">{cfg.topbar_text}</span>
          </span>
          <span className="hidden lg:block text-slate-500 whitespace-nowrap" style={mono}>
            Tienda en {cfg.city}
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        {/* fila 1: logo, buscador grande, acciones */}
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 h-16 lg:h-20 flex items-center gap-3 lg:gap-12">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0" aria-label="MonacoSV, inicio">
            <img src={logoImg} alt="" className="w-10 h-10 lg:w-11 lg:h-11 object-contain rounded-lg" />
            <span className="leading-none">
              <span className="block text-lg sm:text-xl lg:text-2xl font-black tracking-tight" style={{ ...display, color: INK }}>MONACOSV</span>
              <span className="hidden lg:block mt-1.5 text-[8px] tracking-[0.3em] uppercase text-slate-400" style={mono}>Masculine fragrance studio</span>
            </span>
          </Link>

          <div className="hidden md:block flex-1 min-w-0 max-w-2xl mx-auto">
            <SearchBox fragrances={fragrances} />
          </div>

          <div className="flex items-center gap-2 lg:gap-8 ml-auto md:ml-0 flex-shrink-0">
            {/* cuenta del cliente */}
            {session ? (
              <div className="relative hidden lg:block" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  className="flex items-center gap-2.5 h-11 pl-1.5 pr-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50"
                >
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: AMBER }}>{accountInitial}</span>
                  <span className="hidden xl:block max-w-[120px] truncate text-sm font-semibold text-slate-700">{displayName.split(' ')[0]}</span>
                  <span className="text-[9px] text-slate-400">▼</span>
                </button>
                {accountOpen && (
                  <div role="menu" className="absolute right-0 top-full mt-2 z-50 w-60 rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <p className="text-sm font-bold truncate" style={{ color: INK }}>{displayName}</p>
                      <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                    </div>
                    <Link role="menuitem" to="/cuenta" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-neutral-50"><Icon d={ICONS.user} size={17} /> Editar mi perfil</Link>
                    <Link role="menuitem" to="/cuenta#pedidos" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-neutral-50"><Icon d={ICONS.bag} size={17} /> Mis pedidos</Link>
                    {isStaff && <Link role="menuitem" to="/admin" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-neutral-50"><Icon d={ICONS.grid} size={17} /> Ir al panel</Link>}
                    <button role="menuitem" onClick={() => { setAccountOpen(false); logout() }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-red-600 hover:bg-red-50"><Icon d={ICONS.logout} size={17} /> Cerrar sesión</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => openAccount('login')} className={`${action} text-slate-700 hover:text-slate-900`}>
                <Icon d={ICONS.user} size={26} />
                <span className="text-[11px] font-bold">Ingresar<br />o crear cuenta</span>
              </button>
            )}
            <a
              href={wa()}
              target="_blank"
              rel="noopener noreferrer"
              className={`${action} text-slate-700 hover:text-slate-900`}
            >
              <Icon d={ICONS.chat} size={26} />
              <span className="text-[11px] font-bold">Asesoría<br />WhatsApp</span>
            </a>
            <button onClick={onCart} className={`${action} text-slate-700 hover:text-slate-900`} aria-label="Abrir bolsa">
              <span className="relative">
                <Icon d={ICONS.bag} size={26} />
                <span className="absolute -top-2.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: AMBER }}>{itemCount}</span>
              </span>
              <span className="text-[11px] font-bold pl-1.5">Mi<br />bolsa</span>
            </button>
            {/* móvil / tablet: solo bolsa compacta */}
            <button onClick={onCart} className="lg:hidden flex items-center gap-2 h-10 px-3.5 rounded-xl text-white text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: INK }} aria-label="Abrir bolsa">
              <Icon d={ICONS.bag} size={15} />
              <span className="hidden sm:inline">Bolsa</span>
              <span className="min-w-5 h-5 px-1 rounded-full text-[10px] flex items-center justify-center" style={{ backgroundColor: AMBER }}>{itemCount}</span>
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-neutral-200" aria-label="Menú" aria-expanded={menuOpen}>
              <Icon d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} size={20} />
            </button>
          </div>
        </div>

        {/* fila 2 (escritorio): catálogo + enlaces repartidos en todo el ancho */}
        <nav className="hidden lg:block border-t border-neutral-200">
          <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-6">
            <button
              onClick={() => setCatalogOpen(true)}
              className="flex items-center gap-3 my-2.5 px-4 py-2.5 rounded-xl text-[12px] font-extrabold uppercase tracking-[0.1em] text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: INK }}
              aria-haspopup="dialog"
            >
              <Icon d="M4 7h16M4 12h16M4 17h16" size={18} /> Todo el catálogo
            </button>
            {perks.map((p, i) => {
              const inner = (
                <>
                  <span style={{ color: AMBER }}><Icon d={p.icon} size={18} /></span>
                  {p.label}
                </>
              )
              const show = i < 3 ? 'flex' : i === 3 ? 'hidden xl:flex' : 'hidden 2xl:flex'
              const cls = `${show} items-center gap-2.5 py-4 text-[12px] font-semibold tracking-wide text-slate-600 whitespace-nowrap`
              return p.href ? (
                <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:text-slate-900`}>{inner}</a>
              ) : (
                <span key={p.label} className={cls}>{inner}</span>
              )
            })}
          </div>
        </nav>

        {menuOpen && (
          <div className="lg:hidden border-t border-neutral-200 bg-white px-4 sm:px-6 py-4 space-y-4">
            <div className="md:hidden">
              <SearchBox fragrances={fragrances} onDone={() => setMenuOpen(false)} />
            </div>
            {session ? (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/cuenta" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl border border-neutral-200 text-xs font-bold uppercase tracking-widest text-slate-600 text-center">Mi cuenta</Link>
                <button onClick={() => { setMenuOpen(false); logout() }} className="px-4 py-3 rounded-xl border border-neutral-200 text-xs font-bold uppercase tracking-widest text-red-600">Cerrar sesión</button>
              </div>
            ) : (
              <button onClick={() => { setMenuOpen(false); openAccount('login') }} className="w-full px-4 py-3 rounded-xl text-white text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: INK }}>
                Ingresar o crear cuenta
              </button>
            )}
            <nav className="grid grid-cols-2 gap-2">
              {NAV.map((n) => (
                <Link
                  key={n.label}
                  to={n.to}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest ${
                    here === n.to ? 'border-slate-900 bg-slate-900 text-white' : 'border-neutral-200 text-slate-600'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <a
              href={wa()}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider"
            >
              <Icon d={ICONS.chat} size={16} /> Asesoría por WhatsApp
            </a>
          </div>
        )}
      </header>

      <CatalogDrawer open={catalogOpen} onClose={closeCatalog} fragrances={featured} />
    </>
  )
}
