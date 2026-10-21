import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.webp'
import bottleImg from '../assets/hero-khamrah-cut.webp'
import { INK, AMBER, display, mono } from '../components/ui'

export const field =
  'w-full h-12 rounded-xl border border-neutral-300 bg-white px-4 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5'

export const primaryBtn =
  'w-full h-12 rounded-xl text-white text-[13px] font-bold uppercase tracking-[0.15em] transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center'

export function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
      {children}
    </label>
  )
}

export function Alert({ kind = 'error', children }) {
  const styles =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  )
}

export { INK, AMBER, display, mono }

// Marco común de las pantallas de acceso: panel de marca a la izquierda
// (solo escritorio) y el contenido a la derecha.
export default function AuthShell({ kicker, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16 text-white"
        style={{
          backgroundColor: INK,
          backgroundImage: `radial-gradient(ellipse 60% 55% at 70% 55%, ${AMBER}55, transparent 70%), radial-gradient(ellipse 50% 40% at 0% 0%, #ffffff14, transparent 70%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="" className="w-11 h-11 object-contain rounded-lg" />
          <span className="text-2xl font-black tracking-tight" style={display}>MONACOSV</span>
        </div>

        <img
          src={bottleImg}
          alt=""
          aria-hidden
          className="absolute right-[6%] top-[37%] -translate-y-1/2 w-[48%] max-w-[460px] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)] pointer-events-none select-none"
        />

        <div className="relative max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ ...mono, color: '#f59e0b' }}>Panel administrativo</p>
          <h1 className="mt-4 text-4xl xl:text-5xl font-black uppercase leading-[1.02]" style={display}>
            Tu tienda,<br />bajo control.
          </h1>
          <p className="mt-5 text-white/65 leading-relaxed">
            Productos, stock, pedidos, descuentos y cupones en un solo lugar.
          </p>
        </div>
      </aside>

      <main className="flex flex-col justify-center px-6 sm:px-12 py-12" style={{ backgroundColor: '#f6f4f0' }}>
        <div className="w-full max-w-[400px] mx-auto">
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-10">
            <img src={logoImg} alt="" className="w-10 h-10 object-contain rounded-lg" />
            <span className="text-xl font-black tracking-tight" style={{ ...display, color: INK }}>MONACOSV</span>
          </Link>

          <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ ...mono, color: AMBER }}>{kicker}</p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-tight" style={{ ...display, color: INK }}>{title}</h2>
          {subtitle && <p className="mt-3 text-sm text-slate-500 leading-relaxed">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer ?? (
            <Link to="/" className="mt-8 inline-block text-sm text-slate-500 hover:text-slate-900">← Volver a la tienda</Link>
          )}
        </div>
      </main>
    </div>
  )
}
