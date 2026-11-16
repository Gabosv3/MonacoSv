import { useRef, useState } from 'react'
import { MAX_GALLERY_IMAGES, uploadProductImage } from './api'
import { Btn } from './kit'
import { AMBER } from '../components/ui'

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif'

// Fotos adicionales de una fragancia (la galería de la ficha), después de la foto principal.
// Se pueden subir varias a la vez (clic o arrastrando), ordenar, quitar o convertir en la principal.
//   images:      direcciones de las fotos adicionales, en orden
//   onChange:    recibe la lista nueva
//   main:        la foto principal actual (image_url); onMakeMain(url) la cambia
//   upload:      función que sube un archivo y devuelve su dirección (por defecto, Supabase Storage)
export default function GalleryUpload({ images, onChange, main = '', onMakeMain, color = '#141414', upload = uploadProductImage }) {
  const inputRef = useRef(null)
  const [progress, setProgress] = useState(null) // { done, total } mientras sube
  const [errors, setErrors] = useState([])
  const [dragging, setDragging] = useState(false)
  const busy = progress !== null
  const room = MAX_GALLERY_IMAGES - images.length

  const addFiles = async (fileList) => {
    const files = [...(fileList ?? [])].filter((f) => f.type.startsWith('image/'))
    if (!files.length || busy) return
    const take = files.slice(0, Math.max(0, room))
    const problems = []
    if (files.length > take.length) problems.push(`Caben ${MAX_GALLERY_IMAGES} fotos adicionales: se omitieron ${files.length - take.length}.`)
    const added = []
    for (let i = 0; i < take.length; i++) {
      setProgress({ done: i, total: take.length })
      try {
        const url = await upload(take[i])
        if (url && !images.includes(url) && !added.includes(url)) added.push(url)
      } catch (err) {
        problems.push(`${take[i].name}: ${err.message}`)
      }
    }
    setProgress(null)
    setErrors(problems)
    if (added.length) onChange([...images, ...added])
    if (inputRef.current) inputRef.current.value = ''
  }

  const move = (i, step) => {
    const next = [...images]
    ;[next[i], next[i + step]] = [next[i + step], next[i]]
    onChange(next)
  }
  const remove = (i) => onChange(images.filter((_, k) => k !== i))
  // la foto elegida pasa a ser la principal y la principal anterior ocupa su lugar
  const makeMain = (i) => {
    const url = images[i]
    onChange(main ? images.map((u, k) => (k === i ? main : u)) : images.filter((_, k) => k !== i))
    onMakeMain?.(url)
  }

  const tile = 'w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-sm text-slate-600 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-white'

  return (
    <div className="col-span-2">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Más fotos</p>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className="rounded-2xl border-2 border-dashed p-4 transition-colors"
        style={{ borderColor: dragging ? AMBER : '#d4d4d8', backgroundColor: dragging ? '#fff7ed' : '#fafafa' }}
      >
        {images.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-3" aria-label="Fotos adicionales">
            {images.map((url, i) => (
              <li key={url} className="w-28">
                <div className="relative h-32 rounded-xl border border-neutral-200 overflow-hidden" style={{ backgroundColor: `${color}18` }}>
                  <img src={url} alt={`Foto adicional ${i + 1}`} className="w-full h-full object-contain p-1.5" onError={(e) => { e.currentTarget.style.opacity = 0.2 }} />
                  <span className="absolute left-1.5 top-1.5 min-w-5 h-5 px-1 rounded-full bg-white/90 text-[10px] font-bold flex items-center justify-center text-slate-600">{i + 2}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <button type="button" className={tile} disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Mover la foto ${i + 1} antes`} title="Mover antes">←</button>
                  <button type="button" className={tile} disabled={busy || i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Mover la foto ${i + 1} después`} title="Mover después">→</button>
                  <button type="button" className={tile} disabled={busy} onClick={() => makeMain(i)} aria-label={`Usar la foto ${i + 1} como principal`} title="Hacer principal">★</button>
                  <button type="button" className={`${tile} text-red-600`} disabled={busy} onClick={() => remove(i)} aria-label={`Quitar la foto ${i + 1}`} title="Quitar">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Btn type="button" size="sm" kind="secondary" disabled={busy || room <= 0} onClick={() => inputRef.current?.click()}>
            {busy ? `Subiendo ${progress.done + 1} de ${progress.total}…` : images.length ? 'Agregar más fotos' : 'Agregar fotos'}
          </Btn>
          <p className="text-xs text-slate-500 leading-relaxed">
            {room > 0
              ? 'Elige varias a la vez o arrástralas aquí. Se ven en la ficha, después de la foto principal, y valen para todas las presentaciones.'
              : `Llegaste al máximo de ${MAX_GALLERY_IMAGES} fotos adicionales.`}
          </p>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <span className="sr-only" aria-live="polite">{busy ? `Subiendo ${progress.done + 1} de ${progress.total}` : ''}</span>
    </div>
  )
}
