import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// ---------- Productos ----------

export async function listProducts() {
  const { data, error } = await supabase.from('products').select('*').order('name')
  if (error) throw error
  return data
}

export async function createProduct(product) {
  const { data, error } = await supabase.from('products').insert(product).select().single()
  if (error) throw error
  return data
}

export async function updateProduct(id, patch) {
  const { data, error } = await supabase.from('products').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ---------- Compras ----------

export async function listPurchases() {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, products(name)')
    .order('purchased_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return data
}

export async function createPurchase(purchase) {
  const { data, error } = await supabase.from('purchases').insert(purchase).select().single()
  if (error) throw error
  return data
}

export async function deletePurchase(id) {
  // Nota: borrar una compra NO revierte el stock automáticamente (solo el
  // trigger de inserción lo ajusta). Ajusta el stock manualmente si borras
  // una compra por error.
  const { error } = await supabase.from('purchases').delete().eq('id', id)
  if (error) throw error
}

// ---------- Ventas ----------

export async function listSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
    .order('created_at', { ascending: false })
    .limit(500) // los más recientes: el plan gratuito cobra por datos transferidos
  if (error) throw error
  return data
}

// Campos que solo existen después de ejecutar supabase/orders.sql
const DELIVERY_FIELDS = [
  'delivery_method', 'department', 'municipality', 'address', 'notes',
  'delivery_date', 'delivery_window', 'courier_id', 'customer_id',
]

export async function createSale({ items, ...sale }) {
  let { data: createdSale, error: saleError } = await supabase.from('sales').insert(sale).select().single()
  // Si la tabla aún no tiene los campos de entrega, reintenta sin ellos para no perder el pedido
  if (saleError && /column|schema cache/i.test(saleError.message)) {
    const basic = Object.fromEntries(Object.entries(sale).filter(([k]) => !DELIVERY_FIELDS.includes(k)))
    ;({ data: createdSale, error: saleError } = await supabase.from('sales').insert(basic).select().single())
  }
  if (saleError) throw saleError

  const rows = items.map((item) => ({ ...item, sale_id: createdSale.id }))
  const { error: itemsError } = await supabase.from('sale_items').insert(rows)
  if (itemsError) throw itemsError

  return createdSale
}

export async function updateSale(id, patch) {
  const { data, error } = await supabase.from('sales').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Emite la factura del pedido (una sola vez) y devuelve su número
export async function invoiceSale(id) {
  const { data, error } = await supabase.rpc('invoice_sale', { p_sale_id: id })
  if (error) throw error
  return data
}

// ---------- Encomendistas = paqueteras (una sola lista, tabla `carriers`) ----------
// Ver supabase/unify_carriers.sql

export async function listCouriers() {
  const { data, error } = await supabase.from('carriers').select('*').order('name')
  if (error) throw error
  return data
}

export async function createCourier(courier) {
  const { data, error } = await supabase.from('carriers').insert(courier).select().single()
  if (error) throw error
  return data
}

export async function updateCourier(id, patch) {
  const { error } = await supabase.from('carriers').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteCourier(id) {
  const { error } = await supabase.from('carriers').delete().eq('id', id)
  if (error) throw error
}

// ---------- Logística: paqueteras y despachos ----------

export async function listCarriers() {
  const [{ data: carriers, error: e1 }, { data: ships, error: e2 }] = await Promise.all([
    supabase.from('carriers').select('*').order('name'),
    supabase.from('shipments').select('carrier_id'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  return carriers.map((c) => ({ ...c, shipment_count: ships.filter((s) => s.carrier_id === c.id).length }))
}

export async function createCarrier(carrier) {
  const { data, error } = await supabase.from('carriers').insert(carrier).select().single()
  if (error) throw error
  return data
}

export async function updateCarrier(id, patch) {
  const { error } = await supabase.from('carriers').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteCarrier(id) {
  const { error } = await supabase.from('carriers').delete().eq('id', id)
  if (error) throw error
}

export async function listShipments() {
  const { data, error } = await supabase
    .from('shipments')
    .select('*, carriers(name, tracking_url), sales(order_number, invoice_number, customer_name, customer_phone, department, municipality, address, total, status, created_at, delivery_date, delivery_window, sale_items(product_name, quantity, unit_price, subtotal))')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return data
}

export async function createShipment(shipment) {
  const { data, error } = await supabase.from('shipments').insert(shipment).select().single()
  if (error) throw error
  return data
}

export async function updateShipment(id, patch) {
  const { error } = await supabase.from('shipments').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteShipment(id) {
  const { error } = await supabase.from('shipments').delete().eq('id', id)
  if (error) throw error
}

// Pedido de la tienda: el servidor toma los precios de la base de datos, aplica
// descuentos y cupón, revisa el stock y devuelve el número de pedido.
// Paqueteras activas con su precio de envío (las ve el cliente en el pago)
export async function listShippingOptions() {
  const { data, error } = await supabase.rpc('shipping_options')
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export async function placeOrder({ customer, items, coupon }) {
  const { data, error } = await supabase.rpc('place_order', {
    p_customer: customer,
    p_items: items,
    p_coupon: coupon ?? null,
  })
  if (error) throw error
  return data
}

export async function updateSaleStatus(id, status) {
  const { data, error } = await supabase.from('sales').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ---------- Descuentos ----------

export async function listDiscounts() {
  const { data, error } = await supabase.from('discounts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createDiscount(discount) {
  const { data, error } = await supabase.from('discounts').insert(discount).select().single()
  if (error) throw error
  return data
}

export async function updateDiscount(id, patch) {
  const { data, error } = await supabase.from('discounts').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteDiscount(id) {
  const { error } = await supabase.from('discounts').delete().eq('id', id)
  if (error) throw error
}

// ---------- Cupones ----------

export async function listCoupons() {
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createCoupon(coupon) {
  const { data, error } = await supabase.from('coupons').insert(coupon).select().single()
  if (error) throw error
  return data
}

export async function updateCoupon(id, patch) {
  const { data, error } = await supabase.from('coupons').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCoupon(id) {
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) throw error
}

// ---------- Usuarios, roles y permisos ----------

// Roles y permisos del usuario actual (null si la migración aún no se ejecutó)
export async function fetchMyAccess() {
  const { data, error } = await supabase.rpc('my_access')
  if (error) throw error
  return data
}

export async function listUsers() {
  const [{ data: profiles, error: e1 }, { data: links, error: e2 }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    supabase.from('user_roles').select('user_id, role_id'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  return profiles.map((p) => ({ ...p, role_ids: links.filter((l) => l.user_id === p.id).map((l) => l.role_id) }))
}

export async function listRoles() {
  const [{ data: roles, error: e1 }, { data: rp, error: e2 }, { data: ur, error: e3 }] = await Promise.all([
    supabase.from('roles').select('*').order('created_at', { ascending: true }),
    supabase.from('role_permissions').select('role_id, permission'),
    supabase.from('user_roles').select('role_id'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  if (e3) throw e3
  return roles.map((r) => ({
    ...r,
    permissions: rp.filter((x) => x.role_id === r.id).map((x) => x.permission),
    user_count: ur.filter((x) => x.role_id === r.id).length,
  }))
}

export async function listPermissions() {
  const { data, error } = await supabase.from('permissions').select('*').order('sort')
  if (error) throw error
  return data
}

// Crea o actualiza un rol y reemplaza su lista de permisos
export async function saveRole({ id, name, label, description, permissions }) {
  let roleId = id
  if (id) {
    const { error } = await supabase.from('roles').update({ label, description }).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('roles').insert({ name, label, description }).select().single()
    if (error) throw error
    roleId = data.id
  }
  // solo las diferencias (agregar primero, quitar después) para no perder permisos a mitad del guardado
  const { data: current, error: readError } = await supabase.from('role_permissions').select('permission').eq('role_id', roleId)
  if (readError) throw readError
  const have = new Set(current.map((r) => r.permission))
  const toAdd = permissions.filter((p) => !have.has(p))
  const toRemove = [...have].filter((p) => !permissions.includes(p))
  if (toAdd.length) {
    const { error } = await supabase.from('role_permissions').insert(toAdd.map((permission) => ({ role_id: roleId, permission })))
    if (error) throw error
  }
  if (toRemove.length) {
    const { error } = await supabase.from('role_permissions').delete().eq('role_id', roleId).in('permission', toRemove)
    if (error) throw error
  }
  return roleId
}

export async function deleteRole(id) {
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error
}

export async function updateProfile(id, patch) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id)
  if (error) throw error
}

// Ajusta los roles de un usuario aplicando solo las diferencias. Primero se
// agregan los nuevos y después se quitan los sobrantes: si se borraran todos y
// se volvieran a insertar, quien edita su propio usuario perdería el permiso
// a mitad de camino y la base de datos rechazaría el guardado.
export async function setUserRoles(userId, roleIds) {
  const { data: current, error: readError } = await supabase.from('user_roles').select('role_id').eq('user_id', userId)
  if (readError) throw readError
  const have = new Set(current.map((r) => r.role_id))
  const toAdd = roleIds.filter((id) => !have.has(id))
  const toRemove = [...have].filter((id) => !roleIds.includes(id))
  if (toAdd.length) {
    const { error } = await supabase.from('user_roles').insert(toAdd.map((role_id) => ({ user_id: userId, role_id })))
    if (error) throw error
  }
  if (toRemove.length) {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).in('role_id', toRemove)
    if (error) throw error
  }
}

// Crea la cuenta con un cliente aparte (sin guardar sesión) para no cerrar la
// sesión del administrador. Un trigger en Supabase crea el perfil.
export async function createUserAccount({ email, password, full_name }) {
  const temp = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await temp.auth.signUp({ email, password, options: { data: { full_name } } })
  if (error) throw error
  // Supabase responde "éxito" sin identidades cuando el correo ya está registrado
  if (!data.user || data.user.identities?.length === 0) throw new Error('Ya existe una cuenta con ese correo.')
  return data.user
}

// ---------- Clientes ----------

// Clientes con sus pedidos y cotizaciones (para calcular lo que compran y lo que cotizan)
export async function listCustomersFull() {
  const [customers, sales, quotes] = await Promise.all([
    supabase.from('customers').select('*').order('created_at', { ascending: false }),
    supabase
      .from('sales')
      .select('id, order_number, customer_id, total, status, created_at, sale_items(product_name, quantity, subtotal)')
      .not('customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('quotes').select('*, quote_items(*)').order('created_at', { ascending: false }).limit(500),
  ])
  if (customers.error) throw customers.error
  if (quotes.error) throw quotes.error
  return { customers: customers.data, sales: sales.data ?? [], quotes: quotes.data }
}

export async function createCustomer(customer) {
  const { data, error } = await supabase.from('customers').insert(customer).select().single()
  if (error) throw error
  return data
}

export async function updateCustomer(id, patch) {
  const { error } = await supabase.from('customers').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}

// ---------- Cotizaciones ----------

export async function listQuotes() {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, customers(name, phone), quote_items(*)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return data
}

export async function createQuote({ items, ...quote }) {
  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const { data, error } = await supabase.from('quotes').insert({ ...quote, total }).select().single()
  if (error) throw error
  const { error: itemsError } = await supabase.from('quote_items').insert(items.map((i) => ({ ...i, quote_id: data.id })))
  if (itemsError) {
    await supabase.from('quotes').delete().eq('id', data.id)
    throw itemsError
  }
  return data
}

export async function updateQuote(id, patch) {
  const { error } = await supabase.from('quotes').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteQuote(id) {
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw error
}

// Desde la tienda: registra al cliente y su cotización sin necesitar cuenta
export async function requestQuote({ name, phone, notes, department, municipality, items }) {
  const { data, error } = await supabase.rpc('request_quote', {
    p_name: name,
    p_phone: phone,
    p_notes: notes,
    p_department: department,
    p_municipality: municipality,
    p_items: items,
  })
  if (error) throw error
  return data // número de cotización
}

// ---------- Fotos de productos (Supabase Storage) ----------

const IMAGE_BUCKET = 'Lociones' // bucket de Supabase Storage (ver supabase/storage.sql)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']

// Reduce fotos enormes (máx. 1000 px por lado) y las guarda en WebP, que
// conserva la transparencia. Si algo falla, se sube el archivo original.
async function prepareImage(file) {
  if (file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
    if (blob && blob.type === 'image/webp' && blob.size < file.size) return blob
  } catch {
    /* se usa el original */
  }
  return file
}

// Sube la foto y devuelve su URL pública
export async function uploadProductImage(file) {
  if (!ALLOWED_IMAGES.includes(file.type)) throw new Error('Usa una imagen PNG, JPG, WebP o GIF.')
  if (file.size > MAX_IMAGE_BYTES * 3) throw new Error('La imagen es demasiado grande (máximo 15 MB).')
  const body = await prepareImage(file)
  if (body.size > MAX_IMAGE_BYTES) throw new Error('La imagen pesa más de 5 MB. Redúcela e inténtalo de nuevo.')
  const ext = body.type === 'image/webp' ? 'webp' : file.type.split('/')[1].replace('jpeg', 'jpg')
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, body, {
    contentType: body.type || file.type,
    cacheControl: '31536000',
  })
  if (error) {
    const msg = String(error.message ?? '')
    if (/bucket not found/i.test(msg)) throw new Error('Falta crear el almacenamiento de fotos. Ejecuta supabase/storage.sql en el SQL Editor de Supabase.')
    if (/row-level security|not authorized|unauthorized|403/i.test(msg)) throw new Error('No tienes permiso para subir fotos.')
    throw new Error(msg || 'No se pudo subir la foto.')
  }
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

// Datos de la ficha de la fragancia, iguales en todas sus presentaciones
export async function setFragranceFields(name, fields) {
  const { error } = await supabase.from('products').update(fields).eq('name', name)
  if (error) throw error
}

// Misma foto para todas las presentaciones (filas) de un producto
export async function setImageForName(name, imageUrl) {
  const { error } = await supabase.from('products').update({ image_url: imageUrl }).eq('name', name)
  if (error) throw error
}

// ---------- Cuenta del cliente (tienda) ----------

export async function fetchMyCustomer(userId) {
  const { data, error } = await supabase.from('customers').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function saveMyProfile({ name, phone, department, municipality, address }) {
  const { data, error } = await supabase.rpc('save_my_profile', {
    p_name: name,
    p_phone: phone,
    p_department: department,
    p_municipality: municipality,
    p_address: address,
  })
  if (error) throw error
  return data
}

// Con detalle y seguimiento (supabase/my_orders.sql). Si esa función aún no existe,
// cae a la lista básica.
export async function listMyOrders(customerId) {
  const rpc = await supabase.rpc('my_orders')
  if (!rpc.error && Array.isArray(rpc.data)) return rpc.data
  const { data, error } = await supabase
    .from('sales')
    .select('id, order_number, total, status, created_at, delivery_method, department, municipality, sale_items(product_name, quantity, subtotal)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((o) => ({ ...o, items: o.sale_items ?? [] }))
}

export async function listMyQuotes(customerId) {
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_number, status, total, created_at, quote_items(product_name, quantity, unit_price)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ---------- Ajustes de la tienda ----------

export async function listSettings() {
  const { data, error } = await supabase.from('store_settings').select('key, value')
  if (error) throw error
  return data
}

// Guarda solo las claves indicadas (crea las que no existan)
export async function saveSettings(values) {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }))
  if (!rows.length) return
  const { error } = await supabase.from('store_settings').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}

// ---------- Categorías ----------

export async function listCategories() {
  const [{ data: cats, error: e1 }, { data: prods, error: e2 }] = await Promise.all([
    supabase.from('categories').select('*').order('sort').order('name'),
    supabase.from('products').select('category'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  return cats.map((c) => ({ ...c, product_count: prods.filter((p) => p.category === c.name).length }))
}

export async function createCategory(category) {
  const { data, error } = await supabase.from('categories').insert(category).select().single()
  if (error) throw error
  return data
}

// Si se cambia el nombre, los productos de esa categoría se actualizan con él
export async function updateCategory(id, patch, previousName) {
  const { error } = await supabase.from('categories').update(patch).eq('id', id)
  if (error) throw error
  if (patch.name && previousName && patch.name !== previousName) {
    const { error: pError } = await supabase.from('products').update({ category: patch.name }).eq('category', previousName)
    if (pError) throw pError
  }
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ---------- Tienda pública (lectura) ----------

export async function fetchActiveCategories() {
  const { data, error } = await supabase.from('categories').select('*').eq('active', true).order('sort').order('name')
  if (error) throw error
  return data
}


// La tienda lee la vista products_public (sin costos). Si todavía no se ejecutó
// supabase/performance.sql, cae a la tabla pero pidiendo solo las columnas públicas.
const PUBLIC_PRODUCT_COLUMNS = 'id, name, volume, category, price, sale_price, tags, brand, kind, fixation, highlight, code, stock, active, color, image_url, description'

let publicViewMissing = false

export async function fetchActiveProducts() {
  if (!publicViewMissing) {
    const viaView = await supabase.from('products_public').select(PUBLIC_PRODUCT_COLUMNS).order('name')
    if (!viaView.error) return viaView.data
    publicViewMissing = true // no se vuelve a intentar en esta visita
  }
  const { data, error } = await supabase.from('products').select(PUBLIC_PRODUCT_COLUMNS).eq('active', true).order('name')
  if (error) throw error
  return data
}

export async function fetchActiveDiscounts() {
  const { data, error } = await supabase.from('discounts').select('*').eq('active', true)
  if (error) throw error
  return data
}

export async function fetchCouponByCode(code) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .eq('active', true)
    .maybeSingle()
  if (error) throw error
  return data
}
