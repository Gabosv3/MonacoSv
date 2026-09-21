import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/admin" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <p className="text-center text-lg font-extrabold tracking-tight mb-1">MonacoSV</p>
        <p className="text-center text-xs text-neutral-400 uppercase tracking-widest mb-8">
          Panel administrativo
        </p>

        <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-1">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-white/40"
        />

        <label className="block text-xs uppercase tracking-widest text-neutral-400 mb-1">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-white/40"
        />

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-neutral-900 font-semibold text-sm uppercase tracking-widest py-2.5 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
