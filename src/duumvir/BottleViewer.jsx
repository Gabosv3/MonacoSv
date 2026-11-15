import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// Visor 3D de Odyssey Mandarin Sky Limited Edition (Armaf).
// Todo el frasco es geometría real: funda de piel torneada con surcos de costura,
// correa con presilla curva, puntadas individuales, tapa en dos cuerpos y asa lateral.
// Las medidas salen de la foto frontal de referencia (1 unidad = radio del cuerpo).
// Se carga aparte (import dinámico) para no pesar en el resto de la página.

const T = 1.015 // media altura del cuerpo
const BLUE = '#249fd2'
const BLUE_INK = '#125d85' // inscripciones: el mismo azul, prensado y más oscuro
const ORANGE = '#ee8420'
const THREAD = '#1a2730'
const STRAP_Y = 0.557
const STITCH_TOP = T - 0.06
const STITCH_BOTTOM = -T + 0.075
const SEAMS = [-1.28, 1.28] // uniones verticales de la funda (ángulo desde el frente)
const HOME = { yaw: -0.5, pitch: 0.12 } // tres cuartos: se ve el frente y el volumen del asa
const VIEWS = {
  inicio: HOME,
  frente: { yaw: 0, pitch: 0.04 },
  lateral: { yaw: -Math.PI / 2, pitch: 0.06 },
  superior: { yaw: -0.5, pitch: 1.05 },
  base: { yaw: -0.5, pitch: -1.1 },
}
const PITCH = [-1.2, 1.2]
const CAM = 9.6
const ZOOM = [0.58, 1.22]
const SCRIPT_FONT = "'Gochi Hand', 'Segoe Print', 'Bradley Hand', cursive"
const SANS_FONT = "Manrope, 'Gill Sans', Arial, sans-serif"

// ---------- mapas de superficie ----------

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Relieve de piel: celdas irregulares (Voronoi) con valles suaves entre ellas.
// Es un mosaico: los bordes casan, así que se puede repetir sin costura.
function leatherHeight(size, cell) {
  const n = Math.max(4, Math.round(size / cell))
  const c = size / n
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const jx = new Float32Array(n * n)
  const jy = new Float32Array(n * n)
  const lift = new Float32Array(n * n)
  for (let i = 0; i < n * n; i++) {
    jx[i] = 0.15 + rnd() * 0.7
    jy[i] = 0.15 + rnd() * 0.7
    lift[i] = rnd()
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')
  const img = g.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    const gy = Math.floor(y / c)
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / c)
      let d1 = 1e9
      let d2 = 1e9
      let id = 0
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const k = ((gy + oy + n) % n) * n + ((gx + ox + n) % n)
          const dx = (gx + ox + jx[k]) * c - x
          const dy = (gy + oy + jy[k]) * c - y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < d1) { d2 = d1; d1 = d; id = k } else if (d < d2) d2 = d
        }
      }
      // meseta en el centro de la celda, valle en el borde
      const v = 78 + smooth(0, 0.42, (d2 - d1) / c) * (112 + lift[id] * 34) + (rnd() - 0.5) * 7
      const p = (y * size + x) * 4
      img.data[p] = img.data[p + 1] = img.data[p + 2] = v
      img.data[p + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  return canvas
}

// Grano fino del plástico de la tapa: moteado muy pequeño y suave
function speckleHeight(size) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')
  const img = g.createImageData(size, size)
  let seed = 5
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (rnd() - 0.5) * 120
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  // un desenfoque leve quita el aspecto de ruido digital (se dibuja repetido para que siga casando)
  const soft = document.createElement('canvas')
  soft.width = soft.height = size
  const s = soft.getContext('2d')
  s.filter = 'blur(0.8px)'
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) s.drawImage(canvas, ox, oy)
  return soft
}

// mapa de normales a partir de un relieve en grises (u repetible; v sin repetir si wrapY = false)
function normalFromHeight(src, strength, wrapY = true) {
  const w = src.width
  const h = src.height
  const d = src.getContext('2d').getImageData(0, 0, w, h).data
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const g = out.getContext('2d')
  const img = g.createImageData(w, h)
  const o = img.data
  const k = strength / 255
  for (let y = 0; y < h; y++) {
    const up = wrapY ? (y - 1 + h) % h : Math.max(0, y - 1)
    const dn = wrapY ? (y + 1) % h : Math.min(h - 1, y + 1)
    for (let x = 0; x < w; x++) {
      const l = d[(y * w + ((x - 1 + w) % w)) * 4]
      const r = d[(y * w + ((x + 1) % w)) * 4]
      const nx = -(r - l) * k
      const ny = (d[(dn * w + x) * 4] - d[(up * w + x) * 4]) * k // v crece hacia arriba; el lienzo, hacia abajo
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1)
      const p = (y * w + x) * 4
      o[p] = (nx * inv * 0.5 + 0.5) * 255
      o[p + 1] = (ny * inv * 0.5 + 0.5) * 255
      o[p + 2] = (inv * 0.5 + 0.5) * 255
      o[p + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  return out
}

const texture = (canvas, { srgb = false, repeat } = {}) => {
  const t = new THREE.CanvasTexture(canvas)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat[0], repeat[1])
  } else {
    t.wrapS = THREE.RepeatWrapping // la funda da la vuelta completa
  }
  return t
}

// texto mayúsculo repartido en un ancho exacto (interletrado manual)
function spaced(g, text, cx, y, width) {
  const widths = [...text].map((ch) => g.measureText(ch).width)
  const gap = (width - widths.reduce((s, w) => s + w, 0)) / (text.length - 1)
  let x = cx - width / 2
  ;[...text].forEach((ch, i) => {
    g.fillText(ch, x, y)
    x += widths[i] + gap
  })
}

// Funda: color, normales y rugosidad sobre el desarrollo del cilindro.
// u = vuelta completa (frente en el centro); v = recorrido por el perfil, desde arriba.
// `length` es el largo del perfil y `inset` lo que mide el doblez superior antes de la pared.
function sleeveMaps(px, length, inset) {
  const w = px
  const unit = w / (2 * Math.PI) // píxeles por unidad de escena
  const h = Math.round(length * unit)
  const cx = w / 2
  const at = (fromTop) => (fromTop + inset) * unit

  const inscriptions = (g) => {
    g.textBaseline = 'middle'
    g.textAlign = 'left'
    g.font = `700 ${0.118 * unit}px ${SANS_FONT}`
    spaced(g, 'ODYSSEY', cx, at(0.878), 0.93 * unit)
    g.font = `700 ${0.104 * unit}px ${SANS_FONT}`
    spaced(g, 'EAU DE PARFUM', cx, at(1.292), 0.88 * unit)
    spaced(g, 'LIMITED EDITION', cx, at(1.736), 0.9 * unit)
    g.textAlign = 'center'
    g.font = `${0.2 * unit}px ${SCRIPT_FONT}`
    g.fillText('Mandarinsky', cx, at(1.092))
  }
  const blank = () => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }
  const cell = Math.max(7, Math.round(unit * 0.02))
  const grain = leatherHeight(512, cell)

  // relieve: grano de piel, uniones verticales y letras prensadas
  const height = blank()
  let g = height.getContext('2d')
  g.fillStyle = g.createPattern(grain, 'repeat')
  g.fillRect(0, 0, w, h)
  g.filter = `blur(${unit * 0.006}px)`
  g.strokeStyle = 'rgba(0,0,0,0.75)'
  g.lineWidth = unit * 0.02
  for (const a of SEAMS) {
    const x = cx + (a / (2 * Math.PI)) * w
    g.beginPath()
    g.moveTo(x, at(0.06))
    g.lineTo(x, h - at(0.04))
    g.stroke()
  }
  g.filter = `blur(${unit * 0.0035}px)`
  g.fillStyle = 'rgba(0,0,0,0.8)'
  inscriptions(g)
  g.filter = 'none'

  // color: azul con los valles apenas más oscuros y las letras en tinta
  const color = blank()
  g = color.getContext('2d')
  g.fillStyle = BLUE
  g.fillRect(0, 0, w, h)
  g.globalCompositeOperation = 'multiply'
  g.globalAlpha = 0.16
  g.fillStyle = g.createPattern(grain, 'repeat')
  g.fillRect(0, 0, w, h)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.fillStyle = BLUE_INK
  inscriptions(g)

  // rugosidad: piel satinada; el prensado de las letras queda algo más liso
  const rough = blank()
  g = rough.getContext('2d')
  g.fillStyle = 'rgb(158,158,158)'
  g.fillRect(0, 0, w, h)
  g.globalAlpha = 0.22
  g.globalCompositeOperation = 'difference'
  g.fillStyle = g.createPattern(grain, 'repeat')
  g.fillRect(0, 0, w, h)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.fillStyle = 'rgb(112,112,112)'
  inscriptions(g)

  return {
    map: texture(color, { srgb: true }),
    normalMap: texture(normalFromHeight(height, 3.4, false)),
    roughnessMap: texture(rough),
    grain,
    cellUnits: 512 / unit, // cuánto mide el mosaico de grano, en unidades de escena
  }
}

// ---------- geometría ----------

const v2 = (x, y) => new THREE.Vector2(x, y)

// puntos de un arco (para biseles y cantos redondos en los perfiles)
function arc(cx, cy, r, from, to, steps = 8) {
  const out = []
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps
    out.push(v2(cx + Math.cos(a) * r, cy + Math.sin(a) * r))
  }
  return out
}

// Sólido de revolución con la unión atrás. v sigue el largo real del perfil, así la
// textura no se estira en los cantos. Devuelve también ese largo.
function lathe(points, segments = 160) {
  const geo = new THREE.LatheGeometry(points, segments, Math.PI, Math.PI * 2)
  const cum = [0]
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + points[i].distanceTo(points[i - 1]))
  const total = cum[cum.length - 1]
  const uv = geo.attributes.uv
  const n = points.length
  for (let i = 0; i < uv.count; i++) uv.setY(i, cum[i % n] / total)
  geo.userData.length = total
  return geo
}

// tapa plana para cerrar un sólido de revolución sin vértice central en la textura
function disc(radius, y, up) {
  const geo = new THREE.CircleGeometry(radius, 96)
  geo.rotateX(up ? -Math.PI / 2 : Math.PI / 2)
  geo.translate(0, y, 0)
  return geo
}

// curva una pieza recta alrededor del cuerpo (posiciones y normales)
function wrapAround(geo, radius) {
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i) / radius
    const r = radius + pos.getZ(i)
    pos.setX(i, Math.sin(a) * r)
    pos.setZ(i, Math.cos(a) * r)
    const nx = nor.getX(i)
    const nz = nor.getZ(i)
    nor.setX(i, nx * Math.cos(a) + nz * Math.sin(a))
    nor.setZ(i, -nx * Math.sin(a) + nz * Math.cos(a))
  }
  pos.needsUpdate = true
  nor.needsUpdate = true
  return geo
}

function buildGeometry() {
  const H = Math.PI / 2
  // funda: canto inferior, surco de costura, pared, surco superior y doblez del borde
  const groove = (y) => [v2(1, y - 0.011), v2(0.9935, y - 0.004), v2(0.9935, y + 0.004), v2(1, y + 0.011)]
  const body = lathe([
    v2(0.93, -T),
    ...arc(0.955, -T + 0.045, 0.045, -H, 0),
    ...groove(STITCH_BOTTOM),
    ...groove(STITCH_TOP),
    ...arc(0.97, T - 0.03, 0.03, 0, H),
    v2(0.945, T),
  ])
  const base = disc(0.931, -T, false)
  const collar = new THREE.RingGeometry(0.8, 0.946, 96)
  collar.rotateX(-H)
  collar.translate(0, T, 0)

  // correa: banda con cantos redondos
  const y0 = STRAP_Y - 0.152
  const y1 = STRAP_Y + 0.152
  const strap = lathe([
    v2(0.998, y0),
    ...arc(1.016, y0 + 0.02, 0.02, -H, 0, 6),
    ...arc(1.016, y1 - 0.02, 0.02, 0, H, 6),
    v2(0.998, y1),
  ])
  // presilla: sigue la curva del cuerpo en lugar de ser un bloque recto
  const keeper = wrapAround(new RoundedBoxGeometry(0.24, 0.372, 0.07, 6, 0.028).translate(0, STRAP_Y, 0.035), 1.03)

  // tapa naranja: faldón, hombro redondo, ranura, labio y cilindro superior
  const cap = lathe([
    v2(0.835, T - 0.03),
    v2(0.835, T + 0.25),
    ...arc(0.75, T + 0.25, 0.085, 0, H),
    v2(0.7, T + 0.335),
    ...arc(0.7, T + 0.355, 0.02, -H, -Math.PI, 5).map((p) => v2(Math.max(p.x, 0.672), p.y)),
    v2(0.672, T + 0.37),
    ...arc(0.672, T + 0.388, 0.018, -H, 0, 5),
    v2(0.69, T + 0.42),
    ...arc(0.678, T + 0.42, 0.012, 0, H, 4),
    v2(0.678, T + 0.864),
    ...arc(0.598, T + 0.864, 0.08, 0, H, 10),
  ])
  const capTop = disc(0.5985, T + 0.944, true)

  // asa: lazo rectangular de esquinas redondas y cantos biselados, que nace en la tapa
  const yb = 1.2
  const yt = 1.915
  const xr = 1.264
  const outer = new THREE.Shape()
  const ro = 0.115
  outer.moveTo(0.5, yb)
  outer.lineTo(xr - ro, yb)
  outer.absarc(xr - ro, yb + ro, ro, -H, 0, false)
  outer.lineTo(xr, yt - ro)
  outer.absarc(xr - ro, yt - ro, ro, 0, H, false)
  outer.lineTo(0.5, yt)
  outer.closePath()
  const hole = new THREE.Path()
  const ri = 0.062
  const hx = xr - 0.135
  const hb = yb + 0.15
  const ht = yt - 0.135
  hole.moveTo(0.55, hb)
  hole.lineTo(0.55, ht)
  hole.lineTo(hx - ri, ht)
  hole.absarc(hx - ri, ht - ri, ri, H, 0, true)
  hole.lineTo(hx, hb + ri)
  hole.absarc(hx - ri, hb + ri, ri, 0, -H, true)
  hole.closePath()
  outer.holes.push(hole)
  const depth = 0.3
  const handle = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 6, curveSegments: 28 })
  handle.translate(0, 0, -depth / 2)

  const stitch = new THREE.CapsuleGeometry(0.0072, 0.03, 4, 10)
  return { body, base, collar, strap, keeper, cap, capTop, handle, stitch }
}

// Costuras: puntadas individuales, medio hundidas en su surco y con la leve
// inclinación del hilo; en el borde superior, el inferior y las dos uniones.
function stitchMatrices() {
  const out = []
  const o = new THREE.Object3D()
  o.rotation.order = 'YXZ'
  const R = 0.9975
  const n = 92
  for (const y of [STITCH_TOP, STITCH_BOTTOM]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      o.position.set(Math.sin(a) * R, y, Math.cos(a) * R)
      o.rotation.set(0, a, Math.PI / 2 - 0.1)
      o.updateMatrix()
      out.push(o.matrix.clone())
    }
  }
  for (const a of SEAMS) {
    for (let y = STITCH_BOTTOM + 0.07; y <= STITCH_TOP - 0.06; y += 0.064) {
      if (y > STRAP_Y - 0.19 && y < STRAP_Y + 0.19) continue // bajo la correa no se ven
      o.position.set(Math.sin(a) * 1.0005, y, Math.cos(a) * 1.0005)
      o.rotation.set(0, a, 0.1)
      o.updateMatrix()
      out.push(o.matrix.clone())
    }
  }
  return out
}

// ---------- estudio: paneles de luz que el frasco refleja ----------

function Studio() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const room = new THREE.Scene()
    const made = []
    const panel = (w, h, pos, level, tint = '#ffffff') => {
      const geo = new THREE.PlaneGeometry(w, h)
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(level), side: THREE.DoubleSide })
      const m = new THREE.Mesh(geo, mat)
      m.position.set(...pos)
      m.lookAt(0, 0, 0)
      room.add(m)
      made.push(geo, mat)
    }
    const shellGeo = new THREE.SphereGeometry(30, 32, 16)
    const shellMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.32, 0.33), side: THREE.BackSide })
    room.add(new THREE.Mesh(shellGeo, shellMat))
    made.push(shellGeo, shellMat)
    panel(9, 7, [-6, 6, 7], 5.2) // principal: grande y suave, arriba a la izquierda
    panel(6, 7, [8, 1.5, 5], 1.5, '#fff6ea') // relleno
    panel(3, 9, [5, 3, -8], 4.2) // contorno, por detrás
    panel(3, 9, [-7, 2, -7], 2.2) // contorno opuesto, más débil
    panel(10, 10, [0, 11, 0], 2.4) // cenital
    panel(14, 14, [0, -9, 0], 0.7, '#f7f2ea') // rebote del piso

    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(room, 0.035).texture
    scene.environment = env
    scene.environmentIntensity = 1.15
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
      made.forEach((x) => x.dispose())
    }
  }, [gl, scene])
  return null
}

// sombra de contacto: mancha suave bajo el frasco
function contactShadow() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  r.addColorStop(0, 'rgba(0,0,0,0.5)')
  r.addColorStop(0.45, 'rgba(0,0,0,0.22)')
  r.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

// ---------- el frasco ----------

function Bottle({ mobile, onReady }) {
  const { invalidate } = useThree()
  const res = useMemo(() => {
    const geo = buildGeometry()
    const leather = { roughness: 0.6, sheen: 0.3, sheenRoughness: 0.55, sheenColor: new THREE.Color('#c9ecfb') }
    const mats = {
      sleeve: new THREE.MeshPhysicalMaterial({ color: BLUE, ...leather }),
      strap: new THREE.MeshPhysicalMaterial({ color: BLUE, ...leather }),
      keeper: new THREE.MeshPhysicalMaterial({ color: BLUE, ...leather }),
      plain: new THREE.MeshStandardMaterial({ color: '#1f8fbe', roughness: 0.7 }),
      cap: new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: 0.46, clearcoat: 0.08, clearcoatRoughness: 0.7 }),
      capTop: new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: 0.46, clearcoat: 0.08, clearcoatRoughness: 0.7 }),
      handle: new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: 0.46, clearcoat: 0.08, clearcoatRoughness: 0.7 }),
      thread: new THREE.MeshStandardMaterial({ color: THREAD, roughness: 0.9 }),
    }
    return { geo, mats, stitches: stitchMatrices(), textures: [] }
  }, [])

  const stitches = useRef(null)
  useEffect(() => {
    const m = stitches.current
    res.stitches.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.instanceMatrix.needsUpdate = true
  }, [res])

  // los mapas se dibujan cuando las fuentes de las inscripciones ya están cargadas
  useEffect(() => {
    let alive = true
    if (!document.getElementById('dv-script-font')) {
      const link = document.createElement('link')
      link.id = 'dv-script-font'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap'
      document.head.appendChild(link)
    }
    const fonts = document.fonts
    const wait = fonts
      ? Promise.race([Promise.all([fonts.load("120px 'Gochi Hand'"), fonts.load('700 70px Manrope')]), new Promise((r) => setTimeout(r, 3000))])
      : Promise.resolve()
    const script = "120px 'Gochi Hand'"
    let withScript = false
    const build = () => {
      if (!alive) return
      withScript = Boolean(fonts?.check(script))
      res.textures.forEach((t) => t.dispose())
      const { mats, geo } = res
      const sleeve = sleeveMaps(mobile ? 2048 : 4096, geo.body.userData.length, 0.047)
      const tile = sleeve.cellUnits
      const leatherNormal = (repeat) => texture(normalFromHeight(sleeve.grain, 3.4), { repeat })
      const speckle = speckleHeight(256)
      const plastic = (repeat) => texture(normalFromHeight(speckle, 1.5), { repeat })

      Object.assign(mats.sleeve, { map: sleeve.map, normalMap: sleeve.normalMap, roughnessMap: sleeve.roughnessMap, roughness: 1, color: new THREE.Color('#ffffff') })
      // el mismo grano, a la misma escala física, en cada pieza
      mats.strap.normalMap = leatherNormal([(2 * Math.PI * 1.036) / tile, geo.strap.userData.length / tile])
      mats.keeper.normalMap = leatherNormal([0.6, 0.6])
      const capLen = geo.cap.userData.length
      mats.cap.normalMap = plastic([Math.round((2 * Math.PI * 0.76) / 0.22), capLen / 0.22])
      mats.capTop.normalMap = plastic([1.2 / 0.22, 1.2 / 0.22])
      mats.handle.normalMap = plastic([1 / 0.22, 1 / 0.22])
      for (const m of [mats.cap, mats.capTop, mats.handle]) m.normalScale = new THREE.Vector2(0.55, 0.55)
      res.textures = [sleeve.map, sleeve.normalMap, sleeve.roughnessMap, mats.strap.normalMap, mats.keeper.normalMap, mats.cap.normalMap, mats.capTop.normalMap, mats.handle.normalMap]
      Object.values(mats).forEach((m) => { m.needsUpdate = true })
      invalidate()
      onReady?.()
    }
    wait.catch(() => {}).then(build)
    // si la letra manuscrita llega tarde, las inscripciones se vuelven a dibujar con ella
    fonts?.load(script).then(() => { if (!withScript) build() }).catch(() => {})
    return () => {
      alive = false
    }
  }, [res, mobile, invalidate, onReady])

  useEffect(() => () => {
    Object.values(res.geo).forEach((g) => g.dispose())
    Object.values(res.mats).forEach((m) => m.dispose())
    res.textures.forEach((t) => t.dispose())
  }, [res])

  const { geo, mats } = res
  return (
    // centrado: el asa desplaza el conjunto, y la tapa lo alarga hacia arriba
    <group position={[-0.1, -0.47, 0]}>
      <mesh geometry={geo.body} material={mats.sleeve} castShadow receiveShadow />
      <mesh geometry={geo.base} material={mats.plain} />
      <mesh geometry={geo.collar} material={mats.plain} receiveShadow />
      <mesh geometry={geo.strap} material={mats.strap} castShadow receiveShadow />
      <mesh geometry={geo.keeper} material={mats.keeper} castShadow receiveShadow />
      <instancedMesh ref={stitches} args={[geo.stitch, mats.thread, res.stitches.length]} />
      <mesh geometry={geo.cap} material={mats.cap} castShadow receiveShadow />
      <mesh geometry={geo.capTop} material={mats.capTop} receiveShadow />
      <mesh geometry={geo.handle} material={mats.handle} castShadow receiveShadow />
    </group>
  )
}

// ---------- giro libre, zoom, inercia y vistas ----------

function Rig({ api, reduce, onInteract, children }) {
  const group = useRef(null)
  const { gl, camera, size } = useThree()
  const st = useRef({
    yaw: reduce ? HOME.yaw : HOME.yaw + 1.15, pitch: HOME.pitch, vy: 0, vp: 0,
    target: reduce ? null : HOME, zoom: 1, zoomT: 1, last: 0, pointers: new Map(), pinch: 0,
  })

  useEffect(() => {
    if (!api) return
    const s = st.current
    api.current = {
      view: (name) => { s.target = VIEWS[name] ?? HOME; if (name === 'inicio') s.zoomT = 1 },
      zoom: (factor) => { s.zoomT = THREE.MathUtils.clamp(s.zoomT * factor, ZOOM[0], ZOOM[1]); s.last = performance.now() },
    }
    return () => { api.current = null }
  }, [api])

  useEffect(() => {
    const el = gl.domElement
    const s = st.current
    const spread = () => {
      const [a, b] = [...s.pointers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const down = (e) => {
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      el.setPointerCapture?.(e.pointerId)
      s.target = null
      s.vy = s.vp = 0
      if (s.pointers.size === 2) s.pinch = spread()
      el.style.cursor = 'grabbing'
      onInteract?.()
    }
    const move = (e) => {
      const p = s.pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (s.pointers.size === 2) {
        // pellizco: acerca o aleja
        const d = spread()
        if (s.pinch > 0) s.zoomT = THREE.MathUtils.clamp(s.zoomT * (s.pinch / d), ZOOM[0], ZOOM[1])
        s.pinch = d
        return
      }
      s.vy = dx * 0.0072
      s.yaw += s.vy
      s.vp = dy * 0.0055
      s.pitch = THREE.MathUtils.clamp(s.pitch + s.vp, PITCH[0], PITCH[1])
    }
    const up = (e) => {
      if (!s.pointers.delete(e.pointerId)) return
      el.releasePointerCapture?.(e.pointerId)
      s.pinch = 0
      if (!s.pointers.size) {
        el.style.cursor = 'grab'
        s.last = performance.now()
      }
    }
    // la rueda sola sigue siendo el scroll de la página; con Ctrl / pellizco de trackpad hace zoom
    const wheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      s.zoomT = THREE.MathUtils.clamp(s.zoomT * Math.exp(e.deltaY * 0.008), ZOOM[0], ZOOM[1])
      s.last = performance.now()
    }
    el.style.cursor = 'grab'
    el.style.touchAction = 'pan-y' // en táctil, el gesto vertical es del scroll
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl, onInteract])

  useFrame((state, dt) => {
    const s = st.current
    const g = group.current
    if (!g) return
    const step = Math.min(dt, 0.05)
    const k = step * 60 // normaliza a 60 fps
    const dragging = s.pointers.size > 0
    if (s.target) {
      // hacia la vista pedida, por el camino más corto
      const dy = Math.atan2(Math.sin(s.target.yaw - s.yaw), Math.cos(s.target.yaw - s.yaw))
      const dp = s.target.pitch - s.pitch
      s.yaw += dy * 0.07 * k
      s.pitch += dp * 0.07 * k
      s.vy = s.vp = 0
      if (Math.abs(dy) < 0.002 && Math.abs(dp) < 0.002) {
        s.target = null
        s.last = performance.now()
      }
    } else if (!dragging) {
      // inercia con desaceleración natural
      s.yaw += s.vy * k
      s.pitch = THREE.MathUtils.clamp(s.pitch + s.vp * k, PITCH[0], PITCH[1])
      const friction = Math.pow(0.935, k)
      s.vy *= friction
      s.vp *= friction
      // en reposo, un giro lento continuo
      if (!reduce && performance.now() - s.last > 3200) s.yaw += 0.11 * step
    }
    s.zoom += (s.zoomT - s.zoom) * Math.min(1, 0.12 * k)
    camera.position.z = CAM * s.zoom

    g.rotation.set(s.pitch, s.yaw, 0)
    g.position.y = !dragging && !reduce ? Math.sin(state.clock.elapsedTime * 0.8) * 0.03 : 0
    // en pantallas angostas el frasco se ajusta para caber completo
    g.scale.setScalar(THREE.MathUtils.clamp((size.width / size.height) * 1.3, 0.78, 1.12))
  })

  return <group ref={group}>{children}</group>
}

function Ground() {
  const blob = useMemo(contactShadow, [])
  useEffect(() => () => blob.dispose(), [blob])
  return (
    <group position={[0, -1.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* sombra proyectada, muy tenue */}
      <mesh receiveShadow>
        <planeGeometry args={[14, 14]} />
        <shadowMaterial opacity={0.09} />
      </mesh>
      {/* sombra de contacto */}
      <mesh position={[0.05, 0, 0.001]}>
        <planeGeometry args={[4.4, 3.2]} />
        <meshBasicMaterial map={blob} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function BottleViewer({ active = true, reduce = false, api, onInteract, onReady }) {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768
  return (
    <Canvas
      shadows
      frameloop={active ? 'always' : 'never'}
      dpr={[1, mobile ? 1.75 : 2]}
      camera={{ fov: 26, position: [0, 0.25, CAM], near: 0.5, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 0.95
      }}
      style={{ width: '100%', height: '100%' }}
      aria-label="Odyssey Mandarin Sky Limited Edition en 3D. Arrastra para girarlo."
      role="img"
    >
      <Studio />
      {/* la luz ambiente viene de los paneles del estudio; esta solo proyecta la sombra y da el brillo principal */}
      <directionalLight
        position={[-2.6, 7.5, 5]}
        intensity={0.7}
        castShadow
        shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-left={-3.2}
        shadow-camera-right={3.2}
        shadow-camera-top={3.6}
        shadow-camera-bottom={-3.2}
        shadow-camera-near={1}
        shadow-camera-far={18}
      />
      <Rig api={api} reduce={reduce} onInteract={onInteract}>
        <Bottle mobile={mobile} onReady={onReady} />
      </Rig>
      <Ground />
    </Canvas>
  )
}
