import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.webp'
import { useSettings } from '../settings'
import { INK, display, mono } from './ui'

const col = 'text-sm text-slate-500 hover:text-slate-900 transition-colors'

export default function StoreFooter() {
  const { cfg, wa } = useSettings()
  const socials = [['Instagram', cfg.instagram], ['Facebook', cfg.facebook], ['TikTok', cfg.tiktok]].filter(([, url]) => url)
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 py-12 grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
        <div>
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImg} alt="" className="w-10 h-10 object-contain rounded-lg" />
            <span className="text-xl font-black tracking-tight" style={{ ...display, color: INK }}>{cfg.store_name.toUpperCase()}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-slate-500 leading-relaxed">
            {cfg.footer_about} Desde {cfg.city}. {cfg.coverage} de El Salvador.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400" style={mono}>Tienda</p>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/fragancias" className={col}>Todo el catálogo</Link></li>
            <li><Link to="/fragancias?tam=decant" className={col}>Decants 10 ml</Link></li>
            <li><Link to="/fragancias?tam=botella" className={col}>Botellas selladas</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400" style={mono}>MonacoSV</p>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/nosotros" className={col}>Nosotros</Link></li>
            <li><Link to="/contacto" className={col}>Contacto</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400" style={mono}>Contacto</p>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
            <li>{cfg.city}, El Salvador</li>
            {cfg.contact_email && <li><a href={`mailto:${cfg.contact_email}`} className={col}>{cfg.contact_email}</a></li>}
            <li>
              <a href={wa()} target="_blank" rel="noopener noreferrer" className={col}>WhatsApp</a>
            </li>
            <li>Pedidos coordinados por WhatsApp</li>
            {socials.map(([name, url]) => <li key={name}><a href={url} target="_blank" rel="noopener noreferrer" className={col}>{name}</a></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-200 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MonacoSV · Todos los derechos reservados
      </div>
    </footer>
  )
}
