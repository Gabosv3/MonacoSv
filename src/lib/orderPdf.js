import logoImg from '../assets/logo-pdf.png'
import { formatPrice } from '../catalog'

// PDF del pedido o de la cotización, generado en el navegador del cliente.
// La librería (jsPDF) se carga solo cuando hace falta.

const INK = [15, 26, 46]
const AMBER = [194, 97, 12]
const GRAY = [100, 116, 139]
const LINE = [226, 232, 240]

// El logo se reduce antes de incrustarlo: así el PDF pesa unos pocos KB.
async function logoDataUrl() {
  try {
    const blob = await (await fetch(logoImg)).blob()
    const bitmap = await createImageBitmap(blob)
    const size = 160
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

// data: { kind: 'pedido' | 'cotizacion', number, createdAt, customer: {...},
//         items: [{ name, qty, unit }], subtotal, discount, couponCode, total, shipping?, carrier? }
// store: { name, city, whatsapp, email }
export async function buildOrderPdf(data, store) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const W = 210
  const M = 14
  const isQuote = data.kind === 'cotizacion'
  const label = isQuote ? 'COTIZACIÓN' : data.number ? 'PEDIDO' : 'SOLICITUD DE PEDIDO'
  const code = isQuote ? (data.number ? `COT-${data.number}` : '') : data.number ? `#${data.number}` : ''

  // franja superior
  doc.setFillColor(...INK)
  doc.rect(0, 0, W, 36, 'F')
  const logo = await logoDataUrl()
  if (logo) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(M, 8, 20, 20, 3, 3, 'F')
    doc.addImage(logo.url, 'PNG', M + 1.5, 9.5, 17, 17 * logo.ratio)
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(String(store.name).toUpperCase(), logo ? M + 26 : M, 19)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 190, 205)
  doc.text(store.city ? `${store.city}, El Salvador` : 'El Salvador', logo ? M + 26 : M, 25)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(`${label} ${code}`.trim(), W - M, 17, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 190, 205)
  doc.text(dateText(data.createdAt), W - M, 24, { align: 'right' })

  // cliente
  let y = 48
  const section = (title) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...AMBER)
    doc.text(title, M, y)
    y += 5
  }
  const field = (k, v) => {
    if (!v) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...GRAY)
    doc.text(`${k}:`, M, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    const lines = doc.splitTextToSize(String(v), W - M * 2 - 30)
    doc.text(lines, M + 30, y)
    y += 5.5 * lines.length
  }

  const c = data.customer
  section('CLIENTE')
  field('Nombre', c.name)
  field('Teléfono', c.phone)
  if (!isQuote) {
    field('Entrega', c.delivery === 'retiro' ? 'Retiro en tienda' : `Envío a ${[c.municipality, c.department].filter(Boolean).join(', ')}`)
    if (c.delivery !== 'retiro') field('Dirección', c.address)
  }
  field('Nota', c.notes)
  y += 4

  // tabla de productos
  const col = { name: M + 3, qty: 128, unit: 160, sub: W - M - 3 }
  const head = () => {
    doc.setFillColor(241, 245, 249)
    doc.rect(M, y, W - M * 2, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text('PRODUCTO', col.name, y + 5.3)
    doc.text('CANT.', col.qty, y + 5.3, { align: 'center' })
    doc.text('PRECIO', col.unit, y + 5.3, { align: 'right' })
    doc.text('SUBTOTAL', col.sub, y + 5.3, { align: 'right' })
    y += 8
  }
  head()
  data.items.forEach((it) => {
    const lines = doc.splitTextToSize(String(it.name), 100)
    const h = Math.max(9, 4.5 * lines.length + 4)
    if (y + h > 262) {
      doc.addPage()
      y = 20
      head()
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    doc.text(lines, col.name, y + 6)
    doc.text(String(it.qty), col.qty, y + 6, { align: 'center' })
    doc.text(formatPrice(it.unit), col.unit, y + 6, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(formatPrice(it.unit * it.qty), col.sub, y + 6, { align: 'right' })
    y += h
    doc.setDrawColor(...LINE)
    doc.line(M, y, W - M, y)
  })

  // totales
  if (y > 240) {
    doc.addPage()
    y = 20
  }
  y += 8
  const row = (k, v, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 13 : 10)
    doc.setTextColor(...(bold ? INK : GRAY))
    doc.text(k, 130, y)
    doc.setTextColor(...(bold ? AMBER : INK))
    doc.text(v, col.sub, y, { align: 'right' })
    y += bold ? 8 : 6
  }
  row('Subtotal', formatPrice(data.subtotal))
  if (data.discount > 0) row(data.couponCode ? `Cupón ${data.couponCode}` : 'Descuento', `-${formatPrice(data.discount)}`)
  if (data.shipping != null) row(data.carrier ? `Envío (${data.carrier})` : 'Envío', data.shipping > 0 ? formatPrice(data.shipping) : 'Gratis')
  doc.setDrawColor(...LINE)
  doc.line(130, y - 2, W - M, y - 2)
  y += 3
  row('TOTAL', formatPrice(data.total + (data.shipping || 0)), true)

  // nota final
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  const note = isQuote
    ? 'Esta cotización es informativa: los precios y la disponibilidad se confirman al hacer el pedido.'
    : data.number
      ? 'Pedido recibido. Te escribiremos por WhatsApp para confirmar el pago y la entrega.'
      : 'Solicitud de pedido. Te escribiremos por WhatsApp para confirmarla.'
  doc.text(doc.splitTextToSize(note, W - M * 2), M, y)

  // pie
  doc.setDrawColor(...LINE)
  doc.line(M, 280, W - M, 280)
  doc.setFontSize(8)
  doc.text(
    [store.name, store.city && `${store.city}, El Salvador`, store.whatsapp && `WhatsApp +${String(store.whatsapp).replace(/\D/g, '')}`, store.email].filter(Boolean).join('  ·  '),
    W / 2,
    286,
    { align: 'center' }
  )

  return doc.output('blob')
}

export function pdfFilename(data) {
  const suffix = data.number ? (data.kind === 'cotizacion' ? `COT-${data.number}` : data.number) : 'borrador'
  return `${data.kind === 'cotizacion' ? 'Cotizacion' : 'Pedido'}-${suffix}.pdf`
}
