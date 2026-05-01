import { Router, Request, Response } from 'express'
import QRCode from 'qrcode'
import {
  createPresentationRequest,
  getVerificationResult,
  SCENARIOS,
  ScenarioKey,
} from '../waltid'

const router = Router()


const sessions = new Map<string, { scenario: ScenarioKey; result: any }>()


router.post('/start', async (req: Request, res: Response) => {
  const { scenario } = req.body as { scenario?: ScenarioKey }
  if (!scenario || !(scenario in SCENARIOS)) {
    return res.status(400).json({ error: `Unknown scenario: ${scenario}` })
  }

  try {
    const session = await createPresentationRequest(scenario)
    sessions.set(session.id, { scenario, result: null })

    const qrDataUrl = await QRCode.toDataURL(session.requestUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    })

    res.json({
      sessionId: session.id,
      requestUrl: session.requestUrl,
      qr: qrDataUrl,
      scenario: SCENARIOS[scenario],
    })
  } catch (err: any) {
    console.error('[verify] start error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/status/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params
  const sess = sessions.get(sessionId)
  if (!sess) return res.status(404).json({ error: 'Session not found' })

  if (sess.result) return res.json(sess.result)

  try {
    const result = await getVerificationResult(sessionId, sess.scenario)
    if (result.state !== 'pending') {
      sess.result = result
      sessions.set(sessionId, sess)
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ state: 'error', error: err.message })
  }
})


router.post('/callback', async (req: Request, res: Response) => {
  const body = req.body as any
  console.log('[verify] callback received, state:', body.state || body.session_id)


  const state = body.state || body.session_id || ''
  if (state && sessions.has(state)) {

    const sess = sessions.get(state)!
    sessions.set(state, { ...sess, result: null }) // will be fetched fresh
  }

  res.status(200).send('ok')
})

router.post('/face-check', async (req: Request, res: Response) => {
  const { sessionId, livePhoto } = req.body as { sessionId?: string; livePhoto?: string }
  if (!sessionId || !livePhoto) {
    return res.status(400).json({ match: false, error: 'sessionId and livePhoto required' })
  }

  const sess = sessions.get(sessionId)
  if (!sess?.result) {
    return res.status(404).json({ match: false, error: 'Session not found or not yet verified' })
  }

  const portrait = sess.result.subject?.portrait as string | undefined
  if (!portrait) {

    return res.json({ match: true, skipped: true })
  }

  const faceServiceUrl = process.env.FACE_SERVICE_URL || 'http://localhost:5010'
  try {
    const r = await fetch(`${faceServiceUrl}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image1: portrait, image2: livePhoto }),
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      return res.status(502).json({ match: false, error: `Face service error: ${r.status}` })
    }
    const result = await r.json() as { match: boolean; cosine_score?: number; error?: string }
    return res.json(result)
  } catch (err: any) {
    return res.status(502).json({ match: false, error: `Face service unreachable: ${err.message}` })
  }
})

router.get('/scenarios', (_req: Request, res: Response) => {
  res.json(SCENARIOS)
})

export default router
