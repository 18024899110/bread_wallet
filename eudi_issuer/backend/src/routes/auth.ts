import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import db from '../db'
import { signToken } from '../middleware/auth'

const router = Router()

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'cyleonadm'

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, given_name, family_name, role, admin_key } = req.body
  if (!email || !password || !given_name || !family_name) {
    return res.status(400).json({ error: 'email, password, given_name, family_name required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const assignedRole = role === 'admin' ? 'admin' : 'user'
  if (assignedRole === 'admin') {
    if (!admin_key || admin_key !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret key.' })
    }
  }

  try {
    const hash = await bcrypt.hash(password, 10)
    const id = uuidv4()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, role, given_name, family_name) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, email.toLowerCase(), hash, assignedRole, given_name, family_name)
    const token = signToken({ userId: id, email: email.toLowerCase(), role: assignedRole })
    res.status(201).json({ token, user: { id, email, given_name, family_name, role: assignedRole } })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' })
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase()) as any
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  const token = signToken({ userId: user.id, email: user.email, role: user.role })
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

router.get('/me', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const jwt = require('jsonwebtoken')
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    res.json(payload)
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
