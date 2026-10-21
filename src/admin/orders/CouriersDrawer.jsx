import { useState } from 'react'
import { INK } from '../../components/ui'
import { Badge, Btn, ConfirmDialog, Drawer, Field, IconBtn, Switch, TrashIcon, inputCls } from '../kit'
import { createCourier, deleteCourier, updateCourier } from '../api'

// Encomendistas: las personas que entregan los pedidos en mano.
export default function CouriersDrawer({ open, couriers, onClose, onChanged, onError }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)

  const add = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createCourier({ name: name.trim(), phone: phone.trim() })
      setName('')
      setPhone('')
      onChanged()
    } catch (err) {
      onError(/duplicate|unique/i.test(err.message) ? new Error('Ya existe un encomendista con ese nombre.') : err)
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (c) => {
    try {
      await updateCourier(c.id, { active: !c.active })
      onChanged()
    } catch (err) {
      onError(err)
    }
  }

  const remove = async () => {
    try {
      await deleteCourier(toDelete.id)
      setToDelete(null)
      onChanged()
    } catch (err) {
      setToDelete(null)
      onError(err)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Encomendistas" subtitle="Es la misma lista de Logística → Paqueteras. Se asignan desde cada pedido.">
      <form onSubmit={add} className="rounded-2xl border border-neutral-200 bg-white p-4 grid grid-cols-2 gap-3 mb-6">
        <Field label="Nombre" className="col-span-2 sm:col-span-1">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Mía Belén" className={inputCls} />
        </Field>
        <Field label="Teléfono" className="col-span-2 sm:col-span-1">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" className={inputCls} />
        </Field>
        <Btn type="submit" disabled={saving} className="col-span-2">{saving ? 'Agregando…' : '+ Agregar encomendista'}</Btn>
      </form>

      {couriers.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">Todavía no hay encomendistas.</p>
      ) : (
        <ul className="space-y-2">
          {couriers.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate" style={{ color: INK }}>{c.name}</p>
                <p className="text-xs text-slate-500">{c.phone || 'Sin teléfono'}</p>
              </div>
              {!c.active && <Badge>Inactivo</Badge>}
              <Switch checked={c.active} onChange={() => toggle(c)} label={`Activar a ${c.name}`} />
              <IconBtn title="Eliminar" danger onClick={() => setToDelete(c)}><TrashIcon /></IconBtn>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar encomendista?"
        message={toDelete ? `Se eliminará a ${toDelete.name}. Sus pedidos quedarán sin encomendista asignado.` : ''}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </Drawer>
  )
}
