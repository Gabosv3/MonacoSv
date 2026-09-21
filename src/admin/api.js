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
  if (error) throw error
  return data
}

export async function createSale({ items, ...sale }) {
  const { data: createdSale, error: saleError } = await supabase
    .from('sales')
    .insert(sale)
    .select()
    .single()
  if (saleError) throw saleError

  const rows = items.map((item) => ({ ...item, sale_id: createdSale.id }))
  const { error: itemsError } = await supabase.from('sale_items').insert(rows)
  if (itemsError) throw itemsError

  return createdSale
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

// ---------- Tienda pública (lectura) ----------

export async function fetchActiveProducts() {
  const { data, error } = await supabase.from('products').select('*').eq('active', true).order('name')
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
