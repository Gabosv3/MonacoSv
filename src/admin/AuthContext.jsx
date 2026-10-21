import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchMyAccess, fetchMyCustomer } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = cargando, null = sin sesión
  // Roles y permisos del usuario. undefined = cargando. Si la migración de
  // roles todavía no se ejecutó en Supabase, se asume acceso completo (legacy).
  const [access, setAccess] = useState(undefined)
  // Ficha de cliente de quien inició sesión desde la tienda (null si no tiene)
  const [customer, setCustomer] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  const loadAccess = () =>
    fetchMyAccess()
      .then(setAccess)
      .catch(() => setAccess({ legacy: true, active: true, super: false, roles: [], permissions: [] }))

  useEffect(() => {
    if (session === undefined) return
    if (!userId) {
      setAccess(null)
      return
    }
    setAccess(undefined)
    loadAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, session === undefined])

  const loadCustomer = () =>
    userId
      ? fetchMyCustomer(userId).then(setCustomer).catch(() => setCustomer(null))
      : Promise.resolve(setCustomer(null))

  useEffect(() => {
    loadCustomer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const can = (permission) =>
    !!access && access.active !== false && (access.legacy || access.super || (access.permissions ?? []).includes(permission))

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = () => supabase.auth.signOut()

  // Manda el correo de recuperación; el enlace vuelve a la página indicada
  // (/admin/restablecer para el personal, /cuenta/restablecer para clientes).
  const requestPasswordReset = async (email, path = '/admin/restablecer') => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${path}`,
    })
    if (error) throw error
  }

  // Registro de clientes desde la tienda. Devuelve { needsConfirmation }.
  const signUpCustomer = async ({ email, password, fullName, next = '/cuenta' }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, customer: 'true' },
        emailRedirectTo: `${window.location.origin}${next}`,
      },
    })
    if (error) throw error
    // Supabase responde sin identidades cuando el correo ya tiene cuenta
    if (data.user && data.user.identities?.length === 0) throw new Error('Ya existe una cuenta con ese correo. Prueba iniciar sesión.')
    return { needsConfirmation: !data.session }
  }

  const signInWithGoogle = async (next = '/cuenta') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${next}` },
    })
    if (error) throw error
  }

  const updatePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading: session === undefined,
        access,
        accessLoading: !!session && access === undefined,
        can,
        reloadAccess: loadAccess,
        customer,
        reloadCustomer: loadCustomer,
        signUpCustomer,
        signInWithGoogle,
        login,
        logout,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
