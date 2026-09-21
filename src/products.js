export const products = [
  {
    id: 1,
    name: 'Ámbar Nocturno',
    category: 'Amaderado',
    price: 185000,
    volume: '50 ml',
    description: 'Notas de sándalo, vainilla y ámbar. Ideal para la noche.',
    color: '#7c4a2d',
  },
  {
    id: 2,
    name: 'Brisa Cítrica',
    category: 'Cítrico',
    price: 145000,
    volume: '50 ml',
    description: 'Bergamota, limón y toques de menta. Fresca y ligera.',
    color: '#d9a441',
  },
  {
    id: 3,
    name: 'Flor Silvestre',
    category: 'Floral',
    price: 165000,
    volume: '50 ml',
    description: 'Jazmín, peonía y un fondo suave de almizcle.',
    color: '#e88fb0',
  },
  {
    id: 4,
    name: 'Cuero & Especias',
    category: 'Oriental',
    price: 210000,
    volume: '100 ml',
    description: 'Cuero, canela y pimienta negra. Intensa y envolvente.',
    color: '#5a3825',
  },
  {
    id: 5,
    name: 'Agua Marina',
    category: 'Acuático',
    price: 155000,
    volume: '50 ml',
    description: 'Notas marinas, sal y un toque de pepino.',
    color: '#3f7ea6',
  },
  {
    id: 6,
    name: 'Vainilla Dulce',
    category: 'Gourmand',
    price: 175000,
    volume: '75 ml',
    description: 'Vainilla, caramelo y haba tonka. Cálida y reconfortante.',
    color: '#c9974c',
  },
]

export function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}
