import { Link } from 'react-router-dom'
import { ProductCard } from './commerce'


// «Para ella»: galería luminosa de tarjetas, distinta de la escena oscura de «Para él»
export function WomenGallery({ fragrances, priceOf, onAdd }) {
  return (
    <section className="px-5 sm:px-10 py-24 sm:py-32" style={{ background: '#F7F6F2', color: '#141414' }} aria-labelledby="dv-para-ella">
      <header className="flex flex-wrap items-end justify-between gap-6 mb-10 sm:mb-14">
        <div>
          <p className="dv-label text-[#57534E]">La selección</p>
          <h2 id="dv-para-ella" className="dv-serif mt-4 text-[clamp(3rem,7vw,6rem)] leading-[0.9]">Para ella</h2>
        </div>
        <Link to="/fragancias?gen=mujer" className="dv-link text-[14px] font-semibold">Ver toda la línea →</Link>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {fragrances.slice(0, 4).map((f) => <ProductCard key={f.id} f={f} priceOf={priceOf} onAdd={onAdd} />)}
      </div>
    </section>
  )
}
