import { useRef, useState } from 'react'
import { uploadProductImage } from './api'
import { Btn } from './kit'
import { INK, AMBER, mono } from '../components/ui'

// Subir una foto (clic o arrastrar) o pegar un enlace. onChange recibe la URL final.
export default function ImageUpload({ value, onChange, color = '#141414' }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [showUrl, setShowUrl] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      onChange(await uploadProductImage(file))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="col-span-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="rounded-2xl border-2 border-dashed p-4 flex flex-col sm:flex-row items-center gap-5 transition-colors"
        style={{ borderColor: dragging ? AMBER : '#d4d4d8', backgroundColor: dragging ? '#fff7ed' : '#fafafa' }}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Elegir una foto"
          className="relative w-36 h-36 rounded-2xl border border-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0 hover:border-slate-400 transition-colors"
          style={{ backgroundColor: `${color}18` }}
        >
          {value ? (
            <img src={value} alt="Vista previa" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.opacity = 0.2 }} />
          ) : (
            <span className="text-center text-xs text-slate-400 px-3 leading-snug">
              <span className="block text-3xl mb-1" aria-hidden>📷</span>Sin foto
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-6 h-6 rounded-full border-2 border-neutral-300 animate-spin" style={{ borderTopColor: INK }} />
              Subiendo…
            </span>
          )}
        </button>

        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm font-semibold" style={{ color: INK }}>{value ? 'Foto del producto' : 'Sube la foto del producto'}</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Arrastra una imagen aquí o elige un archivo. PNG, JPG o WebP de hasta 5 MB; mejor con fondo transparente.
          </p>
          <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
            <Btn type="button" size="sm" kind="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
              {value ? 'Cambiar foto' : 'Elegir foto'}
            </Btn>
            {value && (
              <Btn type="button" size="sm" kind="ghost" disabled={busy} onClick={() => onChange('')} style={{ color: '#dc2626' }}>
                Quitar
              </Btn>
            )}
            <Btn type="button" size="sm" kind="ghost" onClick={() => setShowUrl((v) => !v)}>
              {showUrl ? 'Ocultar enlace' : 'Usar un enlace'}
            </Btn>
          </div>
        </div>

        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showUrl && (
        <div className="mt-3">
          <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500" style={mono}>Enlace de la imagen</label>
          <input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            className="w-full h-11 rounded-xl border border-neutral-300 bg-white px-3.5 text-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
          />
        </div>
      )}
    </div>
  )
}
