import { useNavigate } from 'react-router-dom'
import { clearToken } from '../api'

const s = {
  header: { background: '#1a56db', padding: '0 24px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', height: 56 } as React.CSSProperties,
  logo: { color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' } as React.CSSProperties,
  nav: { display: 'flex', gap: 8, alignItems: 'center' } as React.CSSProperties,
  navLink: { color: 'rgba(255,255,255,.85)', fontSize: 14, padding: '6px 12px',
    borderRadius: 6, cursor: 'pointer', border: 'none', background: 'none',
    textDecoration: 'none', display: 'inline-block' } as React.CSSProperties,
  logoutBtn: { color: '#fff', fontSize: 13, padding: '6px 14px', borderRadius: 6,
    cursor: 'pointer', border: '1px solid rgba(255,255,255,.4)', background: 'transparent' } as React.CSSProperties,
  main: { maxWidth: 900, margin: '0 auto', padding: '32px 16px' } as React.CSSProperties,
}

interface LayoutProps {
  children: React.ReactNode
  role?: 'user' | 'admin'
  userName?: string
}

export default function Layout({ children, role = 'user', userName }: LayoutProps) {
  const nav = useNavigate()

  function logout() {
    clearToken()
    nav('/login')
  }

  return (
    <>
      <header style={s.header}>
        <span style={s.logo}>EUDI Issuer Portal</span>
        <nav style={s.nav}>
          {role === 'user' && (
            <>
              <a href="/dashboard" style={s.navLink}>My Applications</a>
              <a href="/apply" style={s.navLink}>New Application</a>
            </>
          )}
          {role === 'admin' && (
            <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>Admin Panel</span>
          )}
          {userName && (
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginLeft: 8 }}>{userName}</span>
          )}
          <button style={s.logoutBtn} onClick={logout}>Logout</button>
        </nav>
      </header>
      <main style={s.main}>{children}</main>
    </>
  )
}
