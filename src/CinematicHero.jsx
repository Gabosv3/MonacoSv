import { useEffect, useRef, useState } from 'react'
import './CinematicHero.css'

const REDUCED_MOTION_MQ = '(prefers-reduced-motion: reduce)'

const BANDS = [
  { start: 0.0, end: 0.2, kicker: 'MonacoSV', headline: 'La noche empieza aquí.', entrance: 'entrance-drift', align: 'left' },
  { start: 0.2, end: 0.42, headline: 'Una esencia lo cambia todo.', entrance: 'entrance-blur', align: 'right' },
  { start: 0.42, end: 0.62, headline: 'La presencia habla primero.', entrance: '', align: 'left' },
  { start: 0.62, end: 0.84, headline: 'Lo demás sucede después.', entrance: 'entrance-punch', align: 'center-top' },
  { start: 0.84, end: 1.0, kicker: 'MonacoSV · Club de Nuit Intense', headline: 'La noche empieza aquí.', align: 'settle', settle: true },
]

function rng(seed) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
}

function splitHeadline(el) {
  const text = el.textContent.trim()
  const seed = [...text].reduce((a, c) => a + c.charCodeAt(0), 0)
  const rand = rng(seed + 7)
  const words = text.split(/\s+/)
  el.setAttribute('aria-label', text)
  el.innerHTML = ''
  words.forEach((word, wi) => {
    const wSpan = document.createElement('span')
    wSpan.className = 'cw'
    wSpan.setAttribute('aria-hidden', 'true')
    ;[...word].forEach((ch) => {
      const cSpan = document.createElement('span')
      cSpan.className = 'cc'
      cSpan.textContent = ch
      cSpan.style.setProperty('--th', (rand() * 0.55).toFixed(3))
      cSpan.style.setProperty('--jx', `${(rand() * 18 - 9).toFixed(1)}px`)
      cSpan.style.setProperty('--jy', `${(rand() * 14 + 4).toFixed(1)}px`)
      cSpan.style.setProperty('--jr', `${(rand() * 10 - 5).toFixed(1)}deg`)
      wSpan.appendChild(cSpan)
    })
    const wTh = (wi / Math.max(1, words.length)) * 0.6
    wSpan.style.setProperty('--th', wTh.toFixed(3))
    el.appendChild(wSpan)
    if (wi < words.length - 1) el.appendChild(document.createTextNode(' '))
  })
}

export default function CinematicHero({ whatsappHref, logoSrc, catalogHref = '#catalogo' }) {
  const [active, setActive] = useState(true)
  const [dismissing, setDismissing] = useState(false)
  const [ended, setEnded] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [isStatic, setIsStatic] = useState(false)

  const videoRef = useRef(null)
  const ringRef = useRef(null)
  const bandRefs = useRef([])

  // Estático (sin video) en celular, pantallas angostas o "reducir movimiento".
  useEffect(() => {
    const mq = matchMedia('(max-width: 720px), ' + REDUCED_MOTION_MQ)
    const apply = () => setIsStatic(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Bloquea el scroll de la página mientras la intro está activa.
  useEffect(() => {
    if (!active || isStatic) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [active, isStatic])

  useEffect(() => {
    bandRefs.current.forEach((b) => {
      if (!b) return
      const headline = b.querySelector('.cine-headline[data-split]')
      if (headline) splitHeadline(headline)
    })
  }, [])

  useEffect(() => {
    if (isStatic) return
    const video = videoRef.current
    const ring = ringRef.current
    const VIDEO_URL = '/hero/hero-scrub.mp4'
    let rafId = null

    function updateCaptions() {
      if (!video.duration) return
      const p = Math.min(1, video.currentTime / video.duration)
      bandRefs.current.forEach((b, i) => {
        if (!b) return
        const meta = BANDS[i]
        const a = meta.start, z = meta.end
        const f = Math.min(0.02, (z - a) / 3)
        const smoothstep = (x, e0, e1) => {
          const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
          return t * t * (3 - 2 * t)
        }
        let op
        if (i === 0) op = 1 - smoothstep(p, z - f, z)
        else if (i === BANDS.length - 1) op = smoothstep(p, a, a + f)
        else op = smoothstep(p, a, a + f) * (1 - smoothstep(p, z - f, z))
        const ramp = Math.min(0.025, (z - a) * 0.35)
        const k = Math.min(1, Math.max(0, (p - a) / ramp))
        b.style.opacity = String(op)
        b.style.setProperty('--k', String(k))
      })
    }

    function tick() {
      updateCaptions()
      if (!video.ended) rafId = requestAnimationFrame(tick)
    }

    function onCanPlay() {
      setVideoReady(true)
      video.play().catch(() => {})
      rafId = requestAnimationFrame(tick)
    }
    function onEnded() {
      setEnded(true)
      bandRefs.current.forEach((b, i) => {
        if (!b) return
        b.style.opacity = i === BANDS.length - 1 ? '1' : '0'
        b.style.setProperty('--k', '1')
      })
    }
    function onError() { setVideoFailed(true) }

    video.addEventListener('canplay', onCanPlay, { once: true })
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    video.src = VIDEO_URL
    video.load()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
    }
  }, [isStatic])

  if (isStatic) {
    return (
      <div className="cine-hero cine-hero-static-only">
        <div className="cine-static-hero" style={{ backgroundImage: "url('/hero/hero-ending.jpg')" }}>
          <p className="cine-kicker">MonacoSV</p>
          <h1 className="cine-headline">La noche empieza aquí.</h1>
          <p className="cine-sub">Fragancias de larga duración y proyección real.</p>
          <a className="cine-cta" href={catalogHref}>Ver la colección</a>
        </div>
      </div>
    )
  }

  if (!active) return null

  return (
    <div className="cine-hero">
      <div className={`cine-hero-stage cine-intro-lock${videoReady ? ' cine-video-ready' : ''}${videoFailed ? ' cine-video-failed' : ''}${dismissing ? ' cine-dismissing' : ''}`}>
        <div className="cine-nav">
          <div className="cine-nav-brand">
            {logoSrc && <img src={logoSrc} alt="MonacoSV" />}
            <span>MonacoSV</span>
          </div>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="cine-nav-cta">
            Escríbenos
          </a>
        </div>

        <div className="cine-hero-media">
          <div className="cine-poster" style={{ backgroundImage: "url('/hero/hero-poster.jpg')" }} aria-hidden="true" />
          <video ref={videoRef} className="cine-video" muted playsInline aria-hidden="true" tabIndex={-1} preload="auto" />
          <div className="cine-scrim" aria-hidden="true" />
        </div>

        {!videoReady && !videoFailed && (
          <div className="cine-ring-wrap" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(201,162,39,.25)" strokeWidth="3" />
              <circle
                ref={ringRef}
                cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray="126" strokeDashoffset="40" strokeLinecap="round"
                transform="rotate(-90 24 24)"
                className="cine-ring-spin"
              />
            </svg>
          </div>
        )}

        <div className="cine-hero-bands">
          {BANDS.map((b, i) => (
            <div
              key={i}
              className={`cine-band${b.settle ? ' cine-band-settle' : ''}`}
              data-align={b.align}
              ref={(el) => (bandRefs.current[i] = el)}
            >
              <div className="cine-band-inner">
                {b.kicker && <p className="cine-kicker">{b.kicker}</p>}
                {!b.settle && (
                  <h2 className={`cine-headline ${b.entrance || ''}`} data-split>
                    {b.headline}
                  </h2>
                )}
                {b.settle && (
                  <button
                    type="button"
                    className="cine-cta cine-skip-end"
                    disabled={!ended || dismissing}
                    onClick={() => {
                      setDismissing(true)
                      setTimeout(() => setActive(false), 950)
                    }}
                  >
                    Ver tienda ↓
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
