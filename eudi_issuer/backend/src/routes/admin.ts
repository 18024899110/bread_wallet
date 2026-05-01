import { Router, Request, Response } from 'express'
import db from '../db'
import { requireAdmin } from '../middleware/auth'
import { getOrCreateKeys } from '../keys'
import { createOffer, pingWaltid } from '../waltid'
import { sendCredentialOfferEmail } from '../email'

const router = Router()


router.get('/applications', requireAdmin, (_req: Request, res: Response) => {
  const apps = db.prepare(`
    SELECT a.*, u.email as user_email
    FROM applications a JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
  `).all()
  res.json(apps)
})

router.post('/applications/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  const app = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(req.params.id) as any
  if (!app) return res.status(404).json({ error: 'Application not found' })
  if (app.status === 'approved') return res.status(400).json({ error: 'Already approved' })

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(app.user_id) as any
  if (!user) return res.status(500).json({ error: 'User not found' })

  try {
    const keys = await getOrCreateKeys()
    const offerUrl = await createOffer(keys, app.credential_type, app)

    db.prepare(`
      UPDATE applications
      SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ?,
          offer_url = ?, admin_note = ?
      WHERE id = ?
    `).run(req.user!.email, offerUrl, req.body.note ?? '', app.id)

    const { v4: uuidv4 } = await import('uuid')
    db.prepare(`
      INSERT INTO issued_credentials (id, application_id, user_id, credential_type)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), app.id, app.user_id, app.credential_type)

    await sendCredentialOfferEmail({
      toEmail: user.email,
      toName: `${app.given_name} ${app.family_name}`,
      credentialType: app.credential_type,
      offerUrl,
    })

    db.prepare(`UPDATE applications SET email_sent = 1, email_sent_at = datetime('now') WHERE id = ?`)
      .run(app.id)

    res.json({ ok: true, offer_url: offerUrl, email_sent_to: user.email })
  } catch (err: any) {
    console.error('Approval failed:', err)
    res.status(502).json({ error: err.message })
  }
})

router.post('/applications/:id/resend', requireAdmin, async (req: Request, res: Response) => {
  const app = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(req.params.id) as any
  if (!app) return res.status(404).json({ error: 'Application not found' })
  if (app.status !== 'approved') return res.status(400).json({ error: 'Application is not approved' })

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(app.user_id) as any
  if (!user) return res.status(500).json({ error: 'User not found' })

  try {
    const keys = await getOrCreateKeys()
    const offerUrl = await createOffer(keys, app.credential_type, app)
    db.prepare(`UPDATE applications SET offer_url = ? WHERE id = ?`).run(offerUrl, app.id)
    await sendCredentialOfferEmail({
      toEmail: user.email,
      toName: `${app.given_name} ${app.family_name}`,
      credentialType: app.credential_type,
      offerUrl,
    })
    db.prepare(`UPDATE applications SET email_sent = 1, email_sent_at = datetime('now') WHERE id = ?`)
      .run(app.id)
    res.json({ ok: true, offer_url: offerUrl, email_sent_to: user.email })
  } catch (err: any) {
    console.error('Resend failed:', err)
    res.status(502).json({ error: err.message })
  }
})

router.post('/applications/:id/reissue', requireAdmin, async (req: Request, res: Response) => {
  const app = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(req.params.id) as any
  if (!app) return res.status(404).json({ error: 'Application not found' })
  if (app.status === 'pending') return res.status(400).json({ error: 'Application is still pending — use approve instead' })

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(app.user_id) as any
  if (!user) return res.status(500).json({ error: 'User not found' })

  try {
    const keys = await getOrCreateKeys()
    const offerUrl = await createOffer(keys, app.credential_type, app)
    db.prepare(`
      UPDATE applications
      SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ?,
          offer_url = ?, admin_note = ?, email_sent = 0
      WHERE id = ?
    `).run(req.user!.email, offerUrl, req.body.note ?? app.admin_note ?? '', app.id)
    await sendCredentialOfferEmail({
      toEmail: user.email,
      toName: `${app.given_name} ${app.family_name}`,
      credentialType: app.credential_type,
      offerUrl,
    })
    db.prepare(`UPDATE applications SET email_sent = 1, email_sent_at = datetime('now') WHERE id = ?`)
      .run(app.id)
    res.json({ ok: true, offer_url: offerUrl, email_sent_to: user.email })
  } catch (err: any) {
    console.error('Re-issue failed:', err)
    res.status(502).json({ error: err.message })
  }
})

router.post('/applications/:id/reject', requireAdmin, (req: Request, res: Response) => {
  const app = db.prepare(`SELECT id FROM applications WHERE id = ?`).get(req.params.id)
  if (!app) return res.status(404).json({ error: 'Application not found' })
  db.prepare(`
    UPDATE applications
    SET status = 'rejected', reviewed_at = datetime('now'),
        reviewed_by = ?, admin_note = ?
    WHERE id = ?
  `).run(req.user!.email, req.body.note ?? '', req.params.id)
  res.json({ ok: true })
})

router.get('/applications/:id', requireAdmin, (req: Request, res: Response) => {
  const app = db.prepare(`
    SELECT a.*, u.email as user_email
    FROM applications a JOIN users u ON a.user_id = u.id
    WHERE a.id = ?
  `).get(req.params.id)
  if (!app) return res.status(404).json({ error: 'Application not found' })
  res.json(app)
})

router.get('/applications/:id/document', requireAdmin, (req: Request, res: Response) => {
  const app = db.prepare(`
    SELECT doc_file_path, doc_mime_type, doc_file_name FROM applications WHERE id = ?
  `).get(req.params.id) as any
  if (!app) return res.status(404).json({ error: 'Application not found' })
  if (!app.doc_file_path) return res.status(404).json({ error: 'No document attached' })
  res.setHeader('Content-Type', app.doc_mime_type || 'application/octet-stream')
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(app.doc_file_name)}"`)
  res.sendFile(app.doc_file_path, (err) => {
    if (err && !res.headersSent) res.status(500).json({ error: 'Failed to serve file' })
  })
})


router.get('/users', requireAdmin, (req: Request, res: Response) => {
  const { search } = req.query
  let sql = `
    SELECT u.id, u.email, u.role, u.given_name, u.family_name, u.created_at,
           COUNT(a.id) as application_count
    FROM users u
    LEFT JOIN applications a ON a.user_id = u.id
  `
  const params: string[] = []
  if (search) {
    sql += ` WHERE u.email LIKE ? OR u.given_name LIKE ? OR u.family_name LIKE ?`
    const q = `%${search}%`
    params.push(q, q, q)
  }
  sql += ` GROUP BY u.id ORDER BY u.created_at DESC`
  const users = db.prepare(sql).all(...params)
  res.json(users)
})

router.get('/users/:id', requireAdmin, (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT id, email, role, given_name, family_name, created_at FROM users WHERE id = ?
  `).get(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

router.put('/users/:id', requireAdmin, (req: Request, res: Response) => {
  const user = db.prepare(`SELECT id, role FROM users WHERE id = ?`).get(req.params.id) as any
  if (!user) return res.status(404).json({ error: 'User not found' })

  const { role, given_name, family_name, email } = req.body
  const updates: string[] = []
  const vals: unknown[] = []

  if (role && ['user', 'admin'].includes(role)) { updates.push('role = ?'); vals.push(role) }
  if (given_name !== undefined) { updates.push('given_name = ?'); vals.push(given_name) }
  if (family_name !== undefined) { updates.push('family_name = ?'); vals.push(family_name) }
  if (email) {
    // Check uniqueness
    const existing = db.prepare(`SELECT id FROM users WHERE email = ? AND id != ?`).get(email.toLowerCase(), req.params.id)
    if (existing) return res.status(409).json({ error: 'Email already in use' })
    updates.push('email = ?'); vals.push(email.toLowerCase())
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' })
  vals.push(req.params.id)
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
  res.json({ ok: true })
})

router.delete('/users/:id', requireAdmin, (req: Request, res: Response) => {
  const user = db.prepare(`SELECT id, email FROM users WHERE id = ?`).get(req.params.id) as any
  if (!user) return res.status(404).json({ error: 'User not found' })

  // Prevent deleting own account
  if (user.id === (req as any).user?.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }

  db.prepare(`DELETE FROM issued_credentials WHERE user_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM applications WHERE user_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id)
  res.json({ ok: true })
})

router.get('/users/:id/applications', requireAdmin, (req: Request, res: Response) => {
  const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const apps = db.prepare(`
    SELECT a.*, u.email as user_email
    FROM applications a JOIN users u ON a.user_id = u.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).all(req.params.id)
  res.json(apps)
})

router.get('/stats', requireAdmin, (_req: Request, res: Response) => {
  const total = (db.prepare(`SELECT COUNT(*) as c FROM applications`).get() as any).c
  const pending = (db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status = 'pending'`).get() as any).c
  const approved = (db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status = 'approved'`).get() as any).c
  const users = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'user'`).get() as any).c
  res.json({ total, pending, approved, users })
})

router.get('/waltid-status', requireAdmin, async (_req: Request, res: Response) => {
  const ok = await pingWaltid()
  res.json({ connected: ok, url: process.env.WALTID_ISSUER_URL || 'http://localhost:7002' })
})

export default router
