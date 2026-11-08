import { useEffect, useMemo, useRef, useState } from 'react'
import './CinematicHero.css'
import { useSettings } from './settings'

const REDUCED_MOTION_MQ = '(prefers-reduced-motion: reduce)'

const ALIGNS = ['left', 'right', 'left', 'center-top']
const ENTRANCES = ['entrance-drift', 'entrance-blur', '', 'entrance-punch']
const DEFAULT_VIDEO = '/hero/hero-scrub.mp4'
const DEFAULT_POSTER = '/hero/hero-poster.jpg'
const DEFAULT_ENDING = '/hero/hero-ending.jpg'

// Las frases (una por línea en Ajustes) se reparten a lo largo del video; la
// última franja es el cierre con el botón.
function buildBands(phrases, endKicker) {
  const list = phrases.length ? phrases : ['']
  const span = 0.84 / list.length
  const bands = list.map((headline, i) => ({
    start: i * span,
    end: (i + 1) * span,
    kicker: i === 0 ? '{brand}' : undefined,
    headline,
    entrance: ENTRANCES[i % ENTRANCES.length],
    align: ALIGNS[i % ALIGNS.length],
  }))
  bands.push({ start: 0.84, end: 1.0, kicker: `{brand} · ${endKicker}`, align: 'settle', settle: true })
  return bands
}

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

export default function CinematicHero({ whatsappHref, logoSrc, catalogHref = '#catalogo', onDismiss, skipIntro = false }) {
  const { cfg } = useSettings()
  const brand = cfg.store_name
  const phrases = useMemo(() => String(cfg.intro_phrases).split('\n').map((p) => p.trim()).filter(Boolean).slice(0, 8), [cfg.intro_phrases])
  const bands = useMemo(() => buildBands(phrases, cfg.intro_end_kicker), [phrases, cfg.intro_end_kicker])
  const bandsKey = phrases.join('|')
  const videoUrl = cfg.intro_video_url || DEFAULT_VIDEO
  const poster = cfg.intro_poster_url || DEFAULT_POSTER
  const introOff = cfg.intro_enabled === '0'
  const [active, setActive] = useState(!skipIntro)
  const [dismissing, setDismissing] = useState(false)
  const [ended, setEnded] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [reduced, setReduced] = useState(false)
  const isStatic = reduced || introOff

  const videoRef = useRef(null)
  const ringRef = useRef(null)
  const bandRefs = useRef([])

  // Estático (sin video) solo si la persona pidió "reducir movimiento" o la intro está apagada.
  useEffect(() => {
    const mq = matchMedia(REDUCED_MOTION_MQ)
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // En la versión estática no hay intro que saltarse: el resto de la
  // tienda (como el carrusel) puede arrancar de una vez.
  useEffect(() => {
    if (isStatic) onDismiss?.()
  }, [isStatic])

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
      const headline = b?.querySelector('.cine-headline[data-split]')
      if (headline) splitHeadline(headline)
    })
  }, [bandsKey, isStatic, active])

  useEffect(() => {
    if (isStatic || !active) return
    const video = videoRef.current
    if (!video) return
    const ring = ringRef.current
    let rafId = null

    function updateCaptions() {
      if (!video.duration) return
      const p = Math.min(1, video.currentTime / video.duration)
      bandRefs.current.forEach((b, i) => {
        if (!b) return
        const meta = bands[i]
        const a = meta.start, z = meta.end
        const f = Math.min(0.02, (z - a) / 3)
        const smoothstep = (x, e0, e1) => {
          const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
          return t * t * (3 - 2 * t)
        }
        let op
        if (i === 0) op = 1 - smoothstep(p, z - f, z)
        else if (i === bands.length - 1) op = smoothstep(p, a, a + f)
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

    // Deja a la vista el cierre con el botón (video terminado o que no se pudo reproducir)
    function showEnding() {
      setEnded(true)
      bandRefs.current.forEach((b, i) => {
        if (!b) return
        b.style.opacity = i === bands.length - 1 ? '1' : '0'
        b.style.setProperty('--k', '1')
      })
    }
    function fail() {
      setVideoFailed(true)
      showEnding()
    }
    function onCanPlay() {
      setVideoReady(true)
      // algunos celulares (ahorro de batería) bloquean el autoplay: no se deja a la persona atrapada
      video.play().catch(fail)
      rafId = requestAnimationFrame(tick)
    }

    // si el video no carga en 10 s (señal débil), se muestra el botón igual
    const timeout = setTimeout(() => { if (!video.duration) fail() }, 10000)

    video.addEventListener('canplay', onCanPlay, { once: true })
    video.addEventListener('ended', showEnding)
    video.addEventListener('error', fail)
    video.src = videoUrl
    video.load()

    return () => {
      clearTimeout(timeout)
      if (rafId) cancelAnimationFrame(rafId)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('ended', showEnding)
      video.removeEventListener('error', fail)
    }
  }, [isStatic, bands, videoUrl])

  if (isStatic) {
    return (
      <div className="cine-hero cine-hero-static-only">
        <div className="cine-static-hero" style={{ backgroundImage: `url('${cfg.intro_poster_url || DEFAULT_ENDING}')` }}>
          <p className="cine-kicker">{brand}</p>
          <h1 className="cine-headline">{phrases[0] ?? brand}</h1>
          <p className="cine-sub">{cfg.tagline}</p>
          <a className="cine-cta" href={catalogHref}>{cfg.intro_button}</a>
        </div>
      </div>
    )
  }

  if (!active) return null

  const leave = () => {
    setDismissing(true)
    setTimeout(() => {
      setActive(false)
      onDismiss?.()
    }, 950)
  }

  return (
    <div className="cine-hero">
      <div className={`cine-hero-stage cine-intro-lock${videoReady ? ' cine-video-ready' : ''}${videoFailed ? ' cine-video-failed' : ''}${dismissing ? ' cine-dismissing' : ''}`}>
        <div className="cine-nav">
          <div className="cine-nav-brand">
            {logoSrc && <img src={logoSrc} alt={brand} />}
            <span>{brand}</span>
          </div>
          <div className="cine-nav-actions">
            <button type="button" className="cine-nav-cta" onClick={leave}>Saltar</button>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="cine-nav-cta">
              Escríbenos
            </a>
          </div>
        </div>

        <div className="cine-hero-media">
          <div className="cine-poster" style={{ backgroundImage: `url('${poster}')` }} aria-hidden="true" />
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

        <div className="cine-hero-bands" key={bandsKey}>
          {bands.map((b, i) => (
            <div
              key={i}
              className={`cine-band${b.settle ? ' cine-band-settle' : ''}`}
              data-align={b.align}
              ref={(el) => (bandRefs.current[i] = el)}
            >
              <div className="cine-band-inner">
                {b.kicker && <p className="cine-kicker">{b.kicker.replace('{brand}', brand)}</p>}
                {!b.settle && (
                  <h2 className={`cine-headline ${b.entrance || ''}`} data-split>
                    {b.headline}
                  </h2>
                )}
                {b.settle && (
                  <button
                    type="button"
                    className="cine-cta cine-skip-end"
                    disabled={(!ended && !videoFailed) || dismissing}
                    onClick={leave}
                  >
                    {cfg.intro_button} ↓
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
