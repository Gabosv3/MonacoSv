import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { readCache, writeCache } from './lib/cache'
import defaultLogo from './assets/logo.webp'

// Valores de respaldo: se usan hasta que carguen los ajustes de Supabase (tabla
// store_settings) o si esa tabla todavía no existe. Se editan desde el panel.
export const SETTING_DEFAULTS = {
  store_name: 'MonacoSV',
  tagline: 'Masculine fragrance studio',
  logo_url: '', // vacío = logo que viene con el sitio
  // intro de inicio (video + frases)
  intro_enabled: '1',
  intro_video_url: '', // vacío = video que viene con el sitio
  intro_poster_url: '', // imagen mientras carga el video / si no se puede reproducir
  intro_phrases: 'La noche empieza aquí.\nUna esencia lo cambia todo.\nLa presencia habla primero.\nLo demás sucede después.',
  intro_end_kicker: 'Club de Nuit Intense',
  intro_button: 'Ver tienda',
  whatsapp: '50300000000',
  city: 'Usulután',
  contact_email: '',
  topbar_text: 'Envíos gratis en compras a partir de $100 USD',
  free_shipping_min: '100',
  coverage: 'Entregas a los 14 departamentos',
  hero_kicker: 'Lote 2026 · 100% originales en El Salvador',
  hero_title: 'Poder.\nProyección.\nPresencia.',
  hero_text:
    'Especialistas en fragancias de bestia negra y elixires árabes con estela monstruosa. Prueba decants de 10ml con sello hermético o adquiere frascos sellados con batch code garantizado.',
  footer_about: 'Fragancias árabes originales, en decant y botella sellada.',
  instagram: '',
  facebook: '',
  tiktok: '',
  // fragancias elegidas para la portada (texto JSON con nombres)
  featured_men: '[]',
  featured_women: '[]',
}

const SettingsContext = createContext({
  cfg: SETTING_DEFAULTS,
  wa: () => `https://wa.me/${SETTING_DEFAULTS.whatsapp}`,
  reload: () => {},
})

// Ajustes públicos de la tienda para toda la página.
export function SettingsProvider({ children }) {
  const [cfg, setCfg] = useState(() => ({ ...SETTING_DEFAULTS, ...(readCache('settings') ?? {}) }))

  const reload = useCallback(() => {
    supabase
      .from('store_settings')
      .select('key, value')
      .then(({ data, error }) => {
        if (error || !data) return
        const loaded = Object.fromEntries(data.filter((r) => r.value !== '').map((r) => [r.key, r.value]))
        setCfg({ ...SETTING_DEFAULTS, ...loaded })
        writeCache('settings', loaded)
      })
  }, [])

  useEffect(reload, [reload])

  // título de la pestaña del navegador
  useEffect(() => {
    if (cfg.store_name) document.title = cfg.store_name
  }, [cfg.store_name])

  // el logo de Ajustes también es el ícono de la pestaña
  useEffect(() => {
    if (!cfg.logo_url) return
    document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((l) => {
      l.href = cfg.logo_url
      l.removeAttribute('type')
    })
  }, [cfg.logo_url])

  // enlace de WhatsApp (con mensaje opcional); los números de 8 dígitos son de El Salvador
  const wa = useCallback(
    (text) => {
      const digits = String(cfg.whatsapp).replace(/\D/g, '')
      const number = digits.length === 8 ? `503${digits}` : digits
      return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
    },
    [cfg.whatsapp]
  )

  const value = useMemo(() => ({ cfg, wa, reload }), [cfg, wa, reload])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)

// Logo de la tienda: el que se sube en Ajustes o, si no hay, el incluido en el sitio.
export function useLogo() {
  const { cfg } = useContext(SettingsContext)
  return cfg.logo_url || defaultLogo
}
