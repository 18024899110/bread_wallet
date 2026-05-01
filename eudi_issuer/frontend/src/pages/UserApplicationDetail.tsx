import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api'

const credLabels: Record<string, string> = {
  NationalID: 'National ID', mDL: 'Mobile Driving Licence',
  AddressCredential: 'Address Credential', ProofOfAge: 'Proof of Age',
  HealthInsuranceCard: 'Health Insurance Card', StudentID: 'Student ID',
  VehicleRegistration: 'Vehicle Registration', ProfessionalLicense: 'Professional Licence',
  PassportCredential: 'Passport', SocialSecurityCredential: 'Social Security',
  BankAccountCredential: 'Bank Account', EmploymentCredential: 'Employment',
  VaccinationCredential: 'Vaccination Certificate', DisabilityCredential: 'Disability Credential',
}

const statusStyle: Record<string, React.CSSProperties> = {
  pending:  { background: '#fef3c7', color: '#92400e' },
  approved: { background: '#def7ec', color: '#03543f' },
  rejected: { background: '#fde8e8', color: '#9b1c1c' },
}

function Row({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value && value !== '0') return null
  return (
    <div style={{ display: 'flex', gap: 12, padding: '7px 0',
      borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>
      <span style={{ color: '#9ca3af', minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

export default function UserApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')

  useEffect(() => {
    if (!id) return
    api.getApplication(id)
      .then((d: any) => setApp(d))
      .catch(() => setError('Application not found.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await api.deleteApplication(id)
      nav('/dashboard')
    } catch (err: any) {
      setDeleteErr(err.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) return (
    <Layout role="user">
      <p style={{ color: '#6b7280', padding: 32 }}>Loading…</p>
    </Layout>
  )

  if (error || !app) return (
    <Layout role="user">
      <p style={{ color: '#dc2626', padding: 32 }}>{error || 'Not found.'}</p>
    </Layout>
  )

  const canEdit = ['pending', 'rejected'].includes(app.status)
  let extraParsed: Record<string, string> = {}
  try { extraParsed = JSON.parse(app.extra_data || '{}') } catch {}

  return (
    <Layout role="user">
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => nav('/dashboard')} style={{ background: 'none', border: 'none',
          color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 8, padding: 0 }}>
          ← Back to Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              {credLabels[app.credential_type] ?? app.credential_type}
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              Application ID: {app.id}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {canEdit && (
              <button onClick={() => nav(`/apply?edit=${app.id}`)}
                style={{ padding: '8px 18px', background: '#1a56db', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                ✏ Edit & Resubmit
              </button>
            )}
            {canEdit && (
              <button onClick={() => setConfirmDelete(true)}
                style={{ padding: '8px 18px', background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                🗑 Delete
              </button>
            )}
          </div>
        </div>
      </div>


      <div style={{ marginBottom: 16 }}>
        <span style={{ ...statusStyle[app.status], padding: '4px 14px', borderRadius: 999,
          fontSize: 13, fontWeight: 700 }}>
          {app.status.toUpperCase()}
        </span>
        {app.admin_note && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: '#fef9c3',
            borderRadius: 8, fontSize: 13, color: '#713f12', border: '1px solid #fde68a' }}>
            <strong>Admin Note:</strong> {app.admin_note}
          </div>
        )}
      </div>

      {deleteErr && (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: '#fde8e8',
          color: '#9b1c1c', borderRadius: 7, fontSize: 13 }}>{deleteErr}</div>
      )}

      {confirmDelete && (
        <div style={{ marginBottom: 20, padding: '16px 20px', background: '#fff5f5',
          border: '1px solid #fca5a5', borderRadius: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#dc2626', marginBottom: 6 }}>
            Delete this application?
          </div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 14 }}>
            This action cannot be undone. The application and any uploaded document will be permanently deleted.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleDelete} disabled={deleting}
              style={{ padding: '8px 18px', background: '#dc2626', color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14,
                cursor: deleting ? 'not-allowed' : 'pointer' }}>
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151',
                border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, padding: 28,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>

        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#374151' }}>Application Details</h2>

        <Row label="Submitted" value={new Date(app.created_at).toLocaleString()} />
        {app.reviewed_at && <Row label="Reviewed" value={new Date(app.reviewed_at).toLocaleString()} />}
        <Row label="First Name" value={app.given_name} />
        <Row label="Last Name" value={app.family_name} />
        <Row label="Date of Birth" value={app.date_of_birth} />
        <Row label="Document Number" value={app.document_number} />
        <Row label="Sex" value={app.sex} />
        <Row label="Height (cm)" value={app.height ? String(app.height) : null} />
        <Row label="Nationality" value={app.nationality} />
        <Row label="Street Address" value={app.street_address} />
        <Row label="City / Suburb" value={app.locality} />
        <Row label="State / Region" value={app.region} />
        <Row label="Postcode" value={app.postal_code} />
        <Row label="Country" value={app.country} />

        {Object.keys(extraParsed).length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 12px', color: '#374151' }}>
              Credential-Specific Details
            </h2>
            {Object.entries(extraParsed).map(([k, v]) => (
              <Row key={k} label={k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} value={v} />
            ))}
          </>
        )}

        {app.doc_file_name && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 12px', color: '#374151' }}>Supporting Document</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: '#f9fafb', borderRadius: 8, fontSize: 13 }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <span style={{ fontWeight: 500 }}>{app.doc_file_name}</span>
            </div>
          </>
        )}

        {app.face_image && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 12px', color: '#374151' }}>Face Photo</h2>
            <img src={app.face_image} alt="Face"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                border: '3px solid #1a56db' }} />
          </>
        )}

        {app.email_sent && (
          <div style={{ marginTop: 20, padding: '10px 14px', background: '#def7ec',
            borderRadius: 8, fontSize: 13, color: '#03543f', fontWeight: 600 }}>
            ✓ Credential offer QR sent to your email on {new Date(app.email_sent_at).toLocaleString()}
          </div>
        )}
      </div>
    </Layout>
  )
}
