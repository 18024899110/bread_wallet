import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../api'

type User = {
  id: string; email: string; role: string
  given_name: string; family_name: string
  created_at: string; application_count: number
}

type App = {
  id: string; credential_type: string; status: string
  given_name: string; family_name: string
  created_at: string
}

const credLabels: Record<string, string> = {
  NationalID: 'National ID', mDL: 'mDL',
  AddressCredential: 'Address', ProofOfAge: 'Age Proof',
  HealthInsuranceCard: 'Health Insurance', StudentID: 'Student ID',
  VehicleRegistration: 'Vehicle Reg.', ProfessionalLicense: 'Prof. License',
  PassportCredential: 'Passport', SocialSecurityCredential: 'Social Security',
  BankAccountCredential: 'Bank Account', EmploymentCredential: 'Employment',
  VaccinationCredential: 'Vaccination', DisabilityCredential: 'Disability',
}

const statusColor: Record<string, string> = {
  pending: '#d97706', approved: '#057a55', rejected: '#dc2626',
}

const btn = (color: string, text = '#fff') => ({
  padding: '6px 14px', background: color, color: text,
  border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
} as React.CSSProperties)

const input = {
  padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: 7, fontSize: 14, width: '100%', boxSizing: 'border-box' as const,
} as React.CSSProperties

export default function AdminUsers() {
  const nav = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userApps, setUserApps] = useState<App[] | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ given_name: '', family_name: '', email: '', role: 'user' })
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadUsers = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const data = await api.getAdminUsers(q) as User[]
      setUsers(data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  useEffect(() => {
    const t = setTimeout(() => loadUsers(search), 300)
    return () => clearTimeout(t)
  }, [search, loadUsers])

  async function selectUser(u: User) {
    setSelectedUser(u)
    setEditMode(false)
    setMsg('')
    setEditForm({ given_name: u.given_name, family_name: u.family_name, email: u.email, role: u.role })
    const apps = await api.getAdminUserApplications(u.id) as App[]
    setUserApps(apps)
  }

  async function saveEdit() {
    if (!selectedUser) return
    try {
      await api.updateAdminUser(selectedUser.id, editForm)
      setMsg('User updated successfully.')
      setMsgOk(true)
      setEditMode(false)
      const updated = { ...selectedUser, ...editForm }
      setSelectedUser(updated)
      loadUsers(search)
    } catch (err: any) {
      setMsg(err.message)
      setMsgOk(false)
    }
  }

  async function deleteUser(id: string) {
    try {
      await api.deleteAdminUser(id)
      setMsg('User deleted.')
      setMsgOk(true)
      setSelectedUser(null)
      setUserApps(null)
      setConfirmDelete(null)
      loadUsers(search)
    } catch (err: any) {
      setMsg(err.message)
      setMsgOk(false)
      setConfirmDelete(null)
    }
  }

  return (
    <Layout role="admin">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>User Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>View, edit, and delete registered users</p>
        </div>
        <button onClick={() => nav('/admin')} style={btn('#f3f4f6', '#374151')}>← Back to Applications</button>
      </div>

      <div style={{ marginBottom: 16, maxWidth: 400 }}>
        <input
          style={input}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 1.4fr' : '1fr', gap: 16 }}>

        <div>
          {loading && <div style={{ padding: 16, color: '#6b7280', fontSize: 13 }}>Loading…</div>}
          {!loading && users.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 24, textAlign: 'center',
              color: '#6b7280', fontSize: 14 }}>No users found.</div>
          )}
          {users.map(u => (
            <div key={u.id}
              onClick={() => selectUser(u)}
              style={{
                background: selectedUser?.id === u.id ? '#eff6ff' : '#fff',
                border: selectedUser?.id === u.id ? '1.5px solid #1a56db' : '1px solid #e5e7eb',
                borderRadius: 10, padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.given_name} {u.family_name}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{
                    background: u.role === 'admin' ? '#fef3c7' : '#ede9fe',
                    color: u.role === 'admin' ? '#92400e' : '#5b21b6',
                    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  }}>{u.role.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{u.application_count} app{u.application_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Joined: {new Date(u.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {selectedUser && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,.06)', alignSelf: 'start' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {selectedUser.given_name} {selectedUser.family_name}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditMode(!editMode); setMsg('') }}
                  style={editMode ? btn('#f3f4f6', '#374151') : btn('#e5e7eb', '#374151')}>
                  {editMode ? 'Cancel' : '✏ Edit'}
                </button>
                <button onClick={() => setConfirmDelete(selectedUser.id)}
                  style={btn('#dc2626')}>🗑 Delete</button>
              </div>
            </div>

            {msg && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 7, fontSize: 13,
                background: msgOk ? '#def7ec' : '#fde8e8',
                color: msgOk ? '#03543f' : '#9b1c1c' }}>{msg}</div>
            )}

            {confirmDelete && (
              <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff5f5',
                border: '1px solid #fca5a5', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#dc2626', marginBottom: 8 }}>
                  Confirm deletion?
                </div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
                  This will permanently delete the user, all their applications, and issued credentials.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => deleteUser(confirmDelete)} style={btn('#dc2626')}>Yes, Delete</button>
                  <button onClick={() => setConfirmDelete(null)} style={btn('#f3f4f6', '#374151')}>Cancel</button>
                </div>
              </div>
            )}

            {!editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {[
                  ['Email', selectedUser.email],
                  ['Role', selectedUser.role],
                  ['Joined', new Date(selectedUser.created_at).toLocaleString()],
                  ['Applications', String(selectedUser.application_count)],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                    <span style={{ color: '#9ca3af', minWidth: 90 }}>{label}</span>
                    <span style={{ fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>First Name</label>
                    <input style={input} value={editForm.given_name}
                      onChange={e => setEditForm(f => ({ ...f, given_name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Last Name</label>
                    <input style={input} value={editForm.family_name}
                      onChange={e => setEditForm(f => ({ ...f, family_name: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Email</label>
                  <input style={input} type="email" value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Role</label>
                  <select style={{ ...input, cursor: 'pointer' }} value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button onClick={saveEdit} style={{ ...btn('#1a56db'), width: '100%', padding: '10px' }}>
                  Save Changes
                </button>
              </div>
            )}

            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: '#374151' }}>
                Applications ({userApps?.length ?? 0})
              </div>
              {userApps && userApps.length === 0 && (
                <div style={{ fontSize: 13, color: '#9ca3af', padding: '8px 0' }}>No applications.</div>
              )}
              {userApps && userApps.map(app => (
                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '8px 12px', background: '#f9fafb',
                  borderRadius: 7, marginBottom: 6, fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{credLabels[app.credential_type] ?? app.credential_type}</span>
                    <span style={{ color: '#9ca3af', marginLeft: 8 }}>
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: statusColor[app.status], fontWeight: 700, fontSize: 12 }}>
                      ● {app.status.toUpperCase()}
                    </span>
                    <button onClick={() => nav(`/admin/applications/${app.id}`)}
                      style={{ padding: '3px 10px', background: '#fff', border: '1px solid #d1d5db',
                        borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
