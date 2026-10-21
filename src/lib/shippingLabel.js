// Etiqueta de despacho para la paquetera. Se genera como PDF del tamaño exacto de la
// etiqueta (así la impresora no recorta nada) y se abre lista para imprimir.
import { downloadBlob } from './sendPdf'

// Tamaños de etiqueta térmica (ancho × alto en mm). El primero es el más usado en paquetería.
export const LABEL_SIZES = {
  '100x150': { label: '10 × 15 cm', hint: 'La más usada en paquetería', w: 100, h: 150 },
  '100x100': { label: '10 × 10 cm', hint: 'Más compacta', w: 100, h: 100 },
  '100x50': { label: '10 × 5 cm', hint: 'Pequeña, solo lo esencial', w: 100, h: 50 },
}

const INK = [15, 26, 46]
const GRAY = [71, 85, 105]
const LINE = [148, 163, 184]

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

const longDay = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${cap(date.toLocaleDateString('es', { weekday: 'long' }))} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

const shortDay = (iso) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function data(shipment, cfg) {
  const sale = shipment.sales ?? {}
  const envio = Number(shipment.cost) || 0
  const day = shipment.ship_date || sale.delivery_date
  const created = sale.created_at || shipment.created_at
  return {
    store: String(cfg.store_name || 'MonacoSV').toUpperCase(),
    folio: sale.invoice_number || (sale.order_number ? `PED-${sale.order_number}` : ''),
    date: created ? shortDay(created) : '',
    customer: sale.customer_name || '',
    phone: sale.customer_phone || '',
    point: [sale.address, sale.municipality, sale.department].filter(Boolean).join(', '),
    day: day ? longDay(day) : 'Por coordinar',
    hour: sale.delivery_window || 'Por coordinar',
    carrier: shipment.carriers?.name || 'Sin asignar',
    tracking: shipment.tracking_number || '',
    items: (sale.sale_items ?? []).map((i) => {
      const qty = Number(i.quantity) || 1
      const sub = Number(i.subtotal) || (Number(i.unit_price) || 0) * qty
      return { qty, name: i.product_name || '', unit: Number(i.unit_price) || sub / qty, sub }
    }),
    envio,
    total: (Number(sale.total) || 0) + envio,
    contact: cfg.whatsapp || '',
  }
}

export async function buildLabelPdf(shipment, cfg = {}, size = '100x150') {
  const { jsPDF } = await import('jspdf')
  const sz = LABEL_SIZES[size] ?? LABEL_SIZES['100x150']
  const d = data(shipment, cfg)
  const W = sz.w
  const H = sz.h
  const compact = H <= 60
  const doc = new jsPDF({ unit: 'mm', format: [W, H], orientation: W > H ? 'landscape' : 'portrait', compress: true })
  const M = compact ? 3 : 5

  const color = (c) => doc.setTextColor(c[0], c[1], c[2])
  const draw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const text = (s, x, y, o = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal')
    doc.setFontSize(o.size ?? 9)
    color(o.color ?? INK)
    doc.text(String(s), x, y, { align: o.align ?? 'left' })
  }
  const wrap = (s, width, size, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    return doc.splitTextToSize(String(s || '—'), width)
  }

  // ---------- cabecera ----------
  const band = compact ? 8 : H >= 140 ? 18 : 12
  text(d.store, M, band / 2 + (compact ? 1.4 : 2.2), { bold: true, size: compact ? 9 : H >= 140 ? 16 : 13 })
  text(d.folio, W - M, compact ? band / 2 + 1.3 : band / 2 - 0.2, { bold: true, size: compact ? 8 : 11, align: 'right' })
  if (!compact) text(d.date, W - M, band / 2 + 4, { size: 7, color: GRAY, align: 'right' })
  draw(INK)
  doc.setLineWidth(compact ? 0.5 : 0.8)
  doc.line(M, band, W - M, band)
  doc.setLineWidth(0.2)

  // campo con título pequeño y valor en negrita; devuelve la altura usada
  const field = (label, value, x, y, width, o = {}) => {
    const lSize = compact ? 4.6 : 6
    const vSize = o.size ?? (compact ? 7 : H >= 140 ? 10 : 9)
    text(label.toUpperCase(), x, y, { size: lSize, bold: true, color: GRAY })
    const lines = wrap(value, width, vSize, true).slice(0, o.lines ?? 2)
    const lh = vSize * 0.43
    lines.forEach((ln, i) => text(ln, x, y + (compact ? 2.6 : vSize > 10 ? 5.4 : 3.8) + i * lh, { bold: true, size: vSize, color: o.color ?? INK }))
    return (compact ? 3 : vSize > 10 ? 6 : 4.4) + lines.length * lh
  }

  if (compact) {
    // 10 × 5: dos columnas
    const left = 60 - M
    let y = band + 4
    y += field('Cliente', d.customer, M, y, left, { lines: 1, size: 8 }) + 0.6
    y += field('Teléfono', d.phone, M, y, left, { lines: 1 }) + 0.6
    y += field('Punto', d.point, M, y, left, { lines: 2, size: 6.2 }) + 0.4
    field('Entrega', `${d.day}  ·  ${d.hour}`, M, y, left, { lines: 1, size: 6 })
    const rx = 63
    const rw = W - M - rx
    draw(LINE)
    doc.line(rx - 2, band + 2, rx - 2, H - M)
    field('Encomienda', d.carrier, rx, band + 4, rw, { lines: 1 })
    let ry = band + 12
    d.items.slice(0, 2).forEach((i) => {
      text(`${i.qty}x ${wrap(i.name, rw - 2, 6)[0]}`, rx, ry, { size: 6 })
      ry += 3
    })
    if (d.items.length > 2) text(`+${d.items.length - 2} más`, rx, ry, { size: 5.5, color: GRAY })
    const bh = 12
    const by = H - M - bh
    if (d.envio) text(`Envío ${money(d.envio)}`, W - M, by - 1.2, { size: 5.5, color: GRAY, align: 'right' })
    draw(INK)
    doc.setLineWidth(0.6)
    doc.roundedRect(rx, by, rw, bh, 1.5, 1.5, 'S')
    doc.setLineWidth(0.2)
    text('A COBRAR', rx + 2, by + 4.5, { size: 5.5, bold: true, color: GRAY })
    text(money(d.total), W - M - 2, by + 10, { size: 14, bold: true, align: 'right' })
    return doc
  }

  // ---------- 10 × 15 y 10 × 10 ----------
  const big = H >= 140
  const cw = W - M * 2
  const half = (cw - 4) / 2
  let y = band + (big ? 7 : 4)

  if (big) {
    y += field('Cliente', d.customer, M, y, cw, { size: 13, lines: 1 }) + 2
    const h1 = field('Teléfono', d.phone, M, y, half)
    const h2 = field('Encomienda', d.carrier, M + half + 4, y, half)
    y += Math.max(h1, h2) + 2
    y += field('Punto', d.point, M, y, cw, { lines: 2 }) + 2
    const h3 = field('Día de entrega', d.day, M, y, half)
    const h4 = field('Hora', d.hour, M + half + 4, y, half)
    y += Math.max(h3, h4) + 1
  } else {
    // 10 × 10: más compacta para que quepan los productos
    const h1 = field('Cliente', d.customer, M, y, half + 8, { size: 10, lines: 2 })
    const h2 = field('Teléfono', d.phone, M + half + 12, y, half - 8, { size: 9 })
    y += Math.max(h1, h2) + 1
    y += field('Punto', d.point, M, y, cw, { lines: 2, size: 8 }) + 1
    const h3 = field('Encomienda', d.carrier, M, y, half, { size: 8 })
    const h4 = field('Entrega', `${d.day}
${d.hour}`, M + half + 4, y, half, { size: 8 })
    y += Math.max(h3, h4) + 0.5
  }
  if (d.tracking) y += field('Guía', d.tracking, M, y, cw, { lines: 1 }) + 1

  draw(LINE)
  doc.line(M, y, W - M, y)
  y += big ? 4 : 3

  // tabla de productos
  const cols = { name: M + 13, unit: W - M - 20, tot: W - M }
  const th = big ? 6 : 5.2
  draw(INK)
  doc.line(M, y, W - M, y)
  doc.line(M, y + th, W - M, y + th)
  const hy = y + th / 2 + 1.1
  text('CANT.', M + 2, hy, { size: 5.8, bold: true, color: GRAY })
  text('PRODUCTO', cols.name, hy, { size: 5.8, bold: true, color: GRAY })
  text('V. UNIT.', cols.unit, hy, { size: 5.8, bold: true, color: GRAY, align: 'right' })
  text('TOTAL', cols.tot - 1.5, hy, { size: 5.8, bold: true, color: GRAY, align: 'right' })
  y += th + 1

  const bh = big ? 15 : 11
  const by = H - M - (d.contact ? 6 : 1) - bh
  const limit = by - 6 // las filas de productos terminan antes del envío
  let hidden = 0
  d.items.forEach((i) => {
    const lines = wrap(i.name, cols.unit - cols.name - 14, big ? 8.5 : 8)
    const rh = Math.max(5.2, lines.length * 3.4 + 1.8)
    if (y + rh > limit) {
      hidden += 1
      return
    }
    text(String(i.qty), M + 5.5, y + 3.7, { size: big ? 9 : 8.5, bold: true, align: 'center' })
    lines.forEach((ln, n) => text(ln, cols.name, y + 3.7 + n * 3.4, { size: big ? 8.5 : 8 }))
    text(money(i.unit), cols.unit, y + 3.7, { size: big ? 8.5 : 8, align: 'right' })
    text(money(i.sub), cols.tot - 1.5, y + 3.7, { size: big ? 8.5 : 8, bold: true, align: 'right' })
    y += rh
    draw(LINE)
    doc.line(M, y, W - M, y)
  })

  if (hidden) text(`+ ${hidden} producto${hidden > 1 ? 's' : ''} más (ver factura)`, M + 2, y + 3.4, { size: 6.5, color: GRAY })

  // totales, pegados abajo
  text('Envío', W - M - 24, by - 2.2, { size: 8.5, color: GRAY, align: 'right' })
  text(d.envio ? money(d.envio) : 'Gratis', W - M - 1.5, by - 2.2, { size: 8.5, bold: true, align: 'right' })
  draw(INK)
  doc.setLineWidth(0.8)
  doc.roundedRect(M, by, cw, bh, 2, 2, 'S')
  doc.setLineWidth(0.2)
  text('A COBRAR', M + 4, by + bh / 2 + 1.6, { size: big ? 11 : 9.5, bold: true })
  text(money(d.total), W - M - 4, by + bh / 2 + (big ? 2.8 : 2.4), { size: big ? 20 : 16, bold: true, align: 'right' })

  if (d.contact) {
    text(`¡Gracias por preferirnos!  ·  Contáctenos: ${d.contact}`, W / 2, H - M, { size: 6.5, color: GRAY, align: 'center' })
  }
  return doc
}

export const labelFilename = (shipment) => {
  const sale = shipment.sales ?? {}
  return `etiqueta-${sale.invoice_number || sale.order_number || 'despacho'}.pdf`
}

// Abre la etiqueta en una pestaña nueva, lista para imprimir (o la descarga si el navegador bloquea la pestaña)
export async function printShippingLabel(shipment, cfg, size) {
  const win = window.open('', '_blank')
  try {
    const doc = await buildLabelPdf(shipment, cfg, size)
    doc.autoPrint()
    const blob = doc.output('blob')
    if (win) {
      win.location.href = URL.createObjectURL(blob)
    } else {
      downloadBlob(blob, labelFilename(shipment))
    }
  } catch (err) {
    win?.close()
    throw err
  }
}
