import { useState, useRef, FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api'

const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
  marginBottom: 4, marginTop: 14 } as React.CSSProperties
const inputBase = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
  borderRadius: 7, fontSize: 14, boxSizing: 'border-box' as const } as React.CSSProperties
const inputErr = { ...inputBase, border: '1px solid #dc2626' }
const fieldErr = { marginTop: 4, fontSize: 12, color: '#dc2626' } as React.CSSProperties
const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } as React.CSSProperties
const row3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 } as React.CSSProperties


type ExtraFieldDef = {
  key: string; label: string; placeholder?: string
  type?: 'text' | 'date' | 'number'; required?: boolean
}

type CredSchema = {
  label: string; desc: string; icon: string
  needsFace: boolean
  fields: {
    givenName?: boolean; familyName?: boolean; dateOfBirth?: boolean
    documentNumber?: boolean; docNumberLabel?: string
    sex?: boolean; height?: boolean; nationality?: boolean; country?: boolean
    address?: boolean
  }
  extraFields: ExtraFieldDef[]
}

const CRED_SCHEMA: Record<string, CredSchema> = {
  NationalID: {
    label: 'National ID', desc: 'Government-issued national identity document', icon: '🪪',
    needsFace: true,
    fields: { givenName: true, familyName: true, dateOfBirth: true, documentNumber: true,
      docNumberLabel: 'Document Number', sex: true, nationality: true },
    extraFields: [],
  },
  mDL: {
    label: 'Mobile Driving Licence (mDL)', desc: 'ISO 18013-5 digital driving licence', icon: '🚗',
    needsFace: true,
    fields: { givenName: true, familyName: true, dateOfBirth: true, documentNumber: true,
      docNumberLabel: 'Licence Number', sex: true, height: true, country: true, address: true },
    extraFields: [],
  },
  AddressCredential: {
    label: 'Address Credential', desc: 'Verified residential address', icon: '🏠',
    needsFace: false,
    fields: { givenName: true, familyName: true, address: true },
    extraFields: [],
  },
  ProofOfAge: {
    label: 'Proof of Age', desc: 'Age verification without revealing full identity', icon: '🎂',
    needsFace: false,
    fields: { dateOfBirth: true },
    extraFields: [],
  },
  HealthInsuranceCard: {
    label: 'Health Insurance Card', desc: 'Health insurance membership credential', icon: '🏥',
    needsFace: false,
    fields: { givenName: true, familyName: true, dateOfBirth: true,
      documentNumber: true, docNumberLabel: 'Insurance Member Number' },
    extraFields: [
      { key: 'insurer_name', label: 'Insurer / Provider Name', placeholder: 'Medicare', required: true },
      { key: 'plan_type', label: 'Plan Type', placeholder: 'Gold / Silver / Bronze' },
      { key: 'valid_until', label: 'Valid Until', type: 'date' },
    ],
  },
  StudentID: {
    label: 'Student ID', desc: 'Academic institution student identity', icon: '🎓',
    needsFace: true,
    fields: { givenName: true, familyName: true, dateOfBirth: true,
      documentNumber: true, docNumberLabel: 'Student Number' },
    extraFields: [
      { key: 'institution', label: 'Institution Name', placeholder: 'UNSW Sydney', required: true },
      { key: 'major', label: 'Major / Field of Study', placeholder: 'Computer Science' },
      { key: 'enrollment_date', label: 'Enrollment Date', type: 'date' },
    ],
  },
  VehicleRegistration: {
    label: 'Vehicle Registration', desc: 'Registered vehicle ownership credential', icon: '🚙',
    needsFace: false,
    fields: { givenName: true, familyName: true,
      documentNumber: true, docNumberLabel: 'Licence Plate / Rego Number' },
    extraFields: [
      { key: 'vehicle_make', label: 'Vehicle Make', placeholder: 'Toyota', required: true },
      { key: 'vehicle_model', label: 'Vehicle Model', placeholder: 'Corolla', required: true },
      { key: 'vehicle_year', label: 'Vehicle Year', placeholder: '2020', type: 'number' },
      { key: 'vin', label: 'VIN (Vehicle Identification Number)', placeholder: '1HGCM82633A123456' },
    ],
  },
  ProfessionalLicense: {
    label: 'Professional Licence', desc: 'Certified professional qualification', icon: '⚕️',
    needsFace: true,
    fields: { givenName: true, familyName: true,
      documentNumber: true, docNumberLabel: 'Licence Number' },
    extraFields: [
      { key: 'license_type', label: 'Profession / Licence Type', placeholder: 'Medical Practitioner', required: true },
      { key: 'issuing_authority', label: 'Issuing Authority', placeholder: 'AHPRA', required: true },
      { key: 'valid_until', label: 'Expiry Date', type: 'date' },
      { key: 'jurisdiction', label: 'Jurisdiction', placeholder: 'New South Wales' },
    ],
  },
  PassportCredential: {
    label: 'Passport', desc: 'Digital passport for international travel', icon: '🛂',
    needsFace: true,
    fields: { givenName: true, familyName: true, dateOfBirth: true, documentNumber: true,
      docNumberLabel: 'Passport Number', nationality: true, sex: true },
    extraFields: [
      { key: 'place_of_birth', label: 'Place of Birth', placeholder: 'Sydney' },
      { key: 'valid_until', label: 'Passport Expiry Date', type: 'date', required: true },
    ],
  },
  SocialSecurityCredential: {
    label: 'Social Security Credential', desc: 'National social security / insurance number', icon: '🔐',
    needsFace: false,
    fields: { givenName: true, familyName: true, dateOfBirth: true,
      documentNumber: true, docNumberLabel: 'Social Security / NI Number' },
    extraFields: [],
  },
  BankAccountCredential: {
    label: 'Bank Account Credential', desc: 'Verified bank account ownership', icon: '🏦',
    needsFace: false,
    fields: { givenName: true, familyName: true,
      documentNumber: true, docNumberLabel: 'IBAN / Account Number' },
    extraFields: [
      { key: 'bank_name', label: 'Bank Name', placeholder: 'Commonwealth Bank', required: true },
      { key: 'account_type', label: 'Account Type', placeholder: 'Savings / Cheque' },
    ],
  },
  EmploymentCredential: {
    label: 'Employment Credential', desc: 'Verified employment status and details', icon: '💼',
    needsFace: false,
    fields: { givenName: true, familyName: true,
      documentNumber: false, docNumberLabel: 'Employee ID (optional)' },
    extraFields: [
      { key: 'employer_name', label: 'Employer / Company Name', placeholder: 'Acme Corp', required: true },
      { key: 'job_title', label: 'Job Title', placeholder: 'Software Engineer', required: true },
      { key: 'employment_type', label: 'Employment Type', placeholder: 'Full-time / Part-time / Contract' },
      { key: 'start_date', label: 'Employment Start Date', type: 'date' },
    ],
  },
  VaccinationCredential: {
    label: 'Vaccination Certificate', desc: 'Verified vaccination and immunisation record', icon: '💉',
    needsFace: false,
    fields: { givenName: true, familyName: true, dateOfBirth: true,
      documentNumber: false, docNumberLabel: 'Certificate Number (optional)' },
    extraFields: [
      { key: 'vaccine_type', label: 'Vaccine Type', placeholder: 'COVID-19 / Influenza / MMR', required: true },
      { key: 'vaccine_name', label: 'Vaccine Name', placeholder: 'Pfizer-BioNTech Comirnaty', required: true },
      { key: 'vaccination_date', label: 'Vaccination Date', type: 'date', required: true },
      { key: 'valid_until', label: 'Valid Until', type: 'date' },
      { key: 'issuer_organization', label: 'Issuing Organisation', placeholder: 'Royal Prince Alfred Hospital', required: true },
    ],
  },
  DisabilityCredential: {
    label: 'Disability Credential', desc: 'Certified disability status and support needs', icon: '♿',
    needsFace: true,
    fields: { givenName: true, familyName: true, dateOfBirth: true,
      documentNumber: true, docNumberLabel: 'NDIS / Disability Card Number' },
    extraFields: [
      { key: 'disability_type', label: 'Disability Type', placeholder: 'Physical / Cognitive / Sensory', required: true },
      { key: 'disability_level', label: 'Support Level', placeholder: 'Moderate / Severe' },
    ],
  },
}

const CRED_TYPE_KEYS = Object.keys(CRED_SCHEMA)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024


const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]{2,100}$/
const DOC_RE = /^[A-Za-z0-9\-]{2,40}$/
const POSTAL_RE = /^[A-Za-z0-9]{3,10}$/
const COUNTRY_RE = /^[A-Za-z]{2,3}$/
const NATIONALITY_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]{2,50}$/
const LOCALITY_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]{0,100}$/

function validateForm(form: Record<string, string>, schema: CredSchema): Record<string, string> {
  const errors: Record<string, string> = {}
  const f = schema.fields

  if (f.givenName && !NAME_RE.test(form.given_name))
    errors.given_name = 'Only letters, spaces, hyphens, apostrophes. 2–100 characters.'
  if (f.familyName && !NAME_RE.test(form.family_name))
    errors.family_name = 'Only letters, spaces, hyphens, apostrophes. 2–100 characters.'

  if (f.dateOfBirth) {
    const dob = new Date(form.date_of_birth)
    if (!form.date_of_birth || isNaN(dob.getTime()) || dob >= new Date())
      errors.date_of_birth = 'Must be a valid date in the past.'
    else if ((Date.now() - dob.getTime()) / 86400000 > 365.25 * 120)
      errors.date_of_birth = 'Age over 120 years — please check the date.'
  }

  if (f.documentNumber && form.document_number && !DOC_RE.test(form.document_number))
    errors.document_number = '2–40 alphanumeric characters (hyphens allowed).'

  if (f.height) {
    const h = Number(form.height)
    if (!Number.isInteger(h) || h < 50 || h > 300)
      errors.height = 'Must be a whole number between 50 and 300.'
  }

  if (f.address) {
    if (form.postal_code && !POSTAL_RE.test(form.postal_code))
      errors.postal_code = '3–10 alphanumeric characters only.'
    if (form.country && !COUNTRY_RE.test(form.country))
      errors.country = '2–3 letter ISO code (e.g. AU, USA).'
    if (form.locality && !LOCALITY_RE.test(form.locality))
      errors.locality = 'Letters, spaces, hyphens only. Max 100 chars.'
    if (form.region && !LOCALITY_RE.test(form.region))
      errors.region = 'Letters, spaces, hyphens only. Max 100 chars.'
  }

  if (f.nationality && form.nationality && !NATIONALITY_RE.test(form.nationality))
    errors.nationality = 'Letters and spaces only. 2–50 characters.'

  return errors
}


export default function Apply() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') ?? ''
  const isEdit = !!editId

  const [credType, setCredType] = useState('NationalID')
  const schema = CRED_SCHEMA[credType]

  const [form, setForm] = useState<Record<string, string>>({
    given_name: '', family_name: '', date_of_birth: '', document_number: '',
    street_address: '', locality: '', region: '', postal_code: '',
    country: 'AU', nationality: 'Australian', sex: 'M', height: '175',
  })
  const [extraForm, setExtraForm] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [docFile, setDocFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectCanvasRef = useRef<HTMLCanvasElement>(null)
  const faceFileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [faceImage, setFaceImage] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [faceDetected, setFaceDetected] = useState(false)
  const [detectingLive, setDetectingLive] = useState(false)

  const [faceUploading, setFaceUploading] = useState(false)
  const [faceUploadError, setFaceUploadError] = useState('')

  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)


  useEffect(() => {
    if (!editId) return
    api.getApplication(editId).then((app: any) => {
      setCredType(app.credential_type)
      setForm({
        given_name: app.given_name ?? '',
        family_name: app.family_name ?? '',
        date_of_birth: app.date_of_birth ?? '',
        document_number: app.document_number ?? '',
        street_address: app.street_address ?? '',
        locality: app.locality ?? '',
        region: app.region ?? '',
        postal_code: app.postal_code ?? '',
        country: app.country ?? 'AU',
        nationality: app.nationality ?? 'Australian',
        sex: app.sex ?? 'M',
        height: String(app.height ?? 175),
      })
      if (app.face_image) setFaceImage(app.face_image)
      try {
        const extra = JSON.parse(app.extra_data || '{}')
        setExtraForm(extra)
      } catch {}
    }).catch(() => nav('/dashboard'))
  }, [editId])


  useEffect(() => {
    if (isEdit) return
    setExtraForm({})
    setFieldErrors({})
    setTouched({})
    setFaceImage('')
    if (cameraActive) {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      setCameraActive(false)
    }
  }, [credType])

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
      setFaceDetected(false); setDetectingLive(true)
      const warmup = setTimeout(() => {
        checkFaceLive()
        detectIntervalRef.current = setInterval(checkFaceLive, 1500)
      }, 800)
      return () => {
        clearTimeout(warmup)
        if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
      }
    } else {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
      setFaceDetected(false); setDetectingLive(false)
    }
  }, [cameraActive])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
    }
  }, [])

  async function checkFaceLive() {
    const video = videoRef.current; const canvas = detectCanvasRef.current
    if (!video || !canvas || video.readyState < 2) return
    canvas.width = 96; canvas.height = 96
    canvas.getContext('2d')!.drawImage(video, 0, 0, 96, 96)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
    try {
      const res = await fetch('/api/face/detect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const result = await res.json() as { face_detected: boolean }
      setFaceDetected(result.face_detected)
    } catch { setFaceDetected(false) }
    finally { setDetectingLive(false) }
  }

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }))
      setTouched(t => ({ ...t, [k]: true }))
    }
  }
  function setExtra(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setExtraForm(f => ({ ...f, [k]: e.target.value }))
  }
  function blur(k: string) {
    return () => {
      setTouched(t => ({ ...t, [k]: true }))
      setFieldErrors(validateForm({ ...form }, schema))
    }
  }
  function inp(k: string) {
    return touched[k] && fieldErrors[k] ? inputErr : inputBase
  }


  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('')
    const file = e.target.files?.[0] ?? null
    if (!file) { setDocFile(null); return }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Only PDF, JPEG, PNG, or WebP files are accepted.')
      e.target.value = ''; setDocFile(null); return
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('File must be 10 MB or smaller.')
      e.target.value = ''; setDocFile(null); return
    }
    setDocFile(file)
  }
  function removeFile() { setDocFile(null); setFileError(''); if (fileRef.current) fileRef.current.value = '' }


  async function startCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream; setCameraActive(true)
    } catch { setCameraError('Could not access camera. Please allow camera permission in your browser.') }
  }
  function capturePhoto() {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas || !faceDetected) return
    canvas.width = 160; canvas.height = 160
    canvas.getContext('2d')!.drawImage(video, 0, 0, 160, 160)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraActive(false); setFaceImage(dataUrl)
  }
  function retakePhoto() {
    setFaceImage('')
    setFaceUploadError('')
    if (faceFileRef.current) faceFileRef.current.value = ''
  }



  async function handleFaceFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFaceUploadError('Only JPEG, PNG, or WebP images are accepted.')
      e.target.value = ''; return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFaceUploadError('Image must be 10 MB or smaller.')
      e.target.value = ''; return
    }
    setFaceUploadError('')
    setFaceUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      try {
        const res = await fetch('/api/face/detect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        })
        const result = await res.json() as { face_detected: boolean }
        if (result.face_detected) {
          setFaceImage(dataUrl)
        } else {
          setFaceUploadError('No face detected in this image. Please upload a clear photo of your face.')
          if (faceFileRef.current) faceFileRef.current.value = ''
        }
      } catch {
        setFaceUploadError('Face detection failed. Please try again.')
        if (faceFileRef.current) faceFileRef.current.value = ''
      } finally {
        setFaceUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }


  async function submit(e: FormEvent) {
    e.preventDefault()
    const allTouched: Record<string, boolean> = {}
    Object.keys(form).forEach(k => { allTouched[k] = true })
    setTouched(allTouched)
    const errs = validateForm(form, schema)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) {
      setSubmitError('Please fix the errors above before submitting.')
      return
    }
    if (schema.needsFace && !faceImage) {
      setSubmitError('Please capture your face photo before submitting.')
      return
    }
    setSubmitError(''); setLoading(true)
    try {
      const fd = new FormData()
      fd.append('credential_type', credType)
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
      fd.set('height', String(Number(form.height) || 175))
      if (schema.needsFace && faceImage) fd.append('face_image', faceImage)
      fd.append('extra_data', JSON.stringify(extraForm))
      if (docFile) fd.append('document', docFile)
      if (isEdit) {
        await api.updateApplication(editId, fd)
        nav(`/applications/${editId}`)
      } else {
        await api.submitApplication(fd)
        nav('/dashboard')
      }
    } catch (err: any) { setSubmitError(err.message) }
    finally { setLoading(false) }
  }

  const FErr = ({ k }: { k: string }) =>
    touched[k] && fieldErrors[k] ? <div style={fieldErr}>{fieldErrors[k]}</div> : null

  const f = schema.fields


  return (
    <Layout role="user">
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => isEdit ? nav(`/applications/${editId}`) : nav('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, marginBottom: 8, padding: 0 }}>
          ← {isEdit ? 'Back to Application' : 'Back to Dashboard'}
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{isEdit ? 'Edit Application' : 'Apply for a Credential'}</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
          {isEdit
            ? 'Update your application details and resubmit for review.'
            : 'Select a credential type — the form will update to show only the relevant fields.'}
        </p>
      </div>

      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 12, padding: 32,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>1. Select Credential Type</h2>
        {isEdit && (
          <div style={{ marginBottom: 16, padding: '8px 14px', background: '#fef9c3', borderRadius: 7,
            fontSize: 13, color: '#854d0e', border: '1px solid #fde68a' }}>
            Credential type cannot be changed when editing an existing application.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 28 }}>
          {CRED_TYPE_KEYS.map(ct => {
            const sc = CRED_SCHEMA[ct]
            const sel = credType === ct
            return (
              <label key={ct} style={{ display: 'flex', gap: 10, padding: 12,
                border: `2px solid ${sel ? '#1a56db' : '#e5e7eb'}`,
                borderRadius: 8, cursor: isEdit ? 'default' : 'pointer',
                background: sel ? '#eff6ff' : '#fff',
                opacity: isEdit && !sel ? 0.45 : 1 }}>
                <input type="radio" name="credential_type" value={ct}
                  checked={sel} onChange={() => !isEdit && setCredType(ct)}
                  disabled={isEdit} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{sc.icon} {sc.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sc.desc}</div>
                  {sc.needsFace && (
                    <div style={{ fontSize: 11, color: '#059669', marginTop: 3, fontWeight: 600 }}>
                      📷 Face photo required
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>

        {(f.givenName || f.familyName || f.dateOfBirth || f.documentNumber || f.sex || f.height || f.nationality) && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>2. Personal Information</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              This information will appear on your issued credential.
            </p>

            {(f.givenName || f.familyName) && (
              <div style={row2}>
                {f.givenName && (
                  <div>
                    <label style={label}>First Name *</label>
                    <input style={inp('given_name')} value={form.given_name}
                      onChange={set('given_name')} onBlur={blur('given_name')}
                      required placeholder="Alex" />
                    <FErr k="given_name" />
                  </div>
                )}
                {f.familyName && (
                  <div>
                    <label style={label}>Last Name *</label>
                    <input style={inp('family_name')} value={form.family_name}
                      onChange={set('family_name')} onBlur={blur('family_name')}
                      required placeholder="Johnson" />
                    <FErr k="family_name" />
                  </div>
                )}
              </div>
            )}

            {(f.dateOfBirth || f.documentNumber) && (
              <div style={row2}>
                {f.dateOfBirth && (
                  <div>
                    <label style={label}>Date of Birth *</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        style={{ ...inp('date_of_birth'), width: 76 }}
                        placeholder="YYYY"
                        maxLength={4}
                        value={(form.date_of_birth || '').split('-')[0] || ''}
                        onChange={e => {
                          const y = e.target.value.replace(/\D/g, '').slice(0, 4)
                          const parts = (form.date_of_birth || '--').split('-')
                          setForm(prev => ({ ...prev, date_of_birth: `${y}-${parts[1] || ''}-${parts[2] || ''}` }))
                          setTouched(t => ({ ...t, date_of_birth: true }))
                          if (y.length === 4) monthRef.current?.focus()
                        }}
                        onBlur={blur('date_of_birth')}
                      />
                      <input
                        ref={monthRef}
                        style={{ ...inp('date_of_birth'), width: 58 }}
                        placeholder="MM"
                        maxLength={2}
                        value={(form.date_of_birth || '').split('-')[1] || ''}
                        onChange={e => {
                          const m = e.target.value.replace(/\D/g, '').slice(0, 2)
                          const parts = (form.date_of_birth || '--').split('-')
                          setForm(prev => ({ ...prev, date_of_birth: `${parts[0] || ''}-${m}-${parts[2] || ''}` }))
                          setTouched(t => ({ ...t, date_of_birth: true }))
                          if (m.length === 2) dayRef.current?.focus()
                        }}
                        onBlur={blur('date_of_birth')}
                      />
                      <input
                        ref={dayRef}
                        style={{ ...inp('date_of_birth'), width: 58 }}
                        placeholder="DD"
                        maxLength={2}
                        value={(form.date_of_birth || '').split('-')[2] || ''}
                        onChange={e => {
                          const d = e.target.value.replace(/\D/g, '').slice(0, 2)
                          const parts = (form.date_of_birth || '--').split('-')
                          setForm(prev => ({ ...prev, date_of_birth: `${parts[0] || ''}-${parts[1] || ''}-${d}` }))
                          setTouched(t => ({ ...t, date_of_birth: true }))
                        }}
                        onBlur={blur('date_of_birth')}
                      />
                    </div>
                    <FErr k="date_of_birth" />
                  </div>
                )}
                {f.documentNumber && (
                  <div>
                    <label style={label}>{f.docNumberLabel || 'Document Number'}</label>
                    <input style={inp('document_number')} value={form.document_number}
                      onChange={set('document_number')} onBlur={blur('document_number')}
                      placeholder="e.g. AU123456789" />
                    <FErr k="document_number" />
                  </div>
                )}
              </div>
            )}

            {(f.sex || f.height || f.nationality) && (
              <div style={row3}>
                {f.sex && (
                  <div>
                    <label style={label}>Sex</label>
                    <select style={inputBase} value={form.sex} onChange={set('sex')}>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                )}
                {f.height && (
                  <div>
                    <label style={label}>Height (cm)</label>
                    <input style={inp('height')} type="number" value={form.height}
                      onChange={set('height')} onBlur={blur('height')} placeholder="175" />
                    <FErr k="height" />
                  </div>
                )}
                {f.nationality && (
                  <div>
                    <label style={label}>Nationality</label>
                    <input style={inp('nationality')} value={form.nationality}
                      onChange={set('nationality')} onBlur={blur('nationality')} placeholder="Australian" />
                    <FErr k="nationality" />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {f.address && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 4 }}>3. Address</h2>
            <div>
              <label style={label}>Street Address</label>
              <input style={inp('street_address')} value={form.street_address}
                onChange={set('street_address')} onBlur={blur('street_address')}
                placeholder="42 Innovation Drive" />
            </div>
            <div style={row3}>
              <div>
                <label style={label}>City / Suburb</label>
                <input style={inp('locality')} value={form.locality}
                  onChange={set('locality')} onBlur={blur('locality')} placeholder="Sydney" />
                <FErr k="locality" />
              </div>
              <div>
                <label style={label}>State</label>
                <input style={inp('region')} value={form.region}
                  onChange={set('region')} onBlur={blur('region')} placeholder="NSW" />
                <FErr k="region" />
              </div>
              <div>
                <label style={label}>Postcode</label>
                <input style={inp('postal_code')} value={form.postal_code}
                  onChange={set('postal_code')} onBlur={blur('postal_code')} placeholder="2000" />
                <FErr k="postal_code" />
              </div>
            </div>
            <div style={row2}>
              <div>
                <label style={label}>Country</label>
                <input style={inp('country')} value={form.country}
                  onChange={set('country')} onBlur={blur('country')} placeholder="AU" />
                <FErr k="country" />
              </div>
            </div>
          </>
        )}

        {schema.extraFields.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 4 }}>
              {f.address ? '4' : (f.givenName || f.dateOfBirth ? '3' : '2')}. Credential-Specific Details
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Additional information specific to this credential type.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {schema.extraFields.map(ef => (
                <div key={ef.key}>
                  <label style={label}>{ef.label}{ef.required ? ' *' : ''}</label>
                  <input
                    style={inputBase}
                    type={ef.type || 'text'}
                    value={extraForm[ef.key] || ''}
                    onChange={setExtra(ef.key)}
                    placeholder={ef.placeholder || ''}
                    required={ef.required}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 4 }}>
          Supporting Document <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 13 }}>(optional)</span>
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          Upload a supporting document (PDF, JPEG, PNG, or WebP — max 10 MB).
        </p>
        {!docFile ? (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '28px 16px', border: '2px dashed #d1d5db', borderRadius: 10,
            cursor: 'pointer', background: '#f9fafb' }}>
            <span style={{ fontSize: 28 }}>📄</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Click to choose a file</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>PDF · JPEG · PNG · WebP — up to 10 MB</span>
            <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            border: '1px solid #d1d5db', borderRadius: 8, background: '#f9fafb' }}>
            <span style={{ fontSize: 22 }}>{docFile.type === 'application/pdf' ? '📄' : '🖼️'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' }}>{docFile.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{(docFile.size / 1024).toFixed(0)} KB</div>
            </div>
            <button type="button" onClick={removeFile}
              style={{ background: 'none', border: 'none', color: '#dc2626',
                cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
          </div>
        )}
        {fileError && <div style={{ marginTop: 8, fontSize: 13, color: '#9b1c1c' }}>{fileError}</div>}


        {schema.needsFace && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 4 }}>
              📷 Face Photo *
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Take a selfie — your face will be embedded in the credential for biometric verification.
            </p>

            {!faceImage && !cameraActive && (
              <div style={{ border: '2px dashed #d1d5db', borderRadius: 10, background: '#f9fafb', overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 16px 20px' }}>
                  <span style={{ fontSize: 36 }}>📷</span>
                  <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>No photo taken yet</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Use your webcam or upload an existing photo</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #e5e7eb' }}>

                  <button type="button" onClick={startCamera}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '16px 12px', background: '#fff', border: 'none', borderRight: '1px solid #e5e7eb',
                      cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                    <span style={{ fontSize: 24 }}>📸</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1a56db' }}>Open Camera</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Take a live selfie</span>
                  </button>

                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '16px 12px', background: '#fff', cursor: faceUploading ? 'not-allowed' : 'pointer',
                    transition: 'background .15s' }}
                    onMouseEnter={e => { if (!faceUploading) (e.currentTarget as HTMLElement).style.background = '#f0fdf4' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                    {faceUploading
                      ? <><span style={{ fontSize: 24 }}>⏳</span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#059669' }}>Detecting face…</span>
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>Please wait</span></>
                      : <><span style={{ fontSize: 24 }}>🖼️</span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#059669' }}>Upload Photo</span>
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>JPEG · PNG · WebP</span></>
                    }
                    <input ref={faceFileRef} type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={handleFaceFileChange} disabled={faceUploading}
                      style={{ display: 'none' }} />
                  </label>
                </div>
                {(cameraError || faceUploadError) && (
                  <div style={{ padding: '10px 16px', background: '#fde8e8', borderTop: '1px solid #fca5a5',
                    fontSize: 13, color: '#9b1c1c', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span>⚠️</span>
                    <span>{cameraError || faceUploadError}</span>
                  </div>
                )}
              </div>
            )}

            {cameraActive && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <video ref={videoRef} autoPlay muted playsInline
                    style={{ width: 280, height: 280, borderRadius: 12, objectFit: 'cover',
                      border: `3px solid ${detectingLive ? '#94a3b8' : faceDetected ? '#059669' : '#ef4444'}`,
                      background: '#000', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 20,
                    padding: '4px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    {detectingLive ? <><span style={{ opacity: 0.7 }}>⏳</span> Detecting…</>
                      : faceDetected ? <><span>✅</span> Face detected — ready to capture</>
                        : <><span>❌</span> No face detected — look at the camera</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={capturePhoto} disabled={!faceDetected}
                    style={{ padding: '9px 24px',
                      background: faceDetected ? '#059669' : '#d1d5db',
                      color: faceDetected ? '#fff' : '#9ca3af',
                      border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14,
                      cursor: faceDetected ? 'pointer' : 'not-allowed' }}>
                    Take Photo
                  </button>
                  <button type="button" onClick={() => {
                    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
                    streamRef.current?.getTracks().forEach(t => t.stop())
                    setCameraActive(false)
                  }} style={{ padding: '9px 16px', background: '#f9fafb', color: '#374151',
                    border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {faceImage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                border: '1px solid #d1fae5', borderRadius: 10, background: '#f0fdf4' }}>
                <img src={faceImage} alt="Captured face"
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid #059669' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#065f46' }}>Face photo captured ✓</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>160 × 160 px · JPEG</div>
                </div>
                <button type="button" onClick={retakePhoto}
                  style={{ padding: '7px 14px', background: '#fff', color: '#374151',
                    border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                  Re-select
                </button>
              </div>
            )}
          </>
        )}


        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <canvas ref={detectCanvasRef} style={{ display: 'none' }} />

        {submitError && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#fde8e8',
            color: '#9b1c1c', borderRadius: 7, fontSize: 13 }}>{submitError}</div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button"
            onClick={() => isEdit ? nav(`/applications/${editId}`) : nav('/dashboard')}
            style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8,
              background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '10px 24px',
            background: loading ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none',
            borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? (isEdit ? 'Saving…' : 'Submitting…') : (isEdit ? 'Save Changes' : 'Submit Application')}
          </button>
        </div>
      </form>
    </Layout>
  )
}
