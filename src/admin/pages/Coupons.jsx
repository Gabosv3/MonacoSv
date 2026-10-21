import { useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '../api'
import { formatPrice } from '../../catalog'
import { useAuth } from '../AuthContext'
import { INK, AMBER, mono } from '../../components/ui'
import {
  Alert, Badge, Btn, ConfirmDialog, DataTable, Drawer, Field, IconBtn, PencilIcon, Section, Switch, TrashIcon, inputCls,
} from '../kit'

const EMPTY = { code: '', type: 'percent', value: '', max_uses: '', min_purchase: '', expires_at: '', active: true }

const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const isExpired = (c) => c.expires_at && new Date(c.expires_at) < new Date()

export default function Coupons() {
  const { can } = useAuth()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState('')

  const load = () => {
    setLoading(true)
    listCoupons().then(setCoupons).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  // llega desde «+ Nuevo» del menú superior
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('nuevo')) {
      setParams({}, { replace: true })
      setEditingId(null)
      setForm(EMPTY)
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY)
    setOpen(true)
  }

  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      max_uses: c.max_uses ?? '',
      min_purchase: c.min_purchase || '',
      expires_at: dateInput(c.expires_at),
      active: c.active,
    })
    setOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value) || 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      min_purchase: Number(form.min_purchase) || 0,
      expires_at: form.expires_at || null,
    }
    try {
      if (editingId) await updateCoupon(editingId, payload)
      else await createCoupon(payload)
      setOpen(false)
      load()
    } catch (err) {
      setError(/duplicate|unique/i.test(err.message) ? 'Ya existe un cupón con ese código.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c) => {
    setCoupons((list) => list.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)))
    try {
      await updateCoupon(c.id, { active: !c.active })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteCoupon(toDelete.id)
      setToDelete(null)
      load()
    } catch (err) {
      setError(err.message)
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* sin portapapeles */
    }
  }

  const columns = [
    {
      key: 'code',
      header: 'Código',
      value: (c) => c.code,
      render: (c) => (
        <button onClick={(e) => { e.stopPropagation(); copy(c.code) }} title="Copiar código" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-neutral-300 hover:border-slate-900 transition-colors">
          <strong className="tracking-wider" style={{ ...mono, color: INK }}>{c.code}</strong>
          <span className="text-[10px] text-slate-400">{copied === c.code ? '✓ copiado' : 'copiar'}</span>
        </button>
      ),
    },
    {
      key: 'value',
      header: 'Descuento',
      value: (c) => Number(c.value),
      render: (c) => <Badge tone="amber">{c.type === 'percent' ? `${Number(c.value)}% OFF` : `${formatPrice(c.value)} OFF`}</Badge>,
    },
    {
      key: 'used_count',
      header: 'Usos',
      hide: 'sm',
      value: (c) => c.used_count,
      render: (c) => (
        <span className="block min-w-[90px]">
          <span className="text-sm"><strong style={{ color: INK }}>{c.used_count}</strong>{c.max_uses ? ` / ${c.max_uses}` : ' · sin límite'}</span>
          {c.max_uses ? (
            <span className="mt-1.5 block h-1.5 rounded-full bg-neutral-100">
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%`, backgroundColor: c.used_count >= c.max_uses ? '#dc2626' : AMBER }} />
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'min_purchase', header: 'Compra mín.', hide: 'lg', value: (c) => Number(c.min_purchase), render: (c) => (Number(c.min_purchase) ? <span style={mono}>{formatPrice(c.min_purchase)}</span> : <span className="text-slate-400">—</span>) },
    {
      key: 'expires_at',
      header: 'Vence',
      hide: 'md',
      value: (c) => c.expires_at ?? '9999',
      render: (c) =>
        c.expires_at ? (
          <span className="inline-flex items-center gap-2 text-slate-600">
            {new Date(c.expires_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
            {isExpired(c) && <Badge tone="red">Vencido</Badge>}
          </span>
        ) : (
          <span className="text-slate-400">Sin vencimiento</span>
        ),
    },
    { key: 'active', header: 'Activo', value: (c) => (c.active ? 'Activo' : 'Inactivo'), stop: true, render: (c) => <Switch checked={c.active} onChange={() => can('coupons.edit') && toggleActive(c)} label={`Activar ${c.code}`} /> },
    {
      key: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      stop: true,
      render: (c) => (
        <span className="inline-flex">
          {can('coupons.edit') && <IconBtn title="Editar" onClick={() => openEdit(c)}><PencilIcon /></IconBtn>}
          {can('coupons.delete') && <IconBtn title="Eliminar" danger onClick={() => setToDelete(c)}><TrashIcon /></IconBtn>}
        </span>
      ),
    },
  ]

  return (
    <div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={coupons}
        loading={loading}
        initialSort={{ key: 'code', dir: 'asc' }}
        searchPlaceholder="Buscar cupón…"
        exportName="cupones"
        empty="Todavía no hay cupones. Crea el primero."
        toolbar={can('coupons.create') && <Btn onClick={openCreate} className="sm:ml-auto h-10">+ Nuevo cupón</Btn>}
      />

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Editar cupón' : 'Nuevo cupón'}
        subtitle="Los clientes lo escriben en la bolsa para obtener el descuento."
        footer={
          <>
            <Btn kind="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Btn>
            <Btn type="submit" form="coupon-form" disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear cupón'}</Btn>
          </>
        }
      >
        <form id="coupon-form" onSubmit={handleSubmit}>
          <Section title="Cupón">
            <Field label="Código" className="col-span-2" hint="Se guarda en mayúsculas, sin distinguir al canjearlo.">
              <input required value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="BIENVENIDO10" className={`${inputCls} tracking-wider font-semibold`} style={mono} />
            </Field>
            <Field label="Tipo">
              <select value={form.type} onChange={(e) => set({ type: e.target.value })} className={inputCls}>
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </Field>
            <Field label={form.type === 'percent' ? 'Porcentaje' : 'Monto (USD)'}>
              <input required type="number" step="0.01" min="0" max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={(e) => set({ value: e.target.value })} className={inputCls} />
            </Field>
          </Section>

          <Section title="Condiciones">
            <Field label="Usos máximos" hint="Vacío = sin límite.">
              <input type="number" min="1" value={form.max_uses} onChange={(e) => set({ max_uses: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Compra mínima (USD)">
              <input type="number" step="0.01" min="0" value={form.min_purchase} onChange={(e) => set({ min_purchase: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Fecha de vencimiento" className="col-span-2" hint="Vacío = no vence.">
              <input type="date" value={form.expires_at} onChange={(e) => set({ expires_at: e.target.value })} className={inputCls} />
            </Field>
            <div className="col-span-2 flex items-center justify-between gap-4 pt-1">
              <p className="text-sm font-semibold" style={{ color: INK }}>Activo</p>
              <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Activo" />
            </div>
          </Section>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar cupón?"
        message={toDelete ? `Se eliminará el cupón ${toDelete.code}. Si solo quieres pausarlo, desactívalo.` : ''}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
