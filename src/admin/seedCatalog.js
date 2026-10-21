import { createProduct, uploadProductImage } from './api'
import khamrahImg from '../assets/hero-khamrah-cut.webp'
import zanzibarImg from '../assets/hero-asad-zanzibar-cut.webp'
import elixirImg from '../assets/hero-asad-cut.webp'
import mandarinImg from '../assets/hero-mandarin-sky-cut.webp'
import ninePmImg from '../assets/hero-9pm-cut.webp'

// Las cinco fragancias con las que arrancó la tienda. Se importan a la base de
// datos desde Productos → «Cargar fragancias iniciales»; después se editan
// desde el panel como cualquier producto. Los precios, el stock y los textos
// son de ejemplo: ajústalos a los reales.
const CATEGORY = 'Bestias Árabes'

const FRAGRANCES = [
  {
    name: '9PM',
    brand: 'Afnan',
    code: 'AF-9PM',
    highlight: 'Bestia de fiestas & noche',
    kind: 'Eau de parfum',
    fixation: '12+ horas',
    tags: ['Manzana', 'Canela', 'Vainilla negra', 'Haba tonka'],
    description:
      'El clon supremo de Ultra Male con esteroides. Salida electrizante de manzana silvestre y canela que seca en una vainilla negra ahumada con haba tonka irresistible.',
    prices: { 10: 11, 100: 45 },
    image: ninePmImg,
  },
  {
    name: 'Khamrah Qahwa',
    brand: 'Lattafa',
    code: 'LT-KHQ',
    highlight: 'Bestia gourmand & invierno',
    kind: 'Eau de parfum',
    fixation: '10+ horas',
    tags: ['Café', 'Cardamomo', 'Dátiles', 'Oud'],
    description:
      'Café, cardamomo y dátiles envueltos en un oud cálido. Dulce, especiada y completamente adictiva: la que todos preguntan qué llevas puesto.',
    prices: { 10: 10, 100: 38 },
    image: khamrahImg,
  },
  {
    name: 'Asad Zanzibar',
    brand: 'Lattafa',
    code: 'LT-ASZ',
    highlight: 'Bestia fresca & oficina',
    kind: 'Eau de parfum',
    fixation: '8+ horas',
    tags: ['Ámbar', 'Especias', 'Oud', 'Salida fresca'],
    description:
      'Ámbar, especias y un fondo de oud intenso con una salida fresca y moderna. Presencia limpia que se impone sin gritar.',
    prices: { 10: 11, 100: 42 },
    image: zanzibarImg,
  },
  {
    name: 'Asad Elixir',
    brand: 'Lattafa',
    code: 'LT-ASE',
    highlight: 'Bestia intensa & cita',
    kind: 'Extrait',
    fixation: '12+ horas',
    tags: ['Oud', 'Cuero', 'Vainilla oscura'],
    description:
      'Oud, cuero y un toque de vainilla oscura. Intensidad que perdura sobre la piel y en la ropa hasta el día siguiente.',
    prices: { 10: 12, 100: 48 },
    image: elixirImg,
  },
  {
    name: 'Mandarin Sky',
    brand: 'Lattafa',
    code: 'LT-MDS',
    highlight: 'Bestia cítrica & verano',
    kind: 'Eau de parfum',
    fixation: '7+ horas',
    tags: ['Mandarina', 'Cítricos', 'Aire limpio'],
    description: 'Mandarina, notas cítricas y un aire limpio de verano. Despierta cualquier mañana calurosa.',
    prices: { 10: 9, 100: 36 },
    image: mandarinImg,
  },
]

const STOCK = { 10: 20, 100: 10 }
const MIN_STOCK = { 10: 5, 100: 3 }

async function uploadAsset(url, name) {
  const blob = await (await fetch(url)).blob()
  return uploadProductImage(new File([blob], `${name}.webp`, { type: blob.type || 'image/webp' }))
}

const key = (name, volume) => `${name.trim().toLowerCase()}|${volume.trim().toLowerCase()}`

// Crea en Supabase las presentaciones que todavía no existan (por nombre y
// volumen) y sube sus fotos. Devuelve cuántas creó y cuántas ya estaban.
export async function importInitialCatalog(existing, onProgress = () => {}) {
  const have = new Set(existing.map((p) => key(p.name, p.volume ?? '')))
  const haveImage = new Map(existing.filter((p) => p.image_url).map((p) => [p.name.trim().toLowerCase(), p.image_url]))
  let created = 0
  let skipped = 0

  for (const [i, f] of FRAGRANCES.entries()) {
    const sizes = Object.keys(f.prices).filter((ml) => !have.has(key(f.name, `${ml} ml`)))
    skipped += Object.keys(f.prices).length - sizes.length
    if (!sizes.length) continue

    onProgress(`Subiendo la foto de ${f.name} (${i + 1}/${FRAGRANCES.length})…`)
    const imageUrl = haveImage.get(f.name.toLowerCase()) ?? (await uploadAsset(f.image, f.code.toLowerCase()))

    for (const ml of sizes) {
      onProgress(`Guardando ${f.name} ${ml} ml…`)
      await createProduct({
        name: f.name,
        category: CATEGORY,
        description: f.description,
        price: f.prices[ml],
        cost: 0,
        volume: `${ml} ml`,
        color: '#c2610c',
        image_url: imageUrl,
        stock: STOCK[ml],
        min_stock: MIN_STOCK[ml],
        active: true,
        brand: f.brand,
        kind: f.kind,
        fixation: f.fixation,
        highlight: f.highlight,
        code: f.code,
        tags: f.tags,
      })
      created += 1
    }
  }
  return { created, skipped, total: FRAGRANCES.length * 2 }
}
