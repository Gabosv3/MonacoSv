import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { products as staticProducts, formatCOP } from './products'
import asadElixirImg from './assets/asad-elixir.png'
import logoImg from './assets/logo.png'
import { createSale, fetchActiveDiscounts, fetchActiveProducts, fetchCouponByCode } from './admin/api'
import CinematicHero from './CinematicHero'

// El descuento activo (si hay uno) que aplica a este producto: por producto,
// por categoría, o a todo el catálogo. Si hay varios, se usa el primero.
function findDiscount(discounts, product) {
  return discounts.find(
    (d) =>
      d.scope === 'all' ||
      (d.scope === 'category' && d.scope_value === product.category) ||
      (d.scope === 'product' && d.scope_value === product.id)
  )
}

function effectivePrice(discounts, product) {
  const d = findDiscount(discounts, product)
  if (!d) return product.price
  const off = d.type === 'percent' ? (product.price * d.value) / 100 : d.value
  return Math.max(0, Math.round(product.price - off))
}

const NAV_LINKS = ['Inicio', 'Fragancias', 'Colección', 'Nosotros', 'Contacto']

// Cada slide usa el catálogo real (nombre/color). La foto es la única que
// tenemos por ahora — se tiñe por CSS para diferenciar cada fragancia.
// Cuando haya fotos reales de cada loción, solo reemplaza "image" aquí.
// Paleta de marca — solo estos 4 colores, en este orden exacto:
// Negro carbón, Blanco hueso, Gris humo, Verde bosque profundo
const HERO_SLIDES = staticProducts.slice(0, 4).map((p, i) => ({
  id: p.id,
  name: p.name,
  tagline: [
    ['HAZ QUE', 'VOLTEEN A VERTE'],
    ['ENERGÍA QUE', 'SE SIENTE'],
    ['ELEGANCIA QUE', 'ENAMORA'],
    ['INTENSIDAD QUE', 'IMPONE'],
  ][i],
  desc: p.description,
  bg: ['#141414', '#EDE8DF', '#6F716F', '#233129'][i],
  text: ['#EDE8DF', '#141414', '#EDE8DF', '#EDE8DF'][i],
  textDim: [
    'rgba(237,232,223,0.62)',
    'rgba(20,20,20,0.6)',
    'rgba(237,232,223,0.72)',
    'rgba(237,232,223,0.62)',
  ][i],
  accent: ['#6F716F', '#233129', '#141414', '#EDE8DF'][i],
  btnText: ['#EDE8DF', '#EDE8DF', '#EDE8DF', '#141414'][i],
  // el resplandor detrás del frasco usa el acento, no el fondo (si no, sería invisible)
  color: ['#6F716F', '#233129', '#141414', '#EDE8DF'][i],
  image: asadElixirImg,
}))

const FEATURES = [
  {
    label: 'Alta duración',
    icon: (
      <path d="M12 7v5l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    label: 'Aromas exclusivos',
    icon: (
      <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    ),
  },
  {
    label: 'Envíos a todo el país',
    icon: (
      <path d="M3 7h11v8H3V7zm11 3h4l3 3v2h-7v-5zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    ),
  },
]

function BottleScene({ slide }) {
  return (
    <div className="relative w-full max-w-lg mx-auto flex items-center justify-center">
      {/* glow detrás de la foto, cambia de color según el producto */}
      <motion.div
        className="absolute w-80 h-80 md:w-96 md:h-96 rounded-full blur-[90px]"
        animate={{
          opacity: [0.5, 0.85, 0.5],
          scale: [1, 1.1, 1],
          backgroundColor: slide.color,
        }}
        transition={{
          opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          backgroundColor: { duration: 0.9 },
        }}
        style={{ opacity: 0.35 }}
      />

      <motion.div
        className="relative"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={slide.id}
            src={slide.image}
            alt={slide.name}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[300px] md:max-w-[390px] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]"
          />
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// TODO: reemplaza con tu número de WhatsApp real (formato: código país + número, sin +)
const WHATSAPP_NUMBER = '573000000000'

function ProductCard({ product, onAdd, index, discounts }) {
  const price = effectivePrice(discounts, product)
  const hasDiscount = price < product.price
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      whileHover={{ y: -6 }}
      className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
      <div
        className="h-40 flex items-center justify-center text-white text-sm font-medium"
        style={{ backgroundColor: product.color }}
      >
        {product.category}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-neutral-900">{product.name}</h3>
          <span className="text-xs text-neutral-500 whitespace-nowrap">{product.volume}</span>
        </div>
        <p className="text-sm text-neutral-500 flex-1">{product.description}</p>
        <div className="flex items-center justify-between pt-2">
          <span className="flex items-baseline gap-2">
            <span className="font-semibold text-neutral-900">{formatCOP(price)}</span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through">{formatCOP(product.price)}</span>
            )}
          </span>
          <button
            onClick={() => onAdd(product)}
            className="bg-neutral-900 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function CartDrawer({ items, discounts, subtotal, onClose, onRemove, onQty, onOrderPlaced }) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [placing, setPlacing] = useState(false)

  const couponDiscount = useMemo(() => {
    if (!coupon) return 0
    const raw = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value
    return Math.min(subtotal, Math.round(raw))
  }, [coupon, subtotal])

  const total = Math.max(0, subtotal - couponDiscount)

  const applyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) return
    setCheckingCoupon(true)
    setCouponError('')
    try {
      const found = await fetchCouponByCode(code)
      if (!found) {
        setCouponError('Cupón no válido.')
      } else if (found.max_uses && found.used_count >= found.max_uses) {
        setCouponError('Este cupón ya alcanzó su límite de usos.')
      } else if (found.expires_at && new Date(found.expires_at) < new Date()) {
        setCouponError('Este cupón ya venció.')
      } else if (subtotal < Number(found.min_purchase || 0)) {
        setCouponError(`Compra mínima de ${formatCOP(found.min_purchase)} para este cupón.`)
      } else {
        setCoupon(found)
      }
    } catch (err) {
      setCouponError('No se pudo validar el cupón.')
    } finally {
      setCheckingCoupon(false)
    }
  }

  const buildMessage = () => {
    const lines = items.map(
      (i) => `• ${i.product.name} (${i.product.volume}) x${i.qty} - ${formatCOP(effectivePrice(discounts, i.product) * i.qty)}`
    )
    let text = `Hola, quiero hacer este pedido:\n\n${lines.join('\n')}\n\nSubtotal: ${formatCOP(subtotal)}`
    if (coupon) text += `\nCupón ${coupon.code}: -${formatCOP(couponDiscount)}`
    text += `\nTotal: ${formatCOP(total)}`
    if (customerName) text += `\n\nNombre: ${customerName}`
    if (customerPhone) text += `\nTeléfono: ${customerPhone}`
    return encodeURIComponent(text)
  }

  const handleCheckout = async () => {
    if (!items.length || placing) return
    setPlacing(true)
    try {
      await createSale({
        customer_name: customerName,
        customer_phone: customerPhone,
        subtotal,
        discount_total: couponDiscount,
        coupon_code: coupon?.code ?? null,
        total,
        status: 'pendiente',
        source: 'tienda',
        items: items.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.qty,
          unit_price: effectivePrice(discounts, i.product),
        })),
      })
      onOrderPlaced?.()
    } catch (err) {
      console.warn('No se pudo registrar la venta en el panel:', err.message)
    } finally {
      setPlacing(false)
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${buildMessage()}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full shadow-xl flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Tu carrito</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {items.length === 0 && <p className="text-neutral-500 text-sm">Aún no has agregado lociones.</p>}
          {items.map(({ product, qty }) => (
            <div key={product.id} className="flex gap-3 items-center">
              <div
                className="w-12 h-12 rounded-lg flex-shrink-0"
                style={{ backgroundColor: product.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{product.name}</p>
                <p className="text-xs text-neutral-500">{formatCOP(effectivePrice(discounts, product))}</p>
              </div>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => onQty(product.id, Math.max(1, Number(e.target.value)))}
                className="w-14 border border-neutral-300 rounded-md px-2 py-1 text-sm"
              />
              <button
                onClick={() => onRemove(product.id)}
                className="text-neutral-400 hover:text-red-500 text-sm"
              >
                Quitar
              </button>
            </div>
          ))}

          {items.length > 0 && (
            <div className="pt-2 border-t border-neutral-100 space-y-3">
              <input
                type="text"
                placeholder="Tu nombre (opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              />
              <input
                type="tel"
                placeholder="Tu teléfono (opcional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              />
              {coupon ? (
                <div className="flex items-center justify-between bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">
                  <span>Cupón <strong>{coupon.code}</strong> aplicado</span>
                  <button
                    onClick={() => {
                      setCoupon(null)
                      setCouponInput('')
                    }}
                    className="text-green-700/70 hover:text-green-900"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Código de cupón"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm uppercase"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={checkingCoupon || !couponInput.trim()}
                      className="text-sm px-3 py-2 rounded-md border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {checkingCoupon ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-neutral-200 space-y-3">
          <div className="text-sm space-y-1">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            {coupon && (
              <div className="flex justify-between text-green-600">
                <span>Cupón {coupon.code}</span>
                <span>-{formatCOP(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Total</span>
              <span>{formatCOP(total)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={!items.length || placing}
            className={`block text-center w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              items.length
                ? 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-60'
                : 'bg-neutral-200 text-neutral-400 pointer-events-none'
            }`}
          >
            {placing ? 'Procesando…' : 'Finalizar pedido por WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [category, setCategory] = useState('Todas')
  const [menuOpen, setMenuOpen] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const slide = HERO_SLIDES[slideIndex]

  // Catálogo real: arranca con los datos locales (pintan al instante) y se
  // reemplaza por lo que haya en Supabase apenas cargue — si la base de
  // datos falla o no está configurada, la tienda sigue funcionando igual.
  const [products, setProducts] = useState(staticProducts)
  const [discounts, setDiscounts] = useState([])

  useEffect(() => {
    fetchActiveProducts()
      .then((data) => {
        if (data && data.length) setProducts(data)
      })
      .catch((err) => console.warn('No se pudo cargar el catálogo desde Supabase:', err.message))
    fetchActiveDiscounts()
      .then(setDiscounts)
      .catch((err) => console.warn('No se pudieron cargar los descuentos:', err.message))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % HERO_SLIDES.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  const prevSlide = () => setSlideIndex((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
  const nextSlide = () => setSlideIndex((i) => (i + 1) % HERO_SLIDES.length)

  const categories = useMemo(
    () => ['Todas', ...new Set(products.map((p) => p.category))],
    [products]
  )

  const filtered = useMemo(
    () => (category === 'Todas' ? products : products.filter((p) => p.category === category)),
    [category, products]
  )

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, { product, qty: 1 }]
    })
    setCartOpen(true)
  }

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.product.id !== id))
  const setQty = (id, qty) =>
    setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, qty } : i)))

  const subtotal = cart.reduce((sum, i) => sum + effectivePrice(discounts, i.product) * i.qty, 0)
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <div className="min-h-screen bg-neutral-50 overflow-x-clip">
      {/* intro cinematográfica: video con scroll, antes de todo lo demás.
          Mientras dura, el menú real está oculto y solo hay un botón de
          contacto flotante; el menú aparece al llegar al resto de la tienda. */}
      <CinematicHero whatsappHref={`https://wa.me/${WHATSAPP_NUMBER}`} logoSrc={logoImg} />

      {/* navbar — sticky, siempre en el flujo justo al inicio de la tienda.
          Mientras la intro cinematográfica está activa, la tapa por completo
          (su overlay va por encima); al terminar, queda visible de una vez. */}
      <header
        className="sticky top-0 z-40"
        style={{
          backgroundColor: slide.bg,
          color: slide.text,
          transition: 'background-color 1.4s ease, color 1.4s ease',
        }}
        >
          <motion.div
            className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 h-16 md:h-14 flex items-center justify-between border-b box-border"
            initial={false}
            animate={{ borderColor: `${slide.text}1a` }}
            transition={{ duration: 0.9 }}
          >
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="MonacoSV" className="w-8 h-8 sm:w-9 sm:h-9 object-contain flex-shrink-0" />
              <span className="text-lg sm:text-xl font-extrabold tracking-tight leading-none">
                Monaco
                <span style={{ color: slide.accent }}>SV</span>
              </span>
            </div>

            <span
              className="hidden md:block text-[11px] uppercase tracking-[0.3em]"
              style={{ color: slide.textDim }}
            >
              Fragancia / 2026
            </span>

            <div className="flex items-center gap-5 sm:gap-8">
              <nav className="hidden md:flex items-center gap-5">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link}
                    href={link === 'Colección' ? '#catalogo' : '#'}
                    className="text-[11px] uppercase tracking-[0.2em] transition-colors"
                    style={{ color: slide.textDim }}
                  >
                    {link}
                  </a>
                ))}
              </nav>

              <button
                onClick={() => setCartOpen(true)}
                className="relative transition-colors"
                style={{ color: slide.textDim }}
                aria-label="Carrito"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2m4 3l1.5 9M9 21a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {itemCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: slide.accent }}
                  />
                )}
              </button>

              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden transition-colors"
                style={{ color: slide.textDim }}
                aria-label="Menú"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  {menuOpen ? (
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  ) : (
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          </motion.div>

          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t overflow-hidden"
              style={{ borderColor: `${slide.text}1a` }}
            >
              <div className="px-4 py-4 flex flex-col gap-4">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link}
                    href={link === 'Colección' ? '#catalogo' : '#'}
                    onClick={() => setMenuOpen(false)}
                    className="text-xs uppercase tracking-[0.2em] transition-colors"
                    style={{ color: slide.textDim }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </motion.nav>
          )}
        </header>

        {/* hero — ocupa como mínimo el resto de la pantalla (100vh - header),
            pero puede crecer si el contenido lo necesita (nunca se recorta) */}
        <section
          className="relative overflow-x-clip border-b flex flex-col min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-3.5rem)]"
          style={{
            backgroundColor: slide.bg,
            borderColor: `${slide.text}1a`,
            transition: 'background-color 1.4s ease, border-color 1.4s ease',
          }}
        >
          {/* tinte de color ambiental, sutil, detrás del frasco */}
          <motion.div
            aria-hidden
            className="absolute inset-0 -z-10"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: `radial-gradient(ellipse 70% 65% at 68% 45%, ${slide.color}55, transparent 70%)`,
            }}
          />

          {/* número gigante decorativo de fondo, sigue al slide activo */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className={`pointer-events-none select-none absolute -top-4 md:-top-6 text-[9rem] md:text-[14rem] font-black leading-none text-transparent ${
                slideIndex % 2 === 0 ? 'right-0' : 'left-0'
              }`}
              style={{ WebkitTextStroke: `1px ${slide.accent}70` }}
            >
              {String(slideIndex + 1).padStart(2, '0')}
            </motion.div>
          </AnimatePresence>

          <div className="relative flex-1 flex items-center py-6">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 items-center">
            <div
              className="text-center md:text-left"
              style={{ order: slideIndex % 2 === 0 ? 1 : 2 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, borderColor: `${slide.text}33` }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-3 mb-5 md:mb-2"
              >
                <span
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full border flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden relative"
                  style={{ borderColor: `${slide.text}4d`, color: slide.text }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={slide.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.4 }}
                    >
                      {String(slideIndex + 1).padStart(2, '0')}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={slide.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.4 }}
                    className="text-[10px] md:text-[11px] uppercase tracking-[0.3em]"
                    style={{ color: slide.textDim }}
                  >
                    {slide.name}
                  </motion.span>
                </AnimatePresence>
              </motion.div>

              <h2 className="text-4xl md:text-6xl font-black leading-[0.95] md:leading-[0.9] tracking-tight uppercase overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={slide.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -24 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="block"
                  >
                    <span className="block" style={{ color: slide.text }}>
                      {slide.tagline[0]}
                    </span>
                    <span className="block" style={{ color: slide.accent }}>
                      {slide.tagline[1]}
                    </span>
                  </motion.span>
                </AnimatePresence>
              </h2>

              <div className="mt-5 md:mt-2 h-14 md:h-8 relative">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={slide.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 max-w-md mx-auto md:mx-0 text-base md:text-lg"
                    style={{ color: slide.textDim }}
                  >
                    {slide.desc}
                  </motion.p>
                </AnimatePresence>
              </div>

              <motion.a
                href="#detalles"
                initial={{ opacity: 0, y: 14 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  backgroundColor: slide.accent,
                  color: slide.btnText,
                }}
                transition={{
                  opacity: { duration: 0.6, delay: 0.6 },
                  y: { duration: 0.6, delay: 0.6 },
                  backgroundColor: { duration: 0.6 },
                  color: { duration: 0.6 },
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="mt-8 md:mt-3 inline-flex items-center gap-2 px-7 py-3.5 text-sm uppercase tracking-widest font-bold"
              >
                Explorar elixir
                <motion.span
                  animate={{ x: [0, 3, 0], y: [0, -3, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ↗
                </motion.span>
              </motion.a>
            </div>

            <div
              className="flex items-center justify-center"
              style={{ order: slideIndex % 2 === 0 ? 2 : 1 }}
            >
              <BottleScene slide={slide} />
            </div>
          </div>
          </div>

          <motion.div
            className="relative border-t"
            initial={false}
            animate={{ borderColor: `${slide.text}1a` }}
            transition={{ duration: 0.9 }}
          >
            <div
              className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-4 md:py-2 flex flex-col sm:flex-row items-center gap-3 sm:gap-0 sm:justify-between"
              style={{ color: slide.textDim }}
            >
              <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={slide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {slide.name}
                  </motion.span>
                </AnimatePresence>
                <span className="w-8 sm:w-10 h-px" style={{ backgroundColor: `${slide.text}33` }} />
                <span>Eau de parfum</span>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-[11px] tracking-[0.15em]">
                <button
                  onClick={prevSlide}
                  aria-label="Anterior"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-colors"
                  style={{ borderColor: `${slide.text}33` }}
                >
                  ←
                </button>
                <span>
                  {String(slideIndex + 1).padStart(2, '0')} / {String(HERO_SLIDES.length).padStart(2, '0')}
                </span>
                <button
                  onClick={nextSlide}
                  aria-label="Siguiente"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-colors"
                  style={{ borderColor: `${slide.text}33` }}
                >
                  →
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* fila de beneficios */}
        <div
          className="relative border-b"
          style={{
            backgroundColor: slide.bg,
            color: slide.text,
            transition: 'background-color 1.4s ease, color 1.4s ease',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex items-center justify-center sm:justify-start gap-3"
                style={{ color: slide.textDim }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="flex-shrink-0"
                  style={{ color: slide.accent }}
                >
                  {f.icon}
                </svg>
                <span className="text-xs uppercase tracking-widest">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

      {/* especificaciones */}
      <section id="detalles" className="relative bg-[#0a0a0a] text-white border-b border-white/10 py-14 sm:py-20 lg:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 50% 40% at 15% 20%, rgba(249,115,22,0.08), transparent 60%)',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10 sm:mb-14"
            >
              <span className="uppercase tracking-[0.35em] text-xs text-orange-500">Ficha técnica</span>
              <h3 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black uppercase">Asad Elixir</h3>
            </motion.div>

            {/* pirámide olfativa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
              {[
                { label: 'Salida', notes: 'Bergamota, Azafrán, Manzana' },
                { label: 'Corazón', notes: 'Oud, Rosa, Canela' },
                { label: 'Fondo', notes: 'Ámbar, Almizcle, Sándalo' },
              ].map((n, i) => (
                <motion.div
                  key={n.label}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="border border-white/10 p-5 sm:p-6 text-center hover:border-orange-500/40 transition-colors"
                >
                  <span className="text-orange-500 text-xs uppercase tracking-[0.3em]">{n.label}</span>
                  <p className="mt-3 text-neutral-300 text-sm">{n.notes}</p>
                </motion.div>
              ))}
            </div>

            {/* specs grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 border border-white/10">
              {[
                ['Volumen', '100 ml'],
                ['Concentración', 'Eau de Parfum'],
                ['Duración', '8 - 10 horas'],
                ['Género', 'Masculino'],
              ].map(([label, value], i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                  className="bg-[#0a0a0a] p-4 sm:p-6 text-center"
                >
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-white">{value}</p>
                  <p className="mt-1 text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-500">{label}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-10 sm:mt-12 flex justify-center"
            >
              <a
                href="#catalogo"
                className="inline-flex items-center gap-2 border border-white/30 px-6 sm:px-7 py-3 sm:py-3.5 text-sm uppercase tracking-widest font-semibold hover:bg-white hover:text-neutral-900 transition-colors"
              >
                Ver toda la colección
              </a>
            </motion.div>
          </div>
        </section>

      <div className="text-center pt-14 px-4">
        <span className="uppercase tracking-[0.3em] text-xs text-neutral-400">Catálogo</span>
        <h3 className="mt-2 text-3xl font-bold text-neutral-900">Colección Destacada</h3>
      </div>

      <div id="catalogo" className="max-w-6xl mx-auto px-4 pt-8 mb-6 flex flex-wrap gap-2 justify-center">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              category === c
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((product, index) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} index={index} discounts={discounts} />
        ))}
      </main>

      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400">
        MonacoSV · Pedidos coordinados por WhatsApp
      </footer>

      {cartOpen && (
        <CartDrawer
          items={cart}
          discounts={discounts}
          subtotal={subtotal}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onQty={setQty}
          onOrderPlaced={() => setCart([])}
        />
      )}
    </div>
  )
}
