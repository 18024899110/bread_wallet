import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api'

const statusStyle: Record<string, React.CSSProperties> = {
  pending:  { background: '#fef3c7', color: '#92400e' },
  approved: { background: '#def7ec', color: '#03543f' },
  rejected: { background: '#fde8e8', color: '#9b1c1c' },
}

const credLabels: Record<string, string> = {
  NationalID: 'National ID', mDL: 'Mobile Driving Licence',
  AddressCredential: 'Address Credential', ProofOfAge: 'Proof of Age',
  HealthInsuranceCard: 'Health Insurance Card', StudentID: 'Student ID',
  VehicleRegistration: 'Vehicle Registration', ProfessionalLicense: 'Professional Licence',
  PassportCredential: 'Passport', SocialSecurityCredential: 'Social Security',
  BankAccountCredential: 'Bank Account', EmploymentCredential: 'Employment',
  VaccinationCredential: 'Vaccination Certificate', DisabilityCredential: 'Disability Credential',
}

export default function UserDashboard() {
  const nav = useNavigate()
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMyApplications().then((d: any) => setApps(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  let email = ''
  try { email = JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).email } catch {}

  return (
    <Layout role="user" userName={email}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Applications</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Track the status of your credential requests</p>
        </div>
        <button onClick={() => nav('/apply')} style={{ background: '#1a56db', color: '#fff',
          border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600,
          fontSize: 14, cursor: 'pointer' }}>
          + New Application
        </button>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      {!loading && apps.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>No applications yet</p>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Submit an application to receive your digital credential.</p>
          <button onClick={() => nav('/apply')} style={{ marginTop: 16, background: '#1a56db',
            color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px',
            fontWeight: 600, cursor: 'pointer' }}>
            Apply Now
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {apps.map(app => (
          <div key={app.id} style={{ background: '#fff', borderRadius: 12, padding: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,.06)', display: 'flex',
            justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{credLabels[app.credential_type] ?? app.credential_type}</span>
                <span style={{ ...statusStyle[app.status], padding: '2px 10px', borderRadius: 999,
                  fontSize: 12, fontWeight: 600 }}>
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                {app.given_name} {app.family_name} · Submitted {new Date(app.created_at).toLocaleDateString()}
              </p>
              {app.admin_note && (
                <p style={{ fontSize: 13, color: '#374151', marginTop: 6,
                  background: '#f9fafb', padding: '6px 10px', borderRadius: 6 }}>
                  Note: {app.admin_note}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {app.email_sent ? (
                <div style={{ color: '#057a55', fontWeight: 600, fontSize: 13 }}>
                  ✓ QR sent to your email
                  <div style={{ fontWeight: 400, color: '#6b7280' }}>
                    {new Date(app.email_sent_at).toLocaleDateString()}
                  </div>
                </div>
              ) : app.status === 'approved' ? (
                <span style={{ color: '#d97706', fontSize: 13 }}>Sending email…</span>
              ) : null}
              <button onClick={() => nav(`/applications/${app.id}`)}
                style={{ padding: '6px 14px', background: '#f3f4f6', color: '#374151',
                  border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13,
                  cursor: 'pointer', fontWeight: 500 }}>
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
