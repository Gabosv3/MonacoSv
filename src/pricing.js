// Precios de la tienda: descuentos activos, precio con descuento del producto y cupones.

// El descuento activo (si hay uno) que aplica a este producto: por producto,
// por categoría, o a todo el catálogo. Si hay varios, se usa el primero.
export function findDiscount(discounts, product) {
  return discounts.find(
    (d) =>
      d.scope === 'all' ||
      (d.scope === 'category' && d.scope_value === product.category) ||
      (d.scope === 'product' && d.scope_value === product.id)
  )
}

// Precio final: el menor entre el precio con descuento del producto (sale_price)
// y el que resulta de las reglas de descuento activas. En dólares, con centavos.
export function effectivePrice(discounts, product) {
  const base = Number(product.price)
  const sale = Number(product.sale_price)
  let best = sale > 0 && sale < base ? sale : base
  const d = findDiscount(discounts, product)
  if (d) {
    const off = d.type === 'percent' ? (base * d.value) / 100 : d.value
    best = Math.min(best, Math.max(0, Math.round((base - off) * 100) / 100))
  }
  return best
}

// Cuánto descuenta un cupón sobre un subtotal (nunca más que el subtotal)
export function couponAmount(coupon, subtotal) {
  if (!coupon) return 0
  const raw = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : Number(coupon.value)
  return Math.min(subtotal, Math.round(raw * 100) / 100)
}
