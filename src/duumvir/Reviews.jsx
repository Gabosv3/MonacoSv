import { useCallback, useEffect, useId, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../admin/AuthContext'
import { useAccount } from '../components/AccountModal'
import { display } from '../components/dv-ui'
import { deleteMyReview, fetchMyReviewStatus, fetchReviews, submitReview } from './experienceApi'

const STAR = 'M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.6z'

// estrellas de lectura (admite medias: se recorta el relleno)
export function Stars({ value = 0, size = 16, className = '' }) {
  return (
    <span className={`inline-flex gap-0.5 align-middle ${className}`} role="img" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)))
        return (
          <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <path d={STAR} fill="none" stroke="#141414" strokeWidth="1.3" strokeLinejoin="round" />
            <path d={STAR} fill="#141414" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }} />
          </svg>
        )
      })}
    </span>
  )
}

// selector de 1 a 5 (estrellas o puntos), usable con teclado: es un grupo de radios
function Scale({ label, value, onChange, required = false, star = false }) {
  const id = useId()
  return (
    <fieldset>
      <legend className="text-[13px] font-semibold text-[#141414]">{label}{!required && <span className="ml-2 font-normal text-[#78716C]">opcional</span>}</legend>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer p-1 -m-0.5 rounded-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#141414]">
            <input type="radio" name={id} value={n} checked={value === n} onChange={() => onChange(n)} onClick={() => !required && value === n && onChange(0)} className="sr-only" required={required && !value} />
            <span className="sr-only">{n} de 5</span>
            {star ? (
              <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden>
                <path d={STAR} fill={n <= value ? '#141414' : 'none'} stroke="#141414" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            ) : (
              <span className={`block w-8 h-2 ${n <= value ? 'bg-[#141414]' : 'bg-[#141414]/15'}`} aria-hidden />
            )}
          </label>
        ))}
        {value > 0 && <span className="ml-3 text-[13px] text-[#57534E] tabular-nums">{value} de 5</span>}
      </div>
    </fieldset>
  )
}

const dateFmt = (iso) => new Intl.DateTimeFormat('es-SV', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso))

// Valoraciones de una fragancia. `preview` (solo en desarrollo) muestra datos de ejemplo
// rotulados como tales, para revisar el diseño antes de activar el sistema.
export default function Reviews({ name, preview = null, onSummary }) {
  const { session } = useAuth()
  const { openAccount } = useAccount()
  const { pathname } = useLocation()
  const [data, setData] = useState(preview ?? { available: false, count: 0, reviews: [] })
  const [status, setStatus] = useState(null)
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [longevity, setLongevity] = useState(0)
  const [projection, setProjection] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const load = useCallback(async () => {
    if (preview) return
    const next = await fetchReviews(name)
    setData(next)
    onSummary?.(next)
  }, [name, preview, onSummary])

  useEffect(() => {
    setOpen(false)
    setDone('')
    setError('')
    load()
  }, [load])

  // quién puede valorar lo decide el servidor
  useEffect(() => {
    if (preview) return
    if (!session) {
      setStatus({ can_review: false, reason: 'sin_sesion' })
      return
    }
    let alive = true
    fetchMyReviewStatus(name).then((s) => alive && setStatus(s))
    return () => { alive = false }
  }, [name, session, preview])

  const startForm = () => {
    const mine = status?.review
    setRating(mine?.rating ?? 0)
    setLongevity(mine?.longevity ?? 0)
    setProjection(mine?.projection ?? 0)
    setComment(mine?.comment ?? '')
    setError('')
    setDone('')
    setOpen(true)
  }

  const send = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!rating) {
      setError('Elige una calificación de 1 a 5 estrellas.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await submitReview({ name, rating, comment: comment.trim(), longevity, projection })
      setOpen(false)
      setDone('Gracias. Tu valoración ya está publicada.')
      setStatus(await fetchMyReviewStatus(name))
      await load()
    } catch (err) {
      setError(err.message || 'No pudimos guardar tu valoración. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (busy) return
    setBusy(true)
    try {
      await deleteMyReview(name)
      setOpen(false)
      setDone('Retiramos tu valoración.')
      setStatus(await fetchMyReviewStatus(name))
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const count = Number(data.count) || 0
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map((n) => Number(data.distribution?.[n]) || 0))

  return (
    <div>
      {preview && <p className="mb-6 inline-block border border-[#141414]/25 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#57534E]">Vista previa de diseño · datos de ejemplo, no reales</p>}

      {/* resumen: siempre visible; sin valoraciones, con ceros y un aviso en lugar de cifras inventadas */}
      <div className="grid sm:grid-cols-[auto_1fr] gap-x-14 gap-y-8 items-center">
        <div>
          <p className="leading-none" style={display}>
            <span className={`text-[4.5rem] ${count > 0 ? '' : 'text-[#141414]/30'}`}>{count > 0 ? Number(data.average).toFixed(1) : '—'}</span>
            <span className="ml-1 text-[1.6rem] text-[#78716C]">/ 5</span>
          </p>
          <Stars value={count > 0 ? Number(data.average) : 0} size={18} className="mt-3" />
          <p className="mt-2 text-[14px] text-[#57534E]">{count > 0 ? `${count} ${count === 1 ? 'valoración' : 'valoraciones'} de clientes` : 'Sin valoraciones todavía'}</p>
        </div>
        <div className="max-w-[420px] w-full">
          <ul className="space-y-1.5" aria-label="Distribución de calificaciones">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = Number(data.distribution?.[n]) || 0
              return (
                <li key={n} className="grid grid-cols-[5.5rem_1fr_1.6rem] items-center gap-3 whitespace-nowrap text-[13px] text-[#57534E] tabular-nums">
                  <span>{n} {n === 1 ? 'estrella' : 'estrellas'}</span>
                  <span className="h-1 bg-[#141414]/10"><span className="block h-full bg-[#141414]" style={{ width: `${(c / max) * 100}%` }} /></span>
                  <span className="text-right">{c}</span>
                </li>
              )
            })}
          </ul>
          {(data.longevity || data.projection) && (
            <dl className="mt-5 pt-5 border-t border-[#141414]/10 grid grid-cols-2 gap-4 text-[13px]">
              {data.longevity && <div><dt className="text-[#57534E]">Duración</dt><dd className="mt-0.5 font-semibold tabular-nums">{Number(data.longevity).toFixed(1)} de 5</dd></div>}
              {data.projection && <div><dt className="text-[#57534E]">Proyección</dt><dd className="mt-0.5 font-semibold tabular-nums">{Number(data.projection).toFixed(1)} de 5</dd></div>}
            </dl>
          )}
        </div>
      </div>
      {count === 0 && (
        <p className="mt-8 max-w-[52ch] text-[17px] leading-relaxed text-[#57534E]">
          Esta fragancia todavía no tiene valoraciones.{data.available && ' Sé el primero en compartir tu experiencia.'}
        </p>
      )}

      {/* si las valoraciones aún no están activadas en el servidor, el botón lo dice con claridad */}
      {!data.available && !preview && (
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="button" disabled className="dv-btn dv-btn--line opacity-45 cursor-not-allowed">Escribir una valoración</button>
          <p className="text-[13px] text-[#57534E]">Las valoraciones de clientes se activarán próximamente.</p>
        </div>
      )}

      {/* quién puede valorar */}
      {data.available && !preview && (
        <div className="mt-8">
          {done && <p role="status" className="mb-4 text-[14px] font-semibold text-[#141414]">{done}</p>}
          {status?.reason === 'sin_sesion' && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <button type="button" onClick={() => openAccount('login', { next: pathname })} className="dv-btn dv-btn--line">Ingresar para valorar</button>
              <p className="text-[13px] text-[#57534E]">Valoran quienes ya compraron esta fragancia.</p>
            </div>
          )}
          {status?.reason === 'sin_compra' && (
            <p className="max-w-[52ch] text-[14px] leading-relaxed text-[#57534E]">Las valoraciones son de clientes que compraron esta fragancia. Cuando tu pedido esté confirmado podrás compartir la tuya aquí.</p>
          )}
          {status?.can_review && !open && (
            <button type="button" onClick={startForm} className="dv-btn dv-btn--line">{status.review ? 'Editar mi valoración' : 'Valorar esta fragancia'}</button>
          )}

          {open && (
            <form onSubmit={send} className="mt-2 max-w-[560px] border border-[#141414]/12 bg-white p-5 sm:p-7 space-y-6" noValidate>
              <Scale label="Tu calificación" value={rating} onChange={setRating} required star />
              <div className="grid sm:grid-cols-2 gap-6">
                <Scale label="Duración en piel" value={longevity} onChange={setLongevity} />
                <Scale label="Proyección" value={projection} onChange={setProjection} />
              </div>
              <div>
                <label htmlFor="dv-review-text" className="text-[13px] font-semibold text-[#141414]">Tu experiencia<span className="ml-2 font-normal text-[#78716C]">opcional</span></label>
                <textarea id="dv-review-text" rows={4} maxLength={1200} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="¿Cómo se comporta en tu piel? ¿En qué ocasiones la usas?" className="mt-2 w-full border border-[#141414]/25 bg-white px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-[#141414] resize-y" />
              </div>
              {error && <p role="alert" className="text-[14px] text-red-700">{error}</p>}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <button type="submit" disabled={busy} aria-busy={busy} className="dv-btn dv-btn--solid disabled:opacity-60">{busy ? 'Publicando…' : status?.review ? 'Guardar cambios' : 'Publicar valoración'}</button>
                <button type="button" onClick={() => setOpen(false)} className="text-[14px] font-semibold underline underline-offset-4">Cancelar</button>
                {status?.review && <button type="button" onClick={remove} disabled={busy} className="ml-auto text-[13px] text-[#57534E] underline underline-offset-4 hover:text-[#141414]">Retirar mi valoración</button>}
              </div>
              <p className="text-[13px] leading-relaxed text-[#57534E]">Se publica con tu nombre de pila y la inicial de tu apellido, marcada como compra verificada.</p>
            </form>
          )}
        </div>
      )}

      {data.reviews?.length > 0 && (
        <ul className="mt-12 border-t border-[#141414]/10">
          {data.reviews.map((r) => (
            <li key={r.id} className="py-7 border-b border-[#141414]/10 grid sm:grid-cols-[13rem_1fr] gap-x-10 gap-y-3">
              <div>
                <Stars value={r.rating} size={15} />
                <p className="mt-2 text-[14px] font-semibold">{r.author}</p>
                <p className="text-[13px] text-[#57534E]">{dateFmt(r.created_at)}</p>
                {r.verified && <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#141414]"><span aria-hidden>✓</span> Compra verificada</p>}
              </div>
              <div>
                {r.comment
                  ? <p className="max-w-[62ch] text-[16px] leading-[1.7] text-[#141414] whitespace-pre-line">{r.comment}</p>
                  : <p className="text-[14px] text-[#78716C]">Calificó sin comentario.</p>}
                {(r.longevity || r.projection) && (
                  <p className="mt-3 text-[13px] text-[#57534E] tabular-nums">
                    {[r.longevity && `Duración ${r.longevity}/5`, r.projection && `Proyección ${r.projection}/5`].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
