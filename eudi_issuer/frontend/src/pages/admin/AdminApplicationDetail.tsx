import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { api } from '../../api'

const credLabels: Record<string, string> = {
  NationalID: 'National ID', mDL: 'Mobile Driving Licence',
  AddressCredential: 'Address Credential', ProofOfAge: 'Proof of Age',
}
const statusColor: Record<string, string> = {
  pending: '#d97706', approved: '#057a55', rejected: '#dc2626',
}

type AppDetail = {
  id: string; credential_type: string; status: string
  given_name: string; family_name: string; user_email: string
  date_of_birth: string; document_number: string
  street_address: string; locality: string; region: string
  postal_code: string; country: string; nationality: string
  sex: string; height: number
  created_at: string; reviewed_at?: string; reviewed_by?: string
  admin_note?: string; offer_url?: string; holder_did?: string
  email_sent: number; email_sent_at?: string
  doc_file_name?: string; doc_mime_type?: string; doc_file_path?: string
  face_image?: string
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase',
        letterSpacing: '0.05em', marginBottom: 2 }}>{label}</dt>
      <dd style={{ fontSize: 14, color: '#111827', margin: 0 }}>{value || '—'}</dd>
    </div>
  )
}

export default function AdminApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [app, setApp] = useState<AppDetail | null>(null)
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const docUrlRef = useRef<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [note, setNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    api.getAdminApplication(id)
      .then((data: AppDetail) => { setApp(data); setNote(data.admin_note ?? '') })
      .catch(() => nav('/admin'))
  }, [id, nav])

  useEffect(() => {
    if (app?.doc_file_name && !docUrlRef.current) {
      setDocLoading(true)
      api.getAdminApplicationDocumentUrl(app.id)
        .then(url => { docUrlRef.current = url; setDocUrl(url) })
        .catch(() => {/* no doc or load failed */})
        .finally(() => setDocLoading(false))
    }
    return () => {
      if (docUrlRef.current) {
        URL.revokeObjectURL(docUrlRef.current)
        docUrlRef.current = null
      }
    }
  }, [app?.id, app?.doc_file_name])

  async function approve() {
    if (!app) return
    setActionLoading(true); setMsg(null)
    try {
      await api.approveApplication(app.id, note)
      setMsg({ ok: true, text: 'Application approved — credential offer email sent!' })
      const updated: AppDetail = await api.getAdminApplication(app.id)
      setApp(updated)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message })
    } finally { setActionLoading(false) }
  }

  async function reject() {
    if (!app) return
    setActionLoading(true); setMsg(null)
    try {
      await api.rejectApplication(app.id, note)
      setMsg({ ok: false, text: 'Application rejected.' })
      const updated: AppDetail = await api.getAdminApplication(app.id)
      setApp(updated)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message })
    } finally { setActionLoading(false) }
  }

  async function reissue() {
    if (!app) return
    setActionLoading(true); setMsg(null)
    try {
      await api.reissueApplication(app.id, note || undefined)
      setMsg({ ok: true, text: 'Credential re-issued — new QR email sent!' })
      const updated: AppDetail = await api.getAdminApplication(app.id)
      setApp(updated)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message })
    } finally { setActionLoading(false) }
  }

  async function resend() {
    if (!app) return
    setActionLoading(true); setMsg(null)
    try {
      await api.resendApplication(app.id)
      setMsg({ ok: true, text: 'Credential offer email resent!' })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message })
    } finally { setActionLoading(false) }
  }

  if (!app) return (
    <Layout role="admin">
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
    </Layout>
  )

  const isImage = app.doc_mime_type?.startsWith('image/')
  const isPdf = app.doc_mime_type === 'application/pdf'

  return (
    <Layout role="admin">
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => nav('/admin')} style={{ background: 'none', border: 'none',
          color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0 }}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            {app.given_name} {app.family_name}
          </h1>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {app.user_email} · Application #{app.id.slice(0, 8)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ background: '#f3f4f6', padding: '4px 12px', borderRadius: 999,
            fontSize: 13, fontWeight: 600 }}>
            {credLabels[app.credential_type] ?? app.credential_type}
          </span>
          <span style={{ color: statusColor[app.status], fontSize: 13, fontWeight: 700 }}>
            ● {app.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

       
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 10,
              borderBottom: '1px solid #f3f4f6' }}>Personal Information</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', margin: 0 }}>
              <Field label="First Name" value={app.given_name} />
              <Field label="Last Name" value={app.family_name} />
              <Field label="Date of Birth" value={app.date_of_birth} />
              <Field label="Document Number" value={app.document_number} />
              <Field label="Sex" value={app.sex === 'M' ? 'Male' : 'Female'} />
              <Field label="Height" value={app.height ? `${app.height} cm` : undefined} />
              <Field label="Nationality" value={app.nationality} />
              <Field label="Country" value={app.country} />
            </dl>
          </div>

 
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 10,
              borderBottom: '1px solid #f3f4f6' }}>Address</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', margin: 0 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Street Address" value={app.street_address} />
              </div>
              <Field label="City / Suburb" value={app.locality} />
              <Field label="State" value={app.region} />
              <Field label="Postcode" value={app.postal_code} />
            </dl>
          </div>


          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 10,
              borderBottom: '1px solid #f3f4f6' }}>Timeline</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', margin: 0 }}>
              <Field label="Submitted" value={new Date(app.created_at).toLocaleString()} />
              {app.reviewed_at && <Field label="Reviewed" value={new Date(app.reviewed_at).toLocaleString()} />}
              {app.reviewed_by && <Field label="Reviewed By" value={app.reviewed_by} />}
              {app.admin_note && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Admin Note" value={app.admin_note} />
                </div>
              )}
              {app.email_sent === 1 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="QR Email Sent"
                    value={app.email_sent_at ? new Date(app.email_sent_at).toLocaleString() : 'Yes'} />
                </div>
              )}
              {app.holder_did && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt style={{ fontSize: 12, fontWeight: 600, color: '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Holder DID</dt>
                  <dd style={{ fontSize: 12, color: '#374151', margin: 0, wordBreak: 'break-all',
                    fontFamily: 'monospace' }}>{app.holder_did}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>


        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>


          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 10,
              borderBottom: '1px solid #f3f4f6' }}>Face Biometric</h2>
            {app.face_image ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <img src={app.face_image} alt="Applicant face photo"
                  style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid #059669', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  background: '#dcfce7', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  color: '#166534' }}>
                  ✓ Face photo captured at application
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  Photo was verified by live face detection during submission.<br />
                  This portrait will be embedded in the issued credential.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '20px 0', color: '#9ca3af' }}>
                <span style={{ fontSize: 32 }}>👤</span>
                <span style={{ fontSize: 14 }}>No face photo submitted</span>
                <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600,
                  background: '#fef3c7', padding: '4px 12px', borderRadius: 999 }}>
                  Portrait will NOT be embedded in the credential
                </div>
              </div>
            )}
          </div>


          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 10,
              borderBottom: '1px solid #f3f4f6' }}>Supporting Document</h2>

            {!app.doc_file_name ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                No document uploaded
              </div>
            ) : docLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                Loading document…
              </div>
            ) : docUrl ? (
              <div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 10, display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{app.doc_file_name}</span>
                  <a href={docUrl} download={app.doc_file_name}
                    style={{ fontSize: 12, color: '#1a56db', textDecoration: 'none' }}>
                    Download
                  </a>
                </div>
                {isImage && (
                  <img src={docUrl} alt="Uploaded document"
                    style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb',
                      maxHeight: 400, objectFit: 'contain', background: '#f9fafb' }} />
                )}
                {isPdf && (
                  <iframe src={docUrl} title="Document preview"
                    style={{ width: '100%', height: 400, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                )}
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                Could not load document preview
              </div>
            )}
          </div>


          <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 10,
              borderBottom: '1px solid #f3f4f6' }}>Review Decision</h2>

            {app.status === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
                    marginBottom: 4 }}>Admin Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a note to the applicant…"
                    rows={3}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
                      borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={approve} disabled={actionLoading}
                    style={{ flex: 1, padding: '10px 0', background: '#057a55', color: '#fff',
                      border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 14,
                      cursor: 'pointer' }}>
                    {actionLoading ? '…' : '✓ Approve & Send QR'}
                  </button>
                  <button onClick={reject} disabled={actionLoading}
                    style={{ flex: 1, padding: '10px 0', background: '#dc2626', color: '#fff',
                      border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 14,
                      cursor: 'pointer' }}>
                    {actionLoading ? '…' : '✗ Reject'}
                  </button>
                </div>
              </div>
            )}

            {app.status === 'approved' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '10px 14px', background: '#def7ec', color: '#03543f',
                  borderRadius: 7, fontSize: 13, fontWeight: 600 }}>
                  ✓ Approved {app.reviewed_at ? `on ${new Date(app.reviewed_at).toLocaleDateString()}` : ''}
                  {app.email_sent === 1 && app.email_sent_at
                    ? ` · QR sent ${new Date(app.email_sent_at).toLocaleDateString()}`
                    : ''}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
                    marginBottom: 4 }}>Note for re-issue (optional)</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Reason for re-issuing…" rows={2}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
                      borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <button onClick={reissue} disabled={actionLoading}
                  style={{ padding: '10px 0', background: '#1a56db', color: '#fff',
                    border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  {actionLoading ? '…' : '↻ Re-issue Credential'}
                </button>
              </div>
            )}

            {app.status === 'rejected' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '10px 14px', background: '#fde8e8', color: '#9b1c1c',
                  borderRadius: 7, fontSize: 13, fontWeight: 600 }}>
                  ✗ Rejected {app.reviewed_at ? `on ${new Date(app.reviewed_at).toLocaleDateString()}` : ''}
                  {app.admin_note ? ` — ${app.admin_note}` : ''}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
                    marginBottom: 4 }}>Note for re-issue (optional)</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Reason for re-issuing…" rows={2}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
                      borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <button onClick={reissue} disabled={actionLoading}
                  style={{ padding: '10px 0', background: '#1a56db', color: '#fff',
                    border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  {actionLoading ? '…' : '↻ Re-issue Credential'}
                </button>
              </div>
            )}

            {msg && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 7, fontSize: 13,
                fontWeight: 600,
                background: msg.ok ? '#def7ec' : '#fde8e8',
                color: msg.ok ? '#03543f' : '#9b1c1c' }}>
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
