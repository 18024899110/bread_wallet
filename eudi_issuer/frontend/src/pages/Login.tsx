import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, saveToken } from '../api'

const card = { background: '#fff', borderRadius: 12, padding: '40px 36px',
  boxShadow: '0 2px 12px rgba(0,0,0,.08)', width: '100%', maxWidth: 400 } as React.CSSProperties
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
  marginBottom: 4, marginTop: 14 } as React.CSSProperties
const input = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
  borderRadius: 7, fontSize: 14 } as React.CSSProperties
const btn = { width: '100%', padding: 11, marginTop: 20, background: '#1a56db',
  color: '#fff', border: 'none', borderRadius: 7, fontSize: 15, fontWeight: 600,
  cursor: 'pointer' } as React.CSSProperties

export default function Login() {
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(k: string) { return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.login(form) as any
      saveToken(res.token)
      nav(res.user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: 16 }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1a56db' }}>EUDI Issuer Portal</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Digital Identity Credential System</div>
      </div>
      <div style={card}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Sign In</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
        <form onSubmit={submit}>
          <label style={label}>Email</label>
          <input style={input} type="email" value={form.email} onChange={set('email')} required autoFocus />
          <label style={label}>Password</label>
          <input style={input} type="password" value={form.password} onChange={set('password')} required />
          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: '#fde8e8',
            color: '#9b1c1c', borderRadius: 7, fontSize: 13 }}>{error}</div>}
          <button style={btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
