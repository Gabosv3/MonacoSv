import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings } from '../settings'
import { BottlePlaceholder } from './HomeHero'
import { Icon, ICONS, INK, AMBER, mono } from './ui'

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-slate-400 flex-shrink-0">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function Row({ to, onClose, children, strong, accent }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className={`flex items-center justify-between gap-3 px-5 py-3.5 text-[15px] transition-colors hover:bg-white ${
        strong ? 'font-bold' : ''
      }`}
      style={{ color: accent ? AMBER : INK }}
    >
      {children}
      <Chevron />
    </Link>
  )
}

const Label = ({ children }) => (
  <p className="px-5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400" style={mono}>
    {children}
  </p>
)

export default function CatalogDrawer({ open, onClose, fragrances }) {
  const { wa } = useSettings()
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-label="Catálogo"
            className="absolute left-0 top-0 h-full w-[330px] max-w-[88vw] bg-neutral-100 shadow-2xl flex flex-col"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between px-5 h-16 flex-shrink-0 border-b border-neutral-200 bg-white">
              <span className="flex items-center gap-3 text-lg font-bold" style={{ color: INK }}>
                <Icon d="M4 7h16M4 12h16M4 17h16" size={20} /> Catálogo
              </span>
              <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-neutral-100 text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
              <Label>Destacados</Label>
              <Row to="/fragancias" onClose={onClose} strong accent>Todo el catálogo</Row>
              <Row to="/fragancias?gen=mujer" onClose={onClose}>Para ella</Row>
              <Row to="/fragancias?tam=decant" onClose={onClose}>Decants · 10 ml</Row>
              <Row to="/fragancias?tam=botella" onClose={onClose}>Botellas selladas · 100 ml</Row>

              <Label>Fragancias</Label>
              {fragrances.map((f) => (
                <Row key={f.id} to={`/fragancias?q=${encodeURIComponent(f.name)}`} onClose={onClose}>
                  <span className="flex items-center gap-3 min-w-0">
                    {f.image ? <img src={f.image} alt="" className="w-9 h-9 object-contain flex-shrink-0" /> : <BottlePlaceholder className="w-9 h-9 flex-shrink-0" />}
                    <span className="min-w-0">
                      <span className="block truncate">{f.name}</span>
                      {f.brand && <span className="block text-[10px] uppercase tracking-wider text-slate-400" style={mono}>{f.brand}</span>}
                    </span>
                  </span>
                </Row>
              ))}

              <Label>Ayuda</Label>
              <Row to="/nosotros" onClose={onClose}>Nosotros</Row>
              <Row to="/contacto" onClose={onClose}>Contacto</Row>
              <a
                href={wa()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center justify-between gap-3 px-5 py-3.5 text-[15px] hover:bg-white text-emerald-700"
              >
                <span className="flex items-center gap-2"><Icon d={ICONS.chat} size={18} /> Asesoría por WhatsApp</span>
                <Chevron />
              </a>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
