import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

const WHATSAPP_NUMBER = '573000000000'

export default function ComingSoon({ title }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-4 text-center gap-6">
      <Link to="/" className="flex items-center gap-2">
        <img src={logoImg} alt="MonacoSV" className="w-9 h-9 object-contain rounded-full" />
        <span className="text-xl font-extrabold tracking-tight">
          Monaco<span className="text-amber-400">SV</span>
        </span>
      </Link>

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400 mb-3">{title}</p>
        <h1 className="text-3xl sm:text-4xl font-black uppercase mb-3">Próximamente</h1>
        <p className="text-neutral-400 max-w-md mx-auto">
          Todavía estamos preparando esta página. Mientras tanto, escríbenos por WhatsApp o vuelve al inicio.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="bg-white text-neutral-900 text-sm px-5 py-3 rounded-lg font-semibold hover:bg-neutral-200 transition-colors"
        >
          Volver al inicio
        </Link>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-white/30 text-sm px-5 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
        >
          Escríbenos por WhatsApp
        </a>
      </div>
    </div>
  )
}
