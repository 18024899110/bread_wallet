import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import verifyRouter from './routes/verify'

const app = express()
const PORT = Number(process.env.PORT || 5000)
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000'

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/verify', verifyRouter)
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`  API      →  http://localhost:${PORT}/api/verify`)
  console.log(`  Frontend →  ${FRONTEND}`)
  console.log('')
})
