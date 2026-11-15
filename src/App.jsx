import { useCallback, useMemo, useState, useEffect } from 'react'
import { useSettings } from './settings.jsx'
import { useNavigate } from 'react-router-dom'
import { buildFragrances, pickFeatured, mlOf } from './catalog'
import { effectivePrice } from './pricing'
import AccountPage from './components/AccountPage'
import { fetchActiveCategories, fetchActiveDiscounts, fetchActiveProducts } from './admin/api'
import DuumvirHome, { Nav, Closing } from './duumvir/DuumvirHome'
import ProductPage from './duumvir/ProductPage'
import CatalogView from './components/CatalogView'
import CartDrawer from './components/CartDrawer'
import CheckoutPage from './components/CheckoutPage'
import { readCache, writeCache } from './lib/cache'

const CART_KEY = 'monacosv_cart'

export default function App({ view = 'home' } = {}) {
  const { cfg } = useSettings()
  const navigate = useNavigate()
  // El carrito se guarda en el navegador: sobrevive a recargar la página y al
  // inicio de sesión con Google (que sale y vuelve a la tienda).
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
      return Array.isArray(saved) ? saved.filter((i) => i?.product?.id && i.qty > 0) : []
    } catch {
      return []
    }
  })
  const [coupon, setCoupon] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      /* sin almacenamiento: el carrito vive solo en esta visita */
    }
  }, [cart])
  // Catálogo real: todo viene de Supabase (lo que administras en el panel).
  // Se parte de la última copia guardada (si hay) y se refresca desde Supabase.
  const [products, setProducts] = useState(() => readCache('products') ?? [])
  const [catalogState, setCatalogState] = useState(() => (readCache('products')?.length ? 'ready' : 'loading')) // loading | ready | error
  const [genders, setGenders] = useState(() => readCache('genders') ?? {})
  const [discounts, setDiscounts] = useState(() => readCache('discounts') ?? [])

  useEffect(() => {
    fetchActiveProducts()
      .then((data) => {
        setProducts(data ?? [])
        writeCache('products', data ?? [])
        setCatalogState('ready')
      })
      .catch((err) => {
        console.warn('No se pudo cargar el catálogo desde Supabase:', err.message)
        setCatalogState((s) => (s === 'ready' ? s : 'error')) // con copia guardada se sigue mostrando
      })
    fetchActiveCategories()
      .then((cats) => {
        const map = Object.fromEntries(cats.map((c) => [c.name, c.gender]))
        setGenders(map)
        writeCache('genders', map)
      })
      .catch(() => {}) // si la tabla aún no existe, se deduce del nombre
    fetchActiveDiscounts()
      .then((list) => {
        setDiscounts(list)
        writeCache('discounts', list)
      })
      .catch((err) => console.warn('No se pudieron cargar los descuentos:', err.message))
  }, [])

  // el carrito lateral se cierra al llegar a la página de pago (por ejemplo, tras iniciar sesión)
  useEffect(() => {
    if (view === 'checkout') setCartOpen(false)
  }, [view])

  // Al cargar el catálogo, el carrito guardado se pone al día (precios nuevos; sin lo que ya no se vende)
  useEffect(() => {
    if (catalogState !== 'ready') return
    setCart((prev) =>
      prev
        .map((i) => {
          const fresh = products.find((p) => p.id === i.product.id)
          return fresh ? { ...i, product: fresh } : null
        })
        .filter(Boolean)
    )
  }, [catalogState, products])

  // Las presentaciones de 5 ml ya no se venden: se ocultan aunque sigan en la base.
  const catalog = useMemo(() => products.filter((p) => mlOf(p.volume) > 5), [products])

  // Todas las fragancias de la base (con o sin foto). La Home deja aparte la línea de mujer.
  const allFragrances = useMemo(() => buildFragrances(catalog, { requireImage: false, genders }), [catalog, genders])
  // La portada muestra solo las que elige el administrador (máx. 5 por sección)
  const fragrances = useMemo(
    () => pickFeatured(allFragrances.filter((f) => f.gender !== 'mujer'), cfg.featured_men),
    [allFragrances, cfg.featured_men]
  )
  const women = useMemo(
    () => pickFeatured(allFragrances.filter((f) => f.gender === 'mujer'), cfg.featured_women),
    [allFragrances, cfg.featured_women]
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

  const priceOf = useCallback((p) => effectivePrice(discounts, p), [discounts])
  const subtotal = cart.reduce((sum, i) => sum + effectivePrice(discounts, i.product) * i.qty, 0)
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141414] overflow-x-clip" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Home DUUMVIR: trae su propia barra, intro y pie */}
      {view === 'home' && (
        <DuumvirHome
          fragrances={fragrances}
          women={women}
          allFragrances={allFragrances}
          state={catalogState}
          priceOf={priceOf}
          onAdd={addToCart}
          itemCount={itemCount}
          onCart={() => setCartOpen(true)}
        />
      )}

      {view !== 'home' && (
        <>
          <Nav solid itemCount={itemCount} onCart={() => setCartOpen(true)} />
          <div className="h-16 sm:h-20" />
        </>
      )}

      {view === 'cuenta' && <AccountPage />}

      {view === 'checkout' && (
        <CheckoutPage
          items={cart}
          discounts={discounts}
          subtotal={subtotal}
          coupon={coupon}
          onCoupon={setCoupon}
          onOrderPlaced={() => {
            setCart([])
            setCoupon(null)
          }}
        />
      )}

      {view === 'ficha' && <ProductPage fragrances={allFragrances} state={catalogState} priceOf={priceOf} onAdd={addToCart} cartOpen={cartOpen} />}

      {view === 'fragancias' && (
        <CatalogView
          fragrances={allFragrances}
          state={catalogState}
          priceOf={priceOf}
          onAdd={addToCart}
        />
      )}

      {view !== 'home' && <Closing />}

      {cartOpen && (
        <CartDrawer
          items={cart}
          discounts={discounts}
          subtotal={subtotal}
          coupon={coupon}
          onCoupon={setCoupon}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onQty={setQty}
          onCheckout={() => {
            setCartOpen(false)
            navigate('/checkout')
          }}
        />
      )}
    </div>
  )
}
