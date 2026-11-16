import { supabaseAnonKey, supabaseUrl } from './supabase'

// ¿Está activado Google en el proyecto de Supabase? Si no lo está, al pulsar el botón el
// navegador termina en una página de error en JSON ("provider is not enabled"). Supabase
// publica qué proveedores están activos en /auth/v1/settings; se pregunta una sola vez por visita.
// Si no se puede comprobar (sin red, respuesta rara), se asume que sí: mejor intentar que esconder el botón.
let googleCheck = null

export function googleEnabled() {
  googleCheck ??= fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } })
    .then((res) => (res.ok ? res.json() : null))
    .then((settings) => settings?.external?.google !== false)
    .catch(() => true)
  return googleCheck
}

// Mensaje claro para lo que Supabase deja en la dirección al volver de Google con un error
// (por ejemplo #error=access_denied&error_description=...). Devuelve null si no hay error.
export function authReturnError(location = window.location) {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(location.search)
  const code = params.get('error_code') || query.get('error_code') || params.get('error') || query.get('error')
  if (!code) return null
  if (code === 'access_denied') return 'Cancelaste el ingreso con Google. Puedes intentarlo de nuevo o usar tu correo.'
  if (code === 'otp_expired') return 'El enlace venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».'
  return 'No pudimos completar el ingreso con Google. Inténtalo de nuevo o usa tu correo.'
}

// Quita de la dirección los parámetros del error, para que no reaparezca al recargar
export function clearAuthReturnError() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const keys = ['error', 'error_code', 'error_description']
  keys.forEach((k) => {
    params.delete(k)
    query.delete(k)
  })
  const search = query.toString()
  const hash = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`)
}
