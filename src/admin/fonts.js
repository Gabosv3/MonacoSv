// Tipografías del panel de administración y de las pantallas de acceso.
// La tienda no las usa, así que no se piden en index.html: se cargan aquí, una sola vez,
// cuando se abre alguna de esas pantallas.
const ID = 'dv-admin-fonts'

if (typeof document !== 'undefined' && !document.getElementById(ID)) {
  const link = document.createElement('link')
  link.id = ID
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Unbounded:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap'
  document.head.appendChild(link)
}
