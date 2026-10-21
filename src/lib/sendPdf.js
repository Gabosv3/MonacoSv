// Entrega un PDF por WhatsApp.
//  · Celular: abre el menú de compartir con el PDF adjunto; el cliente elige el
//    chat de la tienda en WhatsApp.
//  · Computador: WhatsApp Web no permite adjuntar desde un enlace, así que se
//    descarga el PDF y se abre el chat de la tienda para que lo adjunte.
// Devuelve 'shared' | 'cancelled' | 'downloaded'.

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export async function deliverPdf({ blob, filename, text, chatUrl }) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
      // si el sistema no deja compartir, se usa la descarga
    }
  }
  downloadBlob(blob, filename)
  window.open(chatUrl, '_blank', 'noopener,noreferrer')
  return 'downloaded'
}
