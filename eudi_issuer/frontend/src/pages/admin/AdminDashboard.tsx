import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../api'

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

type App = {
  id: string; credential_type: string; status: string
  given_name: string; family_name: string; user_email: string
  date_of_birth: string; document_number: string
  created_at: string; reviewed_at?: string; admin_note?: string
  email_sent: number; email_sent_at?: string
}

export default function AdminDashboard() {
  const nav = useNavigate()

  const [apps, setApps] = useState<App[]>([])
  const [stats, setStats] = useState<any>(null)
  const [waltid, setWaltid] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [note, setNote] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({})

  const refresh = useCallback(async () => {
    const [a, s, w] = await Promise.all([
      api.getAdminApplications() as Promise<App[]>,
      api.getAdminStats(),
      api.getWaltidStatus(),
    ])
    setApps(a); setStats(s); setWaltid(w)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function approve(id: string) {
    setLoading(l => ({ ...l, [id]: true }))
    setMsg(m => ({ ...m, [id]: { ok: true, text: '' } }))
    try {
      await api.approveApplication(id, note[id] ?? '')
      setMsg(m => ({ ...m, [id]: { ok: true, text: '✓ Approved — QR email sent!' } }))
      refresh()
    } catch (err: any) {
      setMsg(m => ({ ...m, [id]: { ok: false, text: err.message } }))
    } finally { setLoading(l => ({ ...l, [id]: false })) }
  }

  async function resend(id: string) {
    setLoading(l => ({ ...l, [id]: true }))
    try {
      await api.resendApplication(id)
      setMsg(m => ({ ...m, [id]: { ok: true, text: '✓ QR email resent!' } }))
      refresh()
    } catch (err: any) {
      setMsg(m => ({ ...m, [id]: { ok: false, text: err.message } }))
    } finally { setLoading(l => ({ ...l, [id]: false })) }
  }

  async function reject(id: string) {
    setLoading(l => ({ ...l, [id]: true }))
    try {
      await api.rejectApplication(id, note[id] ?? '')
      setMsg(m => ({ ...m, [id]: { ok: false, text: 'Application rejected.' } }))
      refresh()
    } catch (err: any) {
      setMsg(m => ({ ...m, [id]: { ok: false, text: err.message } }))
    } finally { setLoading(l => ({ ...l, [id]: false })) }
  }

  const filtered = apps.filter(a => filter === 'all' || a.status === filter)

  return (
    <Layout role="admin">

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats?.total ?? '…', color: '#1a56db' },
          { label: 'Pending', value: stats?.pending ?? '…', color: '#d97706' },
          { label: 'Approved', value: stats?.approved ?? '…', color: '#057a55' },
          { label: 'Users', value: stats?.users ?? '…', color: '#7e3af2' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>


      {waltid && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8,
          background: waltid.connected ? '#def7ec' : '#fde8e8',
          color: waltid.connected ? '#03543f' : '#9b1c1c', fontSize: 13, fontWeight: 600 }}>
          {waltid.connected
            ? `✓ walt.id connected (${waltid.url})`
            : `✗ walt.id issuer unreachable — check that the waltid-issuer container is running`}
        </div>
      )}


      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            background: filter === f ? '#1a56db' : '#e5e7eb',
            color: filter === f ? '#fff' : '#374151',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'all' ? `(${apps.length})` : `(${apps.filter(a => a.status === f).length})`}
          </button>
        ))}
        <button onClick={refresh} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8,
          border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
          ↻ Refresh
        </button>
        <button onClick={() => nav('/admin/users')} style={{ padding: '6px 14px', borderRadius: 8,
          border: 'none', background: '#7e3af2', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          👥 Manage Users
        </button>
      </div>


      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, textAlign: 'center',
            color: '#6b7280', fontSize: 14 }}>No applications found.</div>
        )}

        {filtered.map(app => (
          <div key={app.id} style={{ background: '#fff', borderRadius: 12, padding: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{app.given_name} {app.family_name}</span>
                  <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 999,
                    fontSize: 12, fontWeight: 600 }}>{credLabels[app.credential_type] ?? app.credential_type}</span>
                  <span style={{ color: statusColor[app.status], fontSize: 12, fontWeight: 700 }}>
                    ● {app.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {app.user_email} · DOB: {app.date_of_birth} · Doc: {app.document_number}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  Submitted: {new Date(app.created_at).toLocaleString()}
                  {app.reviewed_at && ` · Reviewed: ${new Date(app.reviewed_at).toLocaleString()}`}
                </div>
                {app.email_sent === 1 && (
                  <div style={{ fontSize: 12, color: '#057a55', marginTop: 4, fontWeight: 600 }}>
                    ✓ QR email sent {app.email_sent_at ? new Date(app.email_sent_at).toLocaleString() : ''}
                  </div>
                )}
                <button onClick={() => nav(`/admin/applications/${app.id}`)}
                  style={{ marginTop: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600,
                    border: '1px solid #d1d5db', borderRadius: 6, background: '#fff',
                    cursor: 'pointer', color: '#374151' }}>
                  View Details →
                </button>
              </div>

              {app.status === 'approved' && app.email_sent === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
                  <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>⚠ Email not delivered</div>
                  <button onClick={() => resend(app.id)} disabled={loading[app.id]}
                    style={{ padding: '8px 16px', background: '#1a56db', color: '#fff',
                      border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13,
                      cursor: 'pointer' }}>
                    {loading[app.id] ? '…' : '↻ Resend QR Email'}
                  </button>
                  {msg[app.id]?.text && (
                    <div style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6,
                      background: msg[app.id].ok ? '#def7ec' : '#fde8e8',
                      color: msg[app.id].ok ? '#03543f' : '#9b1c1c' }}>
                      {msg[app.id].text}
                    </div>
                  )}
                </div>
              )}


              {app.status === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
                  <input
                    placeholder="Admin note (optional)"
                    value={note[app.id] ?? ''}
                    onChange={e => setNote(n => ({ ...n, [app.id]: e.target.value }))}
                    style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6,
                      fontSize: 13, width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approve(app.id)} disabled={loading[app.id]}
                      style={{ flex: 1, padding: '8px 0', background: '#057a55', color: '#fff',
                        border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13,
                        cursor: 'pointer' }}>
                      {loading[app.id] ? '…' : '✓ Approve & Send QR'}
                    </button>
                    <button onClick={() => reject(app.id)} disabled={loading[app.id]}
                      style={{ flex: 1, padding: '8px 0', background: '#dc2626', color: '#fff',
                        border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13,
                        cursor: 'pointer' }}>
                      ✗ Reject
                    </button>
                  </div>
                  {msg[app.id]?.text && (
                    <div style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6,
                      background: msg[app.id].ok ? '#def7ec' : '#fde8e8',
                      color: msg[app.id].ok ? '#03543f' : '#9b1c1c' }}>
                      {msg[app.id].text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
