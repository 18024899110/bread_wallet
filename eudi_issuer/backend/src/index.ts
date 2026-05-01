import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { ensureAdminAccount } from './db'
import { getOrCreateKeys } from './keys'
import authRouter from './routes/auth'
import applicationsRouter from './routes/applications'
import adminRouter from './routes/admin'

const app = express()
const PORT = Number(process.env.PORT || 4000)
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000'

app.use(cors({ origin: [FRONTEND, 'http://localhost:3000', 'http://localhost:5173'], credentials: true }))

app.use('/api/face', express.json({ limit: '10mb' }))
app.use(express.json({ limit: '1mb' }))

app.use('/api/auth', authRouter)
app.use('/api/applications', applicationsRouter)
app.use('/api/admin', adminRouter)
app.get('/health', (_req, res) => res.json({ status: 'ok' }))


const FACE_SERVICE = (process.env.FACE_SERVICE_URL || 'http://localhost:5010').replace(/\/$/, '')
app.post('/api/face/detect', async (req, res) => {
  try {
    const r = await fetch(`${FACE_SERVICE}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(8000),
    })
    const data = await r.json()
    res.status(r.ok ? 200 : 502).json(data)
  } catch (err: any) {
    res.status(502).json({ face_detected: false, error: `Face service unavailable: ${err.message}` })
  }
})

app.post('/api/face/compare', async (req, res) => {
  try {
    const r = await fetch(`${FACE_SERVICE}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(10000),
    })
    const data = await r.json()
    res.status(r.ok ? 200 : 502).json(data)
  } catch (err: any) {
    res.status(502).json({ match: false, error: `Face service unavailable: ${err.message}` })
  }
})

async function main() {
  const keys = await getOrCreateKeys()
  await ensureAdminAccount()

  app.listen(PORT, () => {
    console.log('')
    console.log('  ╔══════════════════════════════════════╗')
    console.log('  ║        EUDI Issuer Backend           ║')
    console.log('  ╚══════════════════════════════════════╝')
    console.log('')
    console.log(`  API         →  http://localhost:${PORT}/api`)
    console.log(`  Frontend    →  ${FRONTEND}`)
    console.log(`  Issuer DID  →  ${keys.did}`)
    console.log(`  Admin       →  ${process.env.ADMIN_EMAIL || 'admin@eudi.demo'}`)
    console.log('')
  })
}

main().catch(err => { console.error(err); process.exit(1) })
