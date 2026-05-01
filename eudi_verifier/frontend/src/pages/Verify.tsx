import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import s from './Verify.module.css'

type Status = 'loading' | 'ready' | 'pending' | 'face' | 'success' | 'error'

interface SessionData {
  sessionId: string
  qr: string
  requestUrl: string
  scenario: { label: string; description: string; credentialType: string }
}

const SCENARIO_META: Record<string, { icon: string; color: string; title: string }> = {
  bank:         { icon: '🏦', color: '#1a56db', title: 'Bank Onboarding' },
  border:       { icon: '✈️', color: '#059669', title: 'Border Check' },
  driving:      { icon: '🚗', color: '#d97706', title: 'Driving Licence Check' },
  address:      { icon: '🏠', color: '#7e3af2', title: 'Address Verification' },
  healthcare:   { icon: '🏥', color: '#e11d48', title: 'Healthcare Access' },
  student:      { icon: '🎓', color: '#0891b2', title: 'Student Discount' },
  vehicle:      { icon: '🚘', color: '#64748b', title: 'Vehicle Registration' },
  professional: { icon: '👔', color: '#0f766e', title: 'Professional Licence' },
  passport:     { icon: '🛂', color: '#1d4ed8', title: 'Passport Verification' },
  social:       { icon: '🔒', color: '#6b21a8', title: 'Social Security' },
  banking:      { icon: '💳', color: '#15803d', title: 'Bank Account Verification' },
  employment:   { icon: '💼', color: '#b45309', title: 'Employment Verification' },
  vaccination:  { icon: '💉', color: '#0369a1', title: 'Vaccination Certificate' },
  disability:   { icon: '♿', color: '#9f1239', title: 'Disability Credential' },
}

export default function Verify() {
  const { scenario } = useParams<{ scenario: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [session, setSession] = useState<SessionData | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)


  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [faceCapturing, setFaceCapturing] = useState(false)
  const [faceError, setFaceError] = useState('')
  const [faceChecking, setFaceChecking] = useState(false)
  const [timeLeft, setTimeLeft] = useState(240)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const meta = SCENARIO_META[scenario || ''] || { icon: '🛡️', color: '#1a56db', title: 'Verification' }

  useEffect(() => {
    startSession()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [scenario])


  useEffect(() => {
    if (faceCapturing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [faceCapturing])

  async function startSession() {
    setStatus('loading')
    setResult(null)
    setError('')
    setFaceError('')
    stopCamera()
    try {
      const res = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      })
      if (!res.ok) throw new Error((await res.json()).error || `Error ${res.status}`)
      const data = await res.json() as SessionData
      setSession(data)
      setStatus('ready')
      startPolling(data.sessionId)
      startCountdown()
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  function startCountdown() {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setTimeLeft(240)
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          startSession()
          return 240
        }
        return prev - 1
      })
    }, 1000)
  }

  function startPolling(sessionId: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/verify/status/${encodeURIComponent(sessionId)}`)
        if (!res.ok) return
        const data = await res.json() as { state: string; subject?: Record<string, unknown>; error?: string }
        if (data.state === 'success') {
          clearInterval(pollRef.current!)
          setResult(data.subject || {})

          if (data.subject?.portrait) {
            setStatus('face')
          } else {
            setStatus('success')
          }
        } else if (data.state === 'error') {
          clearInterval(pollRef.current!)
          setError(data.error || 'Verification failed')
          setStatus('error')
        }
      } catch {}
    }, 2000)
  }



  async function openCamera() {
    setFaceError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setFaceCapturing(true)
    } catch {
      setFaceError('Could not access camera. Please allow camera permission.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setFaceCapturing(false)
  }

  async function captureAndVerify() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !session) return

    canvas.width = 320
    canvas.height = 320
    canvas.getContext('2d')!.drawImage(video, 0, 0, 320, 320)
    const livePhoto = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()
    setFaceChecking(true)
    setFaceError('')

    try {
      const res = await fetch('/api/verify/face-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, livePhoto }),
      })
      const data = await res.json() as { match: boolean; skipped?: boolean; error?: string; cosine_score?: number }

      if (data.match || data.skipped) {
        setStatus('success')
      } else {
        setFaceError(data.error || 'Face does not match the credential portrait. Access denied.')
      }
    } catch (err: any) {
      setFaceError(`Face check failed: ${err.message}`)
    } finally {
      setFaceChecking(false)
    }
  }



  function formatKey(key: string) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).replace(/_/g, ' ')
  }

  function formatValue(v: unknown): string {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'boolean') return v ? 'Yes' : 'No'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  const SKIP_KEYS = new Set(['id', 'portrait'])

  return (
    <div className={s.page}>
      <header className={s.header} style={{ background: meta.color }}>
        <div className={s.headerInner}>
          <button className={s.back} onClick={() => navigate('/')}>← Back</button>
          <div className={s.headerTitle}>
            <span>{meta.icon}</span>
            <div>
              <div className={s.titleText}>{meta.title}</div>
              <div className={s.titleSub}>OID4VP Credential Verification</div>
            </div>
          </div>
        </div>
      </header>

      <main className={s.main}>

        {}
        {status === 'loading' && (
          <div className={s.centered}>
            <div className={s.spinner} />
            <p className={s.hint}>Generating presentation request…</p>
          </div>
        )}

        {}
        {(status === 'ready' || status === 'pending') && session && (
          <div className={s.qrSection}>
            <div className={s.qrCard}>
              <img src={session.qr} alt="QR Code" className={s.qrImage} />
              <div className={s.scanHint}>
                <span className={s.pulseIcon}>📱</span>
                Scan with your EUDI Wallet
              </div>
            </div>
            <div className={s.infoPanel}>
              <div className={s.infoTitle}>Requesting credential</div>
              <div className={s.credTypePill} style={{ borderColor: meta.color, color: meta.color }}>
                {session.scenario.credentialType}
              </div>
              <p className={s.infoDesc}>{session.scenario.description}</p>
              <div className={s.waitBox}>
                <div className={s.waitDots}><span /><span /><span /></div>
                <span>Waiting for wallet response…</span>
              </div>
              <div className={s.steps}>
                <div className={s.stepItem}><span className={s.stepDone}>✓</span><span>Presentation request created</span></div>
                <div className={s.stepItem}><span className={s.stepActive}>→</span><span>Waiting for wallet to scan</span></div>
                <div className={s.stepItem}><span className={s.stepPending}>○</span><span>Face biometric verification</span></div>
                <div className={s.stepItem}><span className={s.stepPending}>○</span><span>Display result</span></div>
              </div>
              <div style={{ fontSize: 12, color: timeLeft <= 30 ? '#e11d48' : '#94a3b8', marginTop: 8, textAlign: 'center' }}>
                QR refreshes in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
              <button className={s.resetBtn} onClick={startSession}>↺ Generate new QR</button>
            </div>
          </div>
        )}

        {}
        {status === 'face' && (
          <div className={s.resultSection}>
            <div className={s.resultCard}>
              <div className={s.resultIcon} style={{ background: '#dbeafe', fontSize: 28 }}>🪪</div>
              <h2 className={s.resultTitle}>Face Verification Required</h2>
              <p className={s.resultSub}>
                Credential verified. Now confirm your identity with a live face scan.
              </p>

              {!faceCapturing && !faceChecking && (
                <button onClick={openCamera}
                  style={{ padding: '10px 24px', background: meta.color, color: '#fff',
                    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer',
                    marginTop: 8 }}>
                  📷 Open Camera
                </button>
              )}

              {faceCapturing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                  <video ref={videoRef} autoPlay muted playsInline
                    style={{ width: 260, height: 260, borderRadius: 12, objectFit: 'cover',
                      border: `3px solid ${meta.color}`, background: '#000' }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={captureAndVerify}
                      style={{ padding: '9px 22px', background: '#059669', color: '#fff',
                        border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                      Capture & Verify
                    </button>
                    <button onClick={stopCamera}
                      style={{ padding: '9px 14px', background: '#f1f5f9', color: '#475569',
                        border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {faceChecking && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div className={s.spinner} />
                  <p className={s.hint}>Comparing face…</p>
                </div>
              )}

              {faceError && (
                <div style={{ width: '100%', marginTop: 8 }}>
                  <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626',
                    borderRadius: 8, fontSize: 14, textAlign: 'center' }}>{faceError}</div>
                  <button onClick={() => { setFaceError(''); openCamera() }}
                    style={{ marginTop: 10, width: '100%', padding: '9px', background: '#f1f5f9',
                      border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                    ↺ Try Again
                  </button>
                  <button onClick={startSession}
                    style={{ marginTop: 6, width: '100%', padding: '9px', background: '#fff',
                      border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13,
                      color: '#6b7280', cursor: 'pointer' }}>
                    Start Over
                  </button>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        {}
        {status === 'success' && result && (
          <div className={s.resultSection}>
            <div className={s.resultCard}>
              {}
              {result.portrait && typeof result.portrait === 'string' && (
                <img src={result.portrait as string} alt="Credential portrait"
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid #059669', marginBottom: 4 }} />
              )}
              <div className={s.resultIcon} style={{ background: '#dcfce7' }}>✅</div>
              <h2 className={s.resultTitle}>Identity Verified</h2>
              <p className={s.resultSub}>Credential and face biometric verified successfully.</p>

              <div className={s.claimsTable}>
                {Object.entries(result)
                  .filter(([k]) => !SKIP_KEYS.has(k))
                  .map(([key, val]) => (
                    <div key={key} className={s.claimRow}>
                      <span className={s.claimKey}>{formatKey(key)}</span>
                      <span className={s.claimVal}>{formatValue(val)}</span>
                    </div>
                  ))
                }
              </div>

              <div className={s.verifiedBadge} style={{ background: meta.color }}>
                ✓ {meta.title} — Access Granted
              </div>

              <button className={s.resetBtn} onClick={startSession} style={{ marginTop: 16 }}>
                ↺ New Verification
              </button>
            </div>
          </div>
        )}

        {}
        {status === 'error' && (
          <div className={s.centered}>
            <div className={s.resultIcon} style={{ background: '#fee2e2' }}>❌</div>
            <h2 className={s.resultTitle}>Verification Failed</h2>
            <p className={s.errorMsg}>{error}</p>
            <button className={s.resetBtn} onClick={startSession} style={{ marginTop: 20 }}>
              ↺ Try Again
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
