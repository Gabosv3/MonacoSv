import { Icon, ICONS, INK, mono } from '../../components/ui'
import { formatPrice } from '../../catalog'
import { PencilIcon } from '../kit'
import { columnOf, fmtDateTime, fmtDay, itemsSummary, orderLabel, qtyOf, whatsappUrl } from './shared'

const PIN = 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'
const CAL = 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z'
const USER = 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0'

function Btn({ children, tone = 'neutral', ...props }) {
  const tones = {
    neutral: 'border-neutral-300 text-slate-700 hover:bg-neutral-50',
    green: 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
    ink: 'border-slate-900 text-white hover:opacity-90',
    red: 'border-transparent text-red-600 hover:bg-red-50',
  }
  return (
    <button
      {...props}
      className={`h-8 px-3 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${tones[tone]}`}
      style={tone === 'ink' ? { backgroundColor: INK } : undefined}
    >
      {children}
    </button>
  )
}

export default function OrderCard({ order, couriers, canUpdate, busy, onOpen, onStatus, onAssign, onInvoice }) {
  const col = columnOf(order)
  const wa = whatsappUrl(order.customer_phone)
  const pickup = (order.delivery_method ?? 'envio') === 'retiro'
  const courier = couriers.find((c) => c.id === order.courier_id)
  const place = [order.department, order.municipality].filter(Boolean).join(' / ')

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${col === 'cancelado' ? 'opacity-70' : ''} border-neutral-200`}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold leading-tight break-words" style={{ color: INK }}>{order.customer_name || 'Cliente sin nombre'}</h3>
          <p className="mt-0.5 text-[11px] text-slate-400" style={mono}>
            {orderLabel(order)} {orderLabel(order) && '·'} {fmtDateTime(order.created_at)}
          </p>
        </div>
        <button onClick={() => onOpen(order)} title="Ver o editar pedido" aria-label="Ver o editar pedido" className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-neutral-100">
          <PencilIcon />
        </button>
      </header>

      {order.customer_phone && (
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold" style={{ color: INK }}>
          {order.customer_phone}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" title="Escribir por WhatsApp" aria-label="Escribir por WhatsApp" className="text-emerald-600 hover:text-emerald-800">
              <Icon d={ICONS.chat} size={15} />
            </a>
          )}
        </p>
      )}

      <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
        <span className="mt-0.5 flex-shrink-0 text-slate-400"><Icon d={PIN} size={14} /></span>
        <span>
          {pickup ? <strong>Retiro en tienda</strong> : place || <span className="text-slate-400">Sin destino</span>}
          {!pickup && order.address && <span className="block text-xs text-slate-500">{order.address}</span>}
        </span>
      </p>
      {order.notes && <p className="mt-1.5 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs text-slate-600">{order.notes}</p>}

      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-600 min-w-0">
          {itemsSummary(order) || 'Sin productos'} <span className="text-slate-400">· Cant {qtyOf(order)}</span>
        </span>
        <strong className="flex-shrink-0" style={mono}>{formatPrice(order.total)}</strong>
      </div>

      {order.delivery_date && (
        <p className="mt-2.5 flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-800">
          <Icon d={CAL} size={14} />
          <span className="capitalize">{fmtDay(order.delivery_date)}</span>
          {order.delivery_window && <span className="font-normal">· {order.delivery_window}</span>}
        </p>
      )}

      {/* encomendista */}
      {col === 'sin-encomendista' && canUpdate ? (
        <label className="relative mt-2.5 block cursor-pointer">
          <span className="block rounded-xl border border-dashed border-violet-300 bg-violet-50 px-3 py-2.5 text-center text-xs font-semibold text-violet-700 hover:bg-violet-100">
            Falta encomendista — toca para asignarlo
          </span>
          <select
            aria-label="Asignar encomendista"
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && onAssign(order, e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="">Elige un encomendista…</option>
            {couriers.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      ) : col === 'sin-encomendista' ? (
        <p className="mt-2.5 rounded-xl border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-center text-xs font-semibold text-violet-700">Falta encomendista</p>
      ) : (
        courier && (
          <p className="mt-2.5 flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-pink-800">
            <Icon d={USER} size={14} /> {courier.name}
          </p>
        )
      )}

      {/* acciones */}
      {canUpdate && (
        <footer className="mt-3 flex flex-wrap items-center gap-2">
          {col === 'pendiente' && <Btn tone="ink" disabled={busy} onClick={() => onStatus(order, 'confirmada')}>Confirmar</Btn>}
          {(col === 'listo') && <Btn tone="ink" disabled={busy} onClick={() => onStatus(order, 'entregada')}>Entregado</Btn>}
          {col === 'cancelado' && <Btn disabled={busy} onClick={() => onStatus(order, 'pendiente')}>Reabrir</Btn>}
          {order.invoice_number ? (
            <span className="inline-flex items-center h-8 px-3 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold" style={mono}>{order.invoice_number}</span>
          ) : (
            col !== 'cancelado' && <Btn tone="green" disabled={busy} onClick={() => onInvoice(order)}>Facturar</Btn>
          )}
          {col !== 'cancelado' && col !== 'entregado' && <Btn tone="red" disabled={busy} onClick={() => onStatus(order, 'cancelada')}>Cancelar</Btn>}
        </footer>
      )}
    </article>
  )
}
