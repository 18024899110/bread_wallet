import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, saveToken } from '../api'

const card = { background: '#fff', borderRadius: 12, padding: '40px 36px',
  boxShadow: '0 2px 12px rgba(0,0,0,.08)', width: '100%', maxWidth: 480 } as React.CSSProperties
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
  marginBottom: 4, marginTop: 14 } as React.CSSProperties
const input = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
  borderRadius: 7, fontSize: 14, boxSizing: 'border-box' as const } as React.CSSProperties
const btn = { width: '100%', padding: '11px', marginTop: 20, background: '#1a56db',
  color: '#fff', border: 'none', borderRadius: 7, fontSize: 15, fontWeight: 600,
  cursor: 'pointer' } as React.CSSProperties

export default function Register() {
  const nav = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', given_name: '', family_name: '',
    role: 'user', admin_key: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const payload: Record<string, string> = {
        email: form.email, password: form.password,
        given_name: form.given_name, family_name: form.family_name,
        role: form.role,
      }
      if (form.role === 'admin') payload.admin_key = form.admin_key
      const res = await api.register(payload) as any
      saveToken(res.token)
      nav(form.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: 16 }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1a56db' }}>EUDI Issuer Portal</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Create your account</div>
      </div>
      <div style={card}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Register</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={label}>First Name *</label>
              <input style={input} value={form.given_name} onChange={set('given_name')} required placeholder="Alex" />
            </div>
            <div>
              <label style={label}>Last Name *</label>
              <input style={input} value={form.family_name} onChange={set('family_name')} required placeholder="Johnson" />
            </div>
          </div>
          <label style={label}>Email *</label>
          <input style={input} type="email" value={form.email} onChange={set('email')} required placeholder="alex@example.com" />
          <label style={label}>Password *</label>
          <input style={input} type="password" value={form.password} onChange={set('password')} required placeholder="Min. 8 characters" />

          <label style={label}>Account Role *</label>
          <select style={{ ...input, cursor: 'pointer' }} value={form.role} onChange={set('role')}>
            <option value="user">User — Apply for credentials</option>
            <option value="admin">Admin — Manage applications &amp; users</option>
          </select>

          {form.role === 'admin' && (
            <div style={{ marginTop: 14, padding: '14px 16px', background: '#fffbeb',
              border: '1px solid #fcd34d', borderRadius: 8 }}>
              <label style={{ ...label, marginTop: 0, color: '#92400e' }}>
                Admin Secret Key *
              </label>
              <input
                style={{ ...input, border: '1px solid #f59e0b' }}
                type="password"
                value={form.admin_key}
                onChange={set('admin_key')}
                required={form.role === 'admin'}
                placeholder="Enter the admin secret key"
              />
              <div style={{ fontSize: 12, color: '#92400e', marginTop: 6 }}>
                Administrator accounts require a valid secret key issued by the system administrator.
              </div>
            </div>
          )}

          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: '#fde8e8',
            color: '#9b1c1c', borderRadius: 7, fontSize: 13 }}>{error}</div>}
          <button style={btn} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
