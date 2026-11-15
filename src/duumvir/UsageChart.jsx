import { motion, useReducedMotion } from 'framer-motion'
import { Stars } from './Reviews'
import { USAGE_GROUPS } from './experienceApi'

const EASE = [0.19, 1, 0.22, 1]
const R = 88 // radio del valor máximo (5)
const point = (i, n, value) => {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180)
  const r = (R * value) / 5
  return [Math.cos(a) * r, Math.sin(a) * r]
}
const path = (pts) => pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')
const filled = (g, usage) => g.axes.filter(([key]) => usage?.[key] > 0).length
// un radar necesita al menos tres valores para dibujar su polígono; las barras, uno
const shown = (g, usage) => filled(g, usage) >= (g.bars ? 1 : 3)

// Radar de seis ejes: retícula, ejes y etiquetas siempre; el polígono solo con datos reales.
function Radar({ title, axes, usage, alwaysShow = false }) {
  const reduce = useReducedMotion()
  const n = axes.length
  const hasData = filled({ axes }, usage) >= 3
  const values = axes.map(([key]) => usage?.[key] ?? 0)
  const shape = values.map((v, i) => point(i, n, v))
  return (
    <figure className="m-0">
      <figcaption className="text-[13px] font-semibold text-[#141414]">{title}</figcaption>
      <div className="mt-2 max-w-[520px]">
        <svg viewBox="-205 -128 410 256" className="w-full" role="img" aria-label={`${title}: ${hasData ? axes.map(([key, label]) => `${label} ${usage[key] ? `${usage[key]} de 5` : 'sin dato'}`).join(', ') : 'todavía sin puntuaciones'}`}>
          {[1, 2, 3, 4, 5].map((ring) => (
            <polygon key={ring} points={path(axes.map((_, i) => point(i, n, ring)))} fill="none" stroke="#141414" strokeOpacity={ring === 5 ? 0.3 : 0.12} strokeWidth="1" strokeDasharray={hasData ? undefined : ring === 5 ? undefined : '2 3'} />
          ))}
          {axes.map((_, i) => {
            const [x, y] = point(i, n, 5)
            return <line key={i} x1="0" y1="0" x2={x} y2={y} stroke="#141414" strokeOpacity="0.12" strokeWidth="1" />
          })}
          {hasData && (
            <motion.g
              initial={reduce ? false : { opacity: 0, scale: 0.55 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, ease: EASE }}
              style={{ transformOrigin: '0px 0px' }}
            >
              <polygon points={path(shape)} fill="#141414" fillOpacity="0.07" stroke="#141414" strokeWidth="1.4" strokeLinejoin="round" />
              {shape.map(([x, y], i) => values[i] > 0 && <circle key={i} cx={x} cy={y} r="2.8" fill="#141414" />)}
            </motion.g>
          )}
          {!hasData && <circle cx="0" cy="0" r="2.4" fill="#141414" fillOpacity="0.35" />}
          {axes.map(([key, label], i) => {
            const [x, y] = point(i, n, 5)
            const anchor = Math.abs(x) < 8 ? 'middle' : x > 0 ? 'start' : 'end'
            const dy = y < -8 ? -6 : y > 8 ? 14 : 4
            return (
              <text key={key} x={x * 1.2} y={y * 1.2 + dy} textAnchor={anchor} fontSize="12" fill="#141414" fontFamily="Manrope, system-ui, sans-serif">
                <tspan fontWeight="600">{label}</tspan>
                <tspan fill="#78716C" dx="5">{usage?.[key] ? `${usage[key]}/5` : '—'}</tspan>
              </text>
            )
          })}
        </svg>
        {!hasData && alwaysShow && (
          <p className="mt-2 text-center text-[13px] text-[#57534E]">Las puntuaciones de uso todavía no están disponibles.</p>
        )}
      </div>
    </figure>
  )
}

// Grupo de pocos valores (clima): una barra fina por eje
function Bars({ title, axes, usage }) {
  const reduce = useReducedMotion()
  return (
    <div>
      <p className="text-[13px] font-semibold text-[#141414]">{title}</p>
      <dl className="mt-4 grid sm:grid-cols-2 gap-x-12 gap-y-5 max-w-[640px]">
        {axes.filter(([key]) => usage[key] > 0).map(([key, label]) => (
          <div key={key}>
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="font-semibold text-[#141414]">{label}</dt>
              <dd className="tabular-nums text-[#78716C]">{usage[key]}/5</dd>
            </div>
            <div className="mt-2 h-px bg-[#141414]/15 relative" aria-hidden>
              <motion.span
                className="absolute left-0 -top-px h-[3px] bg-[#141414] origin-left"
                style={{ width: `${(usage[key] / 5) * 100}%` }}
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE }}
              />
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}

// Radar de uso (momento y temporada) siempre visible; ocasión y clima, solo con datos.
// Son recomendaciones editoriales de la tienda, no valoraciones de clientes.
export default function UsageChart({ usage }) {
  const [moment, ...others] = USAGE_GROUPS.filter((g) => !g.bars && !g.scale)
  const radars = others.filter((g) => shown(g, usage))
  const bars = USAGE_GROUPS.filter((g) => g.bars && shown(g, usage))
  return (
    <div>
      <div className="grid gap-14">
        <Radar title={moment.title} axes={moment.axes} usage={usage} alwaysShow />
        {radars.map((g) => <Radar key={g.key} title={g.title} axes={g.axes} usage={usage} />)}
      </div>
      {bars.map((g) => (
        <div key={g.key} className="mt-10 pt-8 border-t border-[#141414]/10">
          <Bars title={g.title} axes={g.axes} usage={usage} />
        </div>
      ))}
      <p className="mt-10 max-w-[62ch] text-[13px] leading-relaxed text-[#57534E]">
        Recomendación editorial de DUUMVIR, en escala de 1 a 5; no son valoraciones de clientes. Es una orientación, no una medición: el desempeño de un perfume cambia con el clima, la piel y el gusto de cada persona.
      </p>
    </div>
  )
}

// ---------- indicadores: valoración, perfil, proyección y duración ----------

// Escala horizontal fina con cinco marcas y un marcador. Sin valor: línea punteada y aviso.
function Scale({ label, left, right, position, valueText, source }) {
  const reduce = useReducedMotion()
  const has = position != null
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13px] font-semibold text-[#141414]">{label}</p>
        <p className="text-[13px] tabular-nums text-[#78716C]">{has ? valueText : 'Sin datos todavía'}</p>
      </div>
      <div className="relative mt-5 h-3" role="img" aria-label={has ? `${label}: ${valueText}` : `${label}: sin datos todavía`}>
        <span className={`absolute left-0 right-0 top-1/2 h-px ${has ? 'bg-[#141414]/30' : 'border-t border-dashed border-[#141414]/25 h-0'}`} />
        {[0, 1, 2, 3, 4].map((t) => (
          <span key={t} className="absolute top-1/2 w-px h-2 -translate-y-1/2 bg-[#141414]/25" style={{ left: `${t * 25}%` }} />
        ))}
        {has && (
          <motion.span
            className="absolute top-1/2 w-3 h-3 rounded-full bg-[#141414] -translate-y-1/2 -translate-x-1/2"
            initial={reduce ? { left: `${position * 100}%` } : { left: '0%' }}
            whileInView={{ left: `${position * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-[#57534E]"><span>{left}</span><span>{right}</span></div>
      {has && source && <p className="mt-1 text-[12px] text-[#78716C]">{source}</p>}
    </div>
  )
}

// Valoración general y escalas de la fragancia. Cada dato dice de dónde viene:
// la categoría de la tienda, la recomendación editorial o el promedio de clientes.
export function Indicators({ f, usage, summary }) {
  const count = Number(summary?.count) || 0
  const pos = (v) => (v > 0 ? (v - 1) / 4 : null)
  const editorial = (key) => (usage?.[key] > 0 ? { v: usage[key], source: 'Recomendación editorial' } : null)
  const clients = (v) => (Number(v) > 0 ? { v: Number(v), source: 'Promedio de clientes' } : null)
  const proj = editorial('proyeccion') ?? clients(summary?.projection)
  const dur = editorial('duracion') ?? clients(summary?.longevity)
  const profile = f.category ? { masculino: 0, unisex: 0.5, femenino: 1 }[{ hombre: 'masculino', mujer: 'femenino', unisex: 'unisex' }[f.gender]] : null
  const profileText = { 0: 'Masculino', 0.5: 'Unisex', 1: 'Femenino' }[profile]

  return (
    <div className="grid sm:grid-cols-2 gap-x-14 gap-y-10">
      <div>
        <p className="text-[13px] font-semibold text-[#141414]">Valoración general</p>
        {count > 0 ? (
          <div className="mt-3 flex items-end gap-4">
            <p className="leading-none" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
              <span className="text-[3.5rem]">{Number(summary.average).toFixed(1)}</span>
              <span className="ml-1 text-[1.3rem] text-[#78716C]">/ 5</span>
            </p>
            <div className="pb-1.5">
              <Stars value={Number(summary.average)} size={16} />
              <p className="mt-1 text-[13px] text-[#57534E] tabular-nums">{count} {count === 1 ? 'valoración' : 'valoraciones'}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <Stars value={0} size={18} />
            <p className="mt-2 text-[13px] text-[#57534E]">Todavía no hay valoraciones de clientes.</p>
          </div>
        )}
      </div>
      <Scale label="Perfil" left="Masculino" right="Femenino" position={profile} valueText={profileText} source="Según la categoría en la tienda" />
      <Scale label="Proyección" left="Suave" right="Intensa" position={pos(proj?.v)} valueText={proj && `${proj.v} de 5`} source={proj?.source} />
      <Scale label="Duración" left="Corta" right="Todo el día" position={pos(dur?.v)} valueText={dur && `${dur.v} de 5`} source={dur?.source} />
    </div>
  )
}

// ¿Hay datos de uso? (se conserva por compatibilidad)
export const hasUsage = (usage) => USAGE_GROUPS.some((g) => shown(g, usage))
