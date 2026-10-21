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

// El menú de compartir solo se usa en celulares y tabletas. En computador (Windows/Mac)
// abre una lista de aplicaciones que no es lo que se busca: ahí se descarga el PDF
// y se abre directamente el chat de WhatsApp.
const isPhoneOrTablet = () => {
  const ua = navigator.userAgent
  return /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export async function deliverPdf({ blob, filename, text, chatUrl, win }) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (isPhoneOrTablet() && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      win?.close()
      await navigator.share({ files: [file], title: filename, text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
      // si el sistema no deja compartir, se usa la descarga
    }
  }
  downloadBlob(blob, filename)
  // `win` es la pestaña abierta dentro del clic (así el navegador no la bloquea)
  if (win) win.location.href = chatUrl
  else window.open(chatUrl, '_blank', 'noopener,noreferrer')
  return 'downloaded'
}
