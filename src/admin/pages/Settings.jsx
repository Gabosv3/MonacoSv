import { useEffect, useState } from 'react'
import { listSettings, saveSettings, uploadProductImage } from '../api'
import { useAuth } from '../AuthContext'
import { SETTING_DEFAULTS, useSettings, useLogo } from '../../settings'
import { INK, AMBER, mono } from '../../components/ui'
import { Alert, Btn, Field, inputCls, textareaCls } from '../kit'

// Qué se edita aquí y cómo se muestra cada campo.
const GROUPS = [
  {
    title: 'Tienda',
    text: 'Datos básicos que aparecen en toda la página.',
    fields: [
      { key: 'store_name', label: 'Nombre de la tienda' },
      { key: 'logo_url', label: 'Logo', type: 'image', hint: 'Se usa en el encabezado, el pie, el panel, el PDF y como ícono de la pestaña. Mejor cuadrado y con fondo transparente (PNG o WebP).' },
      { key: 'tagline', label: 'Eslogan', hint: 'Frase corta bajo el nombre en el encabezado y en el PDF.' },
      { key: 'whatsapp', label: 'WhatsApp de pedidos', hint: 'Con código de país y sin +. Ej. 50370001111. Es el número al que llegan los pedidos y cotizaciones.' },
      { key: 'city', label: 'Ciudad base', hint: 'Desde dónde despachas. Ej. Usulután.' },
      { key: 'contact_email', label: 'Correo de contacto', type: 'email' },
    ],
  },
  {
    title: 'Mensajes y envío',
    text: 'Barra superior, cobertura y envío gratis.',
    fields: [
      { key: 'topbar_text', label: 'Mensaje de la barra superior' },
      { key: 'coverage', label: 'Cobertura de entregas', hint: 'Ej. Entregas a los 14 departamentos.' },
      { key: 'free_shipping_min', label: 'Compra mínima para envío gratis (USD)', type: 'number', hint: 'El carrito muestra cuánto falta para llegar. Pon 0 para ocultar la barra.' },
    ],
  },
  {
    title: 'Portada',
    text: 'Los textos grandes de la página de inicio.',
    fields: [
      { key: 'hero_kicker', label: 'Etiqueta sobre el título' },
      { key: 'hero_title', label: 'Título', type: 'textarea', rows: 3, hint: 'Una frase por línea. La última se muestra con el degradado ámbar.' },
      { key: 'hero_text', label: 'Descripción', type: 'textarea', rows: 4 },
      { key: 'footer_about', label: 'Texto del pie de página', type: 'textarea', rows: 2 },
    ],
  },
  {
    title: 'Redes sociales',
    text: 'Pega el enlace completo. Si lo dejas vacío, no se muestra.',
    fields: [
      { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
      { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
      { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
    ],
  },
]

const friendly = (e) =>
  /schema cache|does not exist/i.test(e.message)
    ? 'Falta crear la tabla de ajustes. Ejecuta supabase/accounts_and_settings.sql en el SQL Editor de Supabase y recarga.'
    : e.message

// Subir el logo desde el equipo: se guarda en Storage y su dirección queda en los ajustes.
function LogoField({ value, onChange, onError }) {
  const { cfg } = useSettings()
  const logo = useLogo()
  const [busy, setBusy] = useState(false)
  const shown = value || logo
  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    onError('')
    try {
      onChange(await uploadProductImage(file, 'branding'))
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-2xl border border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden">
        <img src={shown} alt={cfg.store_name} className="max-w-full max-h-full object-contain" />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className={`inline-flex items-center h-10 px-4 rounded-xl border border-neutral-300 text-sm font-medium text-slate-700 hover:bg-neutral-50 cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          {busy ? 'Subiendo…' : 'Subir logo'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} className="h-10 px-4 rounded-xl text-sm text-slate-500 hover:text-slate-800">
            Usar el logo original
          </button>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const { can } = useAuth()
  const { reload } = useSettings()
  const canEdit = can('settings.edit')
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(SETTING_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    listSettings()
      .then((rows) => {
        const data = { ...SETTING_DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }
        setForm(data)
        setSaved(data)
      })
      .catch((e) => {
        setError(friendly(e))
        setForm(SETTING_DEFAULTS)
      })
  }, [])

  if (!form) return <div className="h-64 rounded-2xl bg-white border border-neutral-200 animate-pulse" />

  const changed = Object.keys(form).filter((k) => form[k] !== saved[k])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await saveSettings(Object.fromEntries(changed.map((k) => [k, String(form[k]).trim()])))
      setSaved(form)
      reload()
      setNotice('Ajustes guardados. La página ya muestra los cambios.')
    } catch (err) {
      setError(friendly(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl">
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert kind="ok" onClose={() => setNotice('')}>{notice}</Alert>}

      <fieldset disabled={!canEdit} className="space-y-6">
        {GROUPS.map((g) => (
          <section key={g.title} className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...mono, color: AMBER }}>{g.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{g.text}</p>
            <div className="mt-5 grid gap-4">
              {g.fields.map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  {f.type === 'image' ? (
                    <LogoField value={form[f.key]} onChange={(v) => setForm({ ...form, [f.key]: v })} onError={setError} />
                  ) : f.type === 'textarea' ? (
                    <textarea rows={f.rows} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={textareaCls} />
                  ) : (
                    <input
                      type={f.type ?? 'text'}
                      min={f.type === 'number' ? 0 : undefined}
                      value={form[f.key]}
                      placeholder={f.placeholder}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className={inputCls}
                    />
                  )}
                </Field>
              ))}
            </div>
          </section>
        ))}
      </fieldset>

      {canEdit && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-5 py-3 shadow-lg">
          <p className="text-sm text-slate-500">{changed.length ? `${changed.length} cambio${changed.length === 1 ? '' : 's'} sin guardar` : 'Sin cambios'}</p>
          <div className="flex gap-2">
            <Btn kind="secondary" type="button" disabled={!changed.length || saving} onClick={() => setForm(saved)}>Descartar</Btn>
            <Btn type="submit" disabled={!changed.length || saving} style={{ backgroundColor: INK }}>{saving ? 'Guardando…' : 'Guardar ajustes'}</Btn>
          </div>
        </div>
      )}
    </form>
  )
}
