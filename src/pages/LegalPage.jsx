import { Link } from 'react-router-dom'
import { formatPrice } from '../catalog'
import { useSettings } from '../settings'
import { display } from '../components/dv-ui'

// Política de privacidad y términos de la tienda. El texto describe lo que la tienda hace de
// verdad (qué datos pide, con quién los comparte, qué guarda el navegador). Es una base clara,
// no asesoría legal: conviene que la revise quien lleve lo legal del negocio y la complete
// con su política de cambios y devoluciones antes de la verificación de Google.
const UPDATED = '16 de noviembre de 2026'

function privacy({ store, city, contact }) {
  return {
    title: 'Política de privacidad',
    intro: `En ${store} cuidamos tus datos. Aquí explicamos qué información recogemos cuando usas la tienda, para qué la usamos y qué puedes hacer con ella.`,
    sections: [
      {
        title: 'Quiénes somos',
        body: [`${store} es una tienda de fragancias con sede en ${city}, El Salvador. ${contact}`],
      },
      {
        title: 'Qué datos recogemos',
        list: [
          'Tu cuenta: nombre y correo. La contraseña la guarda de forma cifrada nuestro proveedor de acceso; nosotros no podemos verla. Si ingresas con Google, recibimos tu nombre y tu correo.',
          'Tus pedidos y cotizaciones, también si compras sin cuenta: nombre, teléfono, tipo de entrega, departamento, municipio, dirección, notas, productos, montos y estado del pedido.',
          'Tus valoraciones: la calificación y el comentario que escribas. Se publican con tu nombre de pila y la inicial de tu apellido.',
        ],
      },
      {
        title: 'Para qué los usamos',
        list: [
          'Registrar y entregar tus pedidos, y coordinar contigo el pago y la entrega por WhatsApp.',
          'Mostrarte tu historial y guardar tus datos para tu próxima compra, si tienes cuenta.',
          'Marcar como «Compra verificada» las valoraciones de quienes sí compraron la fragancia.',
          'Atender tus consultas y resolver cualquier problema con tu pedido.',
        ],
        after: 'No vendemos tus datos ni los usamos para publicidad de terceros.',
      },
      {
        title: 'Con quién los compartimos',
        list: [
          'Paqueterías o repartidores: tu nombre, teléfono y dirección, solo para entregarte el pedido.',
          'Proveedores que hacen funcionar la tienda: Supabase (base de datos y acceso de cuentas), Google (si eliges ingresar con Google, y las tipografías de la página) y WhatsApp (cuando tú nos envías un pedido o una consulta por ahí).',
          'Una autoridad competente, si la ley nos lo exige.',
        ],
      },
      {
        title: 'Cuánto tiempo los conservamos',
        body: ['Mientras tengas una cuenta o los necesitemos para atender tus pedidos y llevar los registros de la tienda.'],
      },
      {
        title: 'Tus derechos',
        body: [
          'Puedes pedirnos ver, corregir o eliminar tus datos. Con cuenta, puedes ver y editar tus datos en «Mi cuenta» y retirar tus valoraciones. Para eliminar tu cuenta o tus datos, escríbenos y lo atendemos.',
        ],
      },
      {
        title: 'Lo que guarda tu navegador',
        body: [
          'No usamos herramientas de analítica ni de publicidad. Sí usamos el almacenamiento de tu navegador para recordar tu carrito, tu sesión, una copia del catálogo para que cargue más rápido y, mientras llenas el pago, un borrador de tus datos de entrega que se borra al terminar el pedido o al cerrar la pestaña.',
        ],
      },
      {
        title: 'Seguridad',
        body: [
          'Los datos viajan cifrados y los pedidos solo los ve nuestro equipo. Ningún sistema es infalible, pero cuidamos el acceso a tu información.',
        ],
      },
      {
        title: 'Cambios a esta política',
        body: ['Si la cambiamos, actualizamos la fecha de esta página.'],
      },
    ],
  }
}

function terms({ store, city, contact, coverage, freeMin }) {
  return {
    title: 'Términos de uso',
    intro: `Estas condiciones explican cómo funciona la compra en ${store}. Al usar la tienda las aceptas.`,
    sections: [
      {
        title: 'Productos y precios',
        body: [
          'Vendemos fragancias originales en decant de 10 ml y en botella sellada. Los precios están en dólares (USD) y las fotografías son referenciales. Los precios y descuentos pueden cambiar; vale el precio que se calcula al registrar tu pedido.',
        ],
      },
      {
        title: 'Cómo funciona un pedido',
        body: [
          'Al confirmar tu pedido lo registramos como pendiente y te escribimos por WhatsApp para confirmar la disponibilidad, el pago y la entrega. El pedido queda confirmado cuando lo acordamos contigo. En la tienda no se hace ningún cobro en línea.',
          'Para pedidos sin cuenta hay límites de cantidad por producto y por pedido; si necesitas más, lo coordinamos por WhatsApp.',
        ],
      },
      {
        title: 'Disponibilidad',
        body: ['Las existencias son limitadas. Si algún producto ya no está disponible, te avisamos y te proponemos una alternativa.'],
      },
      {
        title: 'Envíos y entrega',
        list: [
          `${coverage}, desde ${city}.`,
          'El costo del envío depende de la paquetera que elijas en el pago.',
          ...(freeMin > 0 ? [`El envío es gratis en compras desde ${formatPrice(freeMin)}.`] : []),
          `También puedes retirar tu pedido en ${city}.`,
          'Los plazos de entrega son orientativos y dependen de la paquetera.',
        ],
      },
      {
        title: 'Pago',
        body: ['El pago se coordina contigo por WhatsApp. Preparamos tu pedido una vez acordado.'],
      },
      {
        title: 'Si hay un problema con tu pedido',
        body: ['Si tu pedido llega dañado, incompleto o distinto a lo que pediste, escríbenos por WhatsApp lo antes posible, con fotos si puedes, y lo resolvemos contigo.'],
      },
      {
        title: 'Tu cuenta',
        body: [
          'Debes dar datos verdaderos y cuidar tu contraseña. Podemos suspender cuentas que se usen de forma abusiva o fraudulenta.',
        ],
      },
      {
        title: 'Valoraciones',
        body: [
          'Cualquier persona con cuenta puede valorar una fragancia. Las valoraciones de quienes compraron esa fragancia llevan la etiqueta «Compra verificada». Deben ser honestas y sin insultos ni datos personales; podemos ocultar las que incumplan esto.',
        ],
      },
      {
        title: 'Contenido del sitio',
        body: [`Los textos, fotografías y la marca de ${store} son de la tienda. No los copies ni los uses con fines comerciales sin permiso.`],
      },
      {
        title: 'Cambios y contacto',
        body: [`Podemos actualizar estas condiciones; la versión vigente es la publicada aquí. ${contact}`],
      },
    ],
  }
}

export default function LegalPage({ kind }) {
  const { cfg, wa } = useSettings()
  const store = cfg.store_name || 'DUUMVIR'
  const contact = cfg.contact_email ? `Escríbenos a ${cfg.contact_email} o por WhatsApp.` : 'Escríbenos por WhatsApp.'
  const ctx = { store, city: cfg.city, contact, coverage: cfg.coverage, freeMin: Number(cfg.free_shipping_min) || 0 }
  const doc = kind === 'terminos' ? terms(ctx) : privacy(ctx)
  const other = kind === 'terminos' ? ['/privacidad', 'Política de privacidad'] : ['/terminos', 'Términos de uso']

  return (
    <main className="max-w-[760px] mx-auto px-5 sm:px-8 pt-8 lg:pt-12 pb-24">
      <nav className="text-[13px] text-[#78716C]" aria-label="Ruta">
        <Link to="/" className="hover:text-[#141414]">Inicio</Link> <span className="mx-2">/</span>
        <span className="text-[#141414]">{doc.title}</span>
      </nav>

      <h1 className="mt-6 text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.04] text-balance text-[#141414]" style={display}>{doc.title}</h1>
      <p className="mt-3 text-[13px] text-[#78716C]">Última actualización: {UPDATED}</p>
      <p className="mt-6 text-[17px] leading-[1.75] text-[#57534E]">{doc.intro}</p>

      {doc.sections.map((s) => (
        <section key={s.title} className="mt-10">
          <h2 className="text-[1.5rem] leading-tight text-[#141414]" style={display}>{s.title}</h2>
          {s.body?.map((p) => <p key={p} className="mt-3 text-[16px] leading-[1.75] text-[#57534E]">{p}</p>)}
          {s.list && (
            <ul className="mt-3 space-y-2 text-[16px] leading-[1.7] text-[#57534E] list-disc pl-5 marker:text-[#141414]/40">
              {s.list.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {s.after && <p className="mt-3 text-[16px] leading-[1.75] text-[#141414] font-medium">{s.after}</p>}
        </section>
      ))}

      <div className="mt-14 pt-8 border-t border-[#141414]/10 flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
        <Link to={other[0]} className="font-semibold underline underline-offset-4 hover:text-[#57534E]">{other[1]}</Link>
        <a href={wa()} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4 hover:text-[#57534E]">Escribirnos por WhatsApp</a>
      </div>
    </main>
  )
}
