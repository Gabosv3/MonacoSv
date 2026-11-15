import { Link } from 'react-router-dom'

import { useSettings } from '../settings'

export default function ComingSoon({ title }) {
  const { wa, cfg } = useSettings()
  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center px-4 text-center gap-6">
      <Link to="/" className="flex items-center gap-2">
        {cfg.logo_url && <img src={cfg.logo_url} alt="" className="w-9 h-9 object-cover" />}
        <span className="text-2xl" style={{ fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic', fontWeight: 900 }} data-logo>Duumvir</span>
      </Link>

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400 mb-3">{title}</p>
        <h1 className="text-3xl sm:text-4xl font-black uppercase mb-3">Próximamente</h1>
        <p className="text-[#141414]/45 max-w-md mx-auto">
          Todavía estamos preparando esta página. Mientras tanto, escríbenos por WhatsApp o vuelve al inicio.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="bg-[#F6F3EC] text-[#141414] text-sm px-5 py-3 rounded-none font-semibold hover:bg-[#D9D2C5] transition-colors"
        >
          Volver al inicio
        </Link>
        <a
          href={wa()}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-white/30 text-sm px-5 py-3 rounded-none font-semibold hover:bg-white/10 transition-colors"
        >
          Escríbenos por WhatsApp
        </a>
      </div>
    </div>
  )
}
