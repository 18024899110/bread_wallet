import { Router, Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import db from '../db'
import { requireAuth } from '../middleware/auth'
import { upload } from '../upload'

const router = Router()

export const ALL_CRED_TYPES = [
  'NationalID', 'mDL', 'AddressCredential', 'ProofOfAge',
  'HealthInsuranceCard', 'StudentID', 'VehicleRegistration', 'ProfessionalLicense',
  'PassportCredential', 'SocialSecurityCredential', 'BankAccountCredential',
  'EmploymentCredential', 'VaccinationCredential', 'DisabilityCredential',
]

const TYPE_REQS: Record<string, { needsName: boolean; needsDob: boolean; needsDocNumber: boolean }> = {
  NationalID:              { needsName: true,  needsDob: true,  needsDocNumber: true },
  mDL:                     { needsName: true,  needsDob: true,  needsDocNumber: true },
  AddressCredential:       { needsName: true,  needsDob: false, needsDocNumber: false },
  ProofOfAge:              { needsName: false, needsDob: true,  needsDocNumber: false },
  HealthInsuranceCard:     { needsName: true,  needsDob: true,  needsDocNumber: true },
  StudentID:               { needsName: true,  needsDob: true,  needsDocNumber: true },
  VehicleRegistration:     { needsName: true,  needsDob: false, needsDocNumber: true },
  ProfessionalLicense:     { needsName: true,  needsDob: false, needsDocNumber: true },
  PassportCredential:      { needsName: true,  needsDob: true,  needsDocNumber: true },
  SocialSecurityCredential:{ needsName: true,  needsDob: true,  needsDocNumber: true },
  BankAccountCredential:   { needsName: true,  needsDob: false, needsDocNumber: true },
  EmploymentCredential:    { needsName: true,  needsDob: false, needsDocNumber: false },
  VaccinationCredential:   { needsName: true,  needsDob: true,  needsDocNumber: false },
  DisabilityCredential:    { needsName: true,  needsDob: true,  needsDocNumber: true },
}


const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]{2,100}$/
const DOC_RE = /^[A-Za-z0-9\-]{2,40}$/
const POSTAL_RE = /^[A-Za-z0-9]{3,10}$/
const COUNTRY_RE = /^[A-Za-z]{2,3}$/
const NATIONALITY_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]{2,50}$/
const LOCALITY_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]{0,100}$/

function validateFields(body: Record<string, string>, type: string): string | null {
  const req = TYPE_REQS[type] || { needsName: true, needsDob: true, needsDocNumber: true }

  if (req.needsName) {
    if (!NAME_RE.test(body.given_name))
      return 'First name must contain only letters, spaces, hyphens, or apostrophes (2–100 chars).'
    if (!NAME_RE.test(body.family_name))
      return 'Last name must contain only letters, spaces, hyphens, or apostrophes (2–100 chars).'
  }

  if (req.needsDob) {
    const dob = new Date(body.date_of_birth)
    if (isNaN(dob.getTime()) || dob >= new Date())
      return 'Date of birth must be a valid date in the past.'
    if ((Date.now() - dob.getTime()) / 86400000 > 365.25 * 120)
      return 'Date of birth indicates an age over 120 years — please check the date.'
  }

  if (req.needsDocNumber && body.document_number && !DOC_RE.test(body.document_number))
    return 'Document / reference number must be 2–40 alphanumeric characters (hyphens allowed).'

  const h = Number(body.height)
  if (body.height && (!Number.isInteger(h) || h < 50 || h > 300))
    return 'Height must be a whole number between 50 and 300 cm.'

  if (body.postal_code && !POSTAL_RE.test(body.postal_code))
    return 'Postal code must be 3–10 alphanumeric characters.'
  if (body.country && !COUNTRY_RE.test(body.country))
    return 'Country must be a 2–3 letter ISO country code (e.g. AU, USA).'
  if (body.nationality && !NATIONALITY_RE.test(body.nationality))
    return 'Nationality must contain only letters and spaces (2–50 characters).'
  if (body.street_address && body.street_address.length > 200)
    return 'Street address must not exceed 200 characters.'
  if (body.locality && !LOCALITY_RE.test(body.locality))
    return 'City/Suburb must contain only letters, spaces, or hyphens (max 100 chars).'
  if (body.region && !LOCALITY_RE.test(body.region))
    return 'State/Region must contain only letters, spaces, or hyphens (max 100 chars).'

  return null
}

function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('document')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` })
    }
    if (err) {
      return res.status(400).json({ error: err.message ?? 'File upload failed' })
    }
    next()
  })
}

router.post('/', requireAuth, handleUpload, (req: Request, res: Response) => {
  const {
    credential_type,
    given_name = '', family_name = '', date_of_birth = '', document_number = '',
    street_address = '', locality = '', region = '', postal_code = '',
    country = 'AU', nationality = 'Australian', sex = 'M', height = '175',
    face_image = '', extra_data = '{}',
  } = req.body

  if (!credential_type) {
    return res.status(400).json({ error: 'credential_type is required' })
  }
  if (!ALL_CRED_TYPES.includes(credential_type)) {
    return res.status(400).json({ error: `credential_type must be one of: ${ALL_CRED_TYPES.join(', ')}` })
  }

  const validationError = validateFields({
    given_name, family_name, date_of_birth, document_number,
    height, postal_code, country, nationality, street_address, locality, region,
  }, credential_type)
  if (validationError) return res.status(400).json({ error: validationError })

  // Validate extra_data is valid JSON
  let parsedExtra: Record<string, unknown> = {}
  try { parsedExtra = JSON.parse(extra_data || '{}') } catch {
    return res.status(400).json({ error: 'extra_data must be valid JSON' })
  }

  const file = (req as any).file as Express.Multer.File | undefined

  const id = uuidv4()
  db.prepare(`
    INSERT INTO applications
      (id, user_id, credential_type, given_name, family_name, date_of_birth, document_number,
       street_address, locality, region, postal_code, country, nationality, sex, height,
       doc_file_name, doc_file_path, doc_mime_type, face_image, extra_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.user!.userId, credential_type, given_name, family_name, date_of_birth, document_number,
    street_address, locality, region, postal_code, country, nationality, sex, Number(height) || 175,
    file?.originalname ?? '',
    file?.path ?? '',
    file?.mimetype ?? '',
    face_image,
    JSON.stringify(parsedExtra),
  )

  res.status(201).json({ id, status: 'pending', credential_type })
})

router.get('/', requireAuth, (req: Request, res: Response) => {
  const apps = db.prepare(`
    SELECT id, credential_type, status, given_name, family_name,
           email_sent, email_sent_at, admin_note, created_at, reviewed_at,
           doc_file_name
    FROM applications WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user!.userId)
  res.json(apps)
})

router.get('/:id', requireAuth, (req: Request, res: Response) => {
  const app = db.prepare(
    `SELECT * FROM applications WHERE id = ? AND user_id = ?`
  ).get(req.params.id, req.user!.userId) as any
  if (!app) return res.status(404).json({ error: 'Application not found' })
  res.json(app)
})

router.put('/:id', requireAuth, handleUpload, (req: Request, res: Response) => {
  const app = db.prepare(
    `SELECT * FROM applications WHERE id = ? AND user_id = ?`
  ).get(req.params.id, req.user!.userId) as any
  if (!app) return res.status(404).json({ error: 'Application not found' })
  if (!['pending', 'rejected'].includes(app.status)) {
    return res.status(400).json({ error: 'Only pending or rejected applications can be updated' })
  }

  const {
    given_name = app.given_name, family_name = app.family_name,
    date_of_birth = app.date_of_birth, document_number = app.document_number,
    street_address = app.street_address, locality = app.locality,
    region = app.region, postal_code = app.postal_code,
    country = app.country, nationality = app.nationality,
    sex = app.sex, height = String(app.height),
    face_image = '', extra_data = '{}',
  } = req.body

  const validationError = validateFields({
    given_name, family_name, date_of_birth, document_number,
    height, postal_code, country, nationality, street_address, locality, region,
  }, app.credential_type)
  if (validationError) return res.status(400).json({ error: validationError })

  let parsedExtra: Record<string, unknown> = {}
  try { parsedExtra = JSON.parse(extra_data || '{}') } catch {
    return res.status(400).json({ error: 'extra_data must be valid JSON' })
  }

  const file = (req as any).file as Express.Multer.File | undefined

  db.prepare(`
    UPDATE applications SET
      given_name = ?, family_name = ?, date_of_birth = ?, document_number = ?,
      street_address = ?, locality = ?, region = ?, postal_code = ?,
      country = ?, nationality = ?, sex = ?, height = ?,
      face_image = CASE WHEN ? != '' THEN ? ELSE face_image END,
      doc_file_name = CASE WHEN ? != '' THEN ? ELSE doc_file_name END,
      doc_file_path = CASE WHEN ? != '' THEN ? ELSE doc_file_path END,
      doc_mime_type = CASE WHEN ? != '' THEN ? ELSE doc_mime_type END,
      extra_data = ?,
      status = 'pending',
      admin_note = ''
    WHERE id = ?
  `).run(
    given_name, family_name, date_of_birth, document_number,
    street_address, locality, region, postal_code,
    country, nationality, sex, Number(height) || 175,
    face_image, face_image,
    file?.originalname ?? '', file?.originalname ?? '',
    file?.path ?? '', file?.path ?? '',
    file?.mimetype ?? '', file?.mimetype ?? '',
    JSON.stringify(parsedExtra),
    req.params.id,
  )

  res.json({ ok: true, status: 'pending' })
})


router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const app = db.prepare(
    `SELECT * FROM applications WHERE id = ? AND user_id = ?`
  ).get(req.params.id, req.user!.userId) as any
  if (!app) return res.status(404).json({ error: 'Application not found' })
  if (!['pending', 'rejected'].includes(app.status)) {
    return res.status(400).json({ error: 'Only pending or rejected applications can be deleted' })
  }

  if (app.doc_file_path) {
    const fs = require('fs') as typeof import('fs')
    try { fs.unlinkSync(app.doc_file_path) } catch {}
  }
  db.prepare(`DELETE FROM applications WHERE id = ?`).run(req.params.id)
  res.json({ ok: true })
})

router.post('/bind-did', (req: Request, res: Response) => {
  const { pre_auth_code, holder_did } = req.body
  if (!pre_auth_code || !holder_did) {
    return res.status(400).json({ error: 'pre_auth_code and holder_did required' })
  }

  const apps = db.prepare(
    `SELECT id FROM applications WHERE status = 'approved' AND offer_url LIKE ?`
  ).all(`%${pre_auth_code}%`) as any[]

  if (!apps.length) {
    return res.status(404).json({ error: 'No matching offer found for this code' })
  }

  for (const app of apps) {
    db.prepare(
      `UPDATE issued_credentials SET holder_did = ? WHERE application_id = ?`
    ).run(holder_did, app.id)
  }

  res.json({ ok: true })
})

export default router
