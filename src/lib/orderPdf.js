import logoImg from '../assets/logo-pdf.png'
import { formatPrice } from '../catalog'

// PDF del pedido o de la cotización, generado en el navegador del cliente.
// La librería (jsPDF) se carga solo cuando hace falta.

const INK = [15, 26, 46]
const AMBER = [194, 97, 12]
const GRAY = [100, 116, 139]
const LINE = [226, 232, 240]
const SOFT = [248, 250, 252]
const GREEN = [21, 128, 61]
const WHITE = [255, 255, 255]

// El logo se reduce antes de incrustarlo: así el PDF pesa unos pocos KB.
async function logoDataUrl() {
  try {
    const blob = await (await fetch(logoImg)).blob()
    const bitmap = await createImageBitmap(blob)
    const size = 200
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = Math.round((bitmap.height / bitmap.width) * size)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return { url: canvas.toDataURL('image/png'), ratio: canvas.height / canvas.width }
  } catch {
    return null
  }
}

const dateText = (d) =>
  new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })

// "+503 7000-0000" a partir de un número local de 8 dígitos o internacional
function phoneText(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const full = digits.length === 8 ? `503${digits}` : digits
  return full.startsWith('503') && full.length === 11 ? `+503 ${full.slice(3, 7)}-${full.slice(7)}` : `+${full}`
}

// "Asad Elixir (100 ml)" → { title: 'Asad Elixir', size: '100 ml' }
const splitName = (name) => {
  const m = String(name).match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  return m ? { title: m[1], size: m[2] } : { title: String(name), size: '' }
}

// data: { kind: 'pedido' | 'cotizacion', number, createdAt, customer: {...},
//         items: [{ name, qty, unit }], subtotal, discount, couponCode, total, shipping?, carrier? }
// store: { name, city, whatsapp, email }
export async function buildOrderPdf(data, store) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const W = 210
  const H = 297
  const M = 15
  const CW = W - M * 2
  const isQuote = data.kind === 'cotizacion'
  const label = isQuote ? 'COTIZACIÓN' : data.number ? 'PEDIDO' : 'SOLICITUD DE PEDIDO'
  const code = isQuote ? (data.number ? `COT-${data.number}` : '') : data.number ? `#${data.number}` : ''
  const c = data.customer

  const color = (v) => doc.setTextColor(v[0], v[1], v[2])
  const fill = (v) => doc.setFillColor(v[0], v[1], v[2])
  const stroke = (v) => doc.setDrawColor(v[0], v[1], v[2])
  const text = (s, x, y, o = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal')
    doc.setFontSize(o.size ?? 10)
    color(o.color ?? INK)
    doc.text(s, x, y, { align: o.align ?? 'left' })
  }
  const wrap = (s, width, size, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    return doc.splitTextToSize(String(s), width)
  }

  // ---------- cabecera ----------
  fill(INK)
  doc.rect(0, 0, W, 3, 'F')
  fill(AMBER)
  doc.rect(0, 0, 46, 3, 'F')

  const logo = await logoDataUrl()
  let nameX = M
  if (logo) {
    stroke(LINE)
    fill(WHITE)
    doc.roundedRect(M, 12, 22, 22, 4, 4, 'FD')
    const lw = 17
    doc.addImage(logo.url, 'PNG', M + (22 - lw) / 2, 12 + (22 - lw * logo.ratio) / 2, lw, lw * logo.ratio)
    nameX = M + 28
  }
  text(String(store.name).toUpperCase(), nameX, 22.5, { bold: true, size: 21 })
  text(store.city ? `Masculine fragrance studio  ·  ${store.city}, El Salvador` : 'Masculine fragrance studio', nameX, 29, { size: 8.5, color: GRAY })

  text(label, W - M, 17, { bold: true, size: 9, color: AMBER, align: 'right' })
  if (code) text(code, W - M, 27, { bold: true, size: 22, align: 'right' })
  text(dateText(data.createdAt), W - M, 34, { size: 9, color: GRAY, align: 'right' })

  stroke(LINE)
  doc.line(M, 42, W - M, 42)

  // ---------- tarjetas de datos ----------
  const card = (x, y, w, title, rows) => {
    const pad = 5
    const inner = w - pad * 2
    const laid = rows.filter(([, v]) => v).map(([k, v]) => ({ k, lines: wrap(v, inner, 10, true) }))
    const h = 12 + laid.reduce((n, r) => n + 3.6 + 4.6 * r.lines.length + 1.8, 0) + 1
    fill(SOFT)
    stroke(LINE)
    doc.roundedRect(x, y, w, h, 3, 3, 'FD')
    text(title, x + pad, y + 7, { bold: true, size: 7.5, color: AMBER })
    let cy = y + 12.5
    laid.forEach((r) => {
      text(r.k.toUpperCase(), x + pad, cy, { bold: true, size: 6.5, color: GRAY })
      r.lines.forEach((ln, i) => text(ln, x + pad, cy + 4.4 + i * 4.6, { bold: true, size: 10 }))
      cy += 3.6 + 4.6 * r.lines.length + 1.8
    })
    return h
  }

  const gap = 6
  const cardW = (CW - gap) / 2
  let y = 50
  const left = [['Nombre', c.name], ['Teléfono', c.phone]]
  const right = isQuote
    ? [['Solicitud', 'Cotización por WhatsApp'], ['Vigencia', 'Precios sujetos a disponibilidad']]
    : c.delivery === 'retiro'
      ? [['Entrega', 'Retiro en tienda'], ['Punto de retiro', store.city ? `${store.city}, El Salvador` : '']]
      : [
          ['Entrega', 'Envío a domicilio'],
          ['Destino', [c.municipality, c.department].filter(Boolean).join(', ')],
          ['Dirección', c.address],
          ['Paquetera', data.carrier],
        ]
  // misma altura en las dos tarjetas
  const probe = (rows) => 12 + rows.filter(([, v]) => v).reduce((n, [, v]) => n + 3.6 + 4.6 * wrap(v, cardW - 10, 10, true).length + 1.8, 0) + 1
  const hh = Math.max(probe(left), probe(right))
  const drawCard = (x, title, rows) => {
    const h = card(x, y, cardW, title, rows)
    return h
  }
  drawCard(M, 'CLIENTE', left)
  drawCard(M + cardW + gap, isQuote ? 'DETALLE' : 'ENTREGA', right)
  y += hh + 6

  if (c.notes) {
    const lines = wrap(c.notes, CW - 10, 9.5)
    const h = 10 + lines.length * 4.4
    fill(SOFT)
    stroke(LINE)
    doc.roundedRect(M, y, CW, h, 3, 3, 'FD')
    text('NOTA DEL CLIENTE', M + 5, y + 6.5, { bold: true, size: 7, color: AMBER })
    lines.forEach((ln, i) => text(ln, M + 5, y + 11.5 + i * 4.4, { size: 9.5 }))
    y += h + 6
  }

  // ---------- tabla de productos ----------
  const col = { name: M + 5, qty: 128, unit: 162, sub: W - M - 5 }
  const head = () => {
    fill(INK)
    doc.roundedRect(M, y, CW, 9, 2, 2, 'F')
    text('PRODUCTO', col.name, y + 5.9, { bold: true, size: 7.5, color: WHITE })
    text('CANT.', col.qty, y + 5.9, { bold: true, size: 7.5, color: WHITE, align: 'center' })
    text('PRECIO', col.unit, y + 5.9, { bold: true, size: 7.5, color: WHITE, align: 'right' })
    text('SUBTOTAL', col.sub, y + 5.9, { bold: true, size: 7.5, color: WHITE, align: 'right' })
    y += 11
  }
  head()
  data.items.forEach((it, i) => {
    const { title, size } = splitName(it.name)
    const lines = wrap(title, 88, 10.5, true)
    const h = Math.max(12, lines.length * 4.8 + (size ? 4.6 : 0) + 5)
    if (y + h > 262) {
      doc.addPage()
      y = 18
      head()
    }
    if (i % 2 === 0) {
      fill(SOFT)
      doc.rect(M, y - 1, CW, h, 'F')
    }
    lines.forEach((ln, n) => text(ln, col.name, y + 5.5 + n * 4.8, { bold: true, size: 10.5 }))
    if (size) text(size, col.name, y + 5.5 + lines.length * 4.8 - 0.6, { size: 8.5, color: GRAY })
    text(String(it.qty), col.qty, y + 6, { size: 10.5, align: 'center' })
    text(formatPrice(it.unit), col.unit, y + 6, { size: 10.5, align: 'right', color: GRAY })
    text(formatPrice(it.unit * it.qty), col.sub, y + 6, { bold: true, size: 10.5, align: 'right' })
    y += h
  })
  stroke(LINE)
  doc.line(M, y - 1, W - M, y - 1)

  // ---------- totales ----------
  const totalsH = 22 + (data.discount > 0 ? 6 : 0) + (data.shipping != null ? 6 : 0) + 4
  if (y + totalsH + 24 > 270) {
    doc.addPage()
    y = 18
  }
  y += 7
  const tx = W - M - 84
  const row = (k, v, o = {}) => {
    text(k, tx, y, { size: 10, color: o.color ?? GRAY })
    text(v, W - M, y, { size: 10, bold: true, color: o.color ?? INK, align: 'right' })
    y += 6
  }
  const nextSteps = isQuote
    ? 'Esta cotización es informativa: los precios y la disponibilidad se confirman al hacer el pedido.'
    : data.number
      ? 'Pedido recibido. Te escribiremos por WhatsApp para confirmar el pago y la entrega.'
      : 'Solicitud de pedido. Te escribiremos por WhatsApp para confirmarla.'
  const noteLines = wrap(nextSteps, 88, 9)
  const startY = y
  text('¿CÓMO SEGUIMOS?', M, y, { bold: true, size: 7.5, color: AMBER })
  noteLines.forEach((ln, i) => text(ln, M, y + 6 + i * 4.4, { size: 9, color: GRAY }))
  const wa = phoneText(store.whatsapp)
  if (wa) text(`Escríbenos al WhatsApp ${wa}`, M, y + 6 + noteLines.length * 4.4 + 3, { bold: true, size: 9 })

  y = startY
  row('Subtotal', formatPrice(data.subtotal))
  if (data.discount > 0) row(data.couponCode ? `Cupón ${data.couponCode}` : 'Descuento', `-${formatPrice(data.discount)}`, { color: GREEN })
  if (data.shipping != null) row(data.carrier ? `Envío · ${data.carrier}` : 'Envío', data.shipping > 0 ? formatPrice(data.shipping) : 'Gratis')
  y += 2
  fill(INK)
  doc.roundedRect(tx - 4, y, 88, 15, 3, 3, 'F')
  text('TOTAL', tx + 2, y + 9.4, { bold: true, size: 9, color: [203, 213, 225] })
  text(formatPrice(data.total + (data.shipping || 0)), W - M - 4, y + 10.2, { bold: true, size: 17, color: WHITE, align: 'right' })

  // ---------- pie en todas las páginas ----------
  const pages = doc.getNumberOfPages()
  const contact = [store.city && `${store.city}, El Salvador`, wa && `WhatsApp ${wa}`, store.email].filter(Boolean).join('   ·   ')
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    fill(INK)
    doc.rect(0, H - 14, W, 14, 'F')
    text(String(store.name).toUpperCase(), M, H - 6, { bold: true, size: 8.5, color: WHITE })
    text(contact, W / 2 + 8, H - 6, { size: 7.5, color: [203, 213, 225], align: 'center' })
    if (pages > 1) text(`${p}/${pages}`, W - M, H - 6, { size: 7.5, color: [203, 213, 225], align: 'right' })
  }

  return doc.output('blob')
}

export function pdfFilename(data) {
  const suffix = data.number ? (data.kind === 'cotizacion' ? `COT-${data.number}` : data.number) : 'borrador'
  return `${data.kind === 'cotizacion' ? 'Cotizacion' : 'Pedido'}-${suffix}.pdf`
}
