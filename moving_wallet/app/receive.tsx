// Receive credential from issuer — OID4VCI Pre-Auth flow UI
import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import { useWalletStore } from '@/store'
import { redeemCredentialOffer } from '@/issuerClient'
import { colors, spacing, radius, credentialMeta } from '@/theme'
import { StoredCredential } from '@/types'
import { config } from '@/config'

type Status = 'idle' | 'loading' | 'face' | 'face_checking' | 'face_failed' | 'success' | 'error'


function faceApiBase(credentialIssuer: string): string {
  try {
    const { hostname } = new URL(credentialIssuer)
    if (hostname !== 'waltid-issuer' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}`  // EC2 public IP, port 80 (nginx default)
    }
  } catch { /* ignore */ }
  return config.issuerBaseUrl.replace(/\/$/, '')  // local: auto-detected LAN IP
}

function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export default function ReceiveScreen() {
  const { pendingOffer, setPendingOffer, addCredential, removeCredential, walletSessionReady, initSession } = useWalletStore()
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [faceMsg, setFaceMsg] = useState('')
  const [faceSuccess, setFaceSuccess] = useState(false)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const storedCredRef = useRef<StoredCredential | null>(null)

  useEffect(() => {
    if (!pendingOffer) {
      router.replace('/(wallet)')
    }
  }, [pendingOffer])

  if (!pendingOffer) return null

  const meta = credentialMeta[pendingOffer.credentialType] ?? {
    label: pendingOffer.credentialType, color: colors.primary, icon: 'document',
  }

  async function handleAccept() {
    if (!pendingOffer) return
    setStatus('loading')
    setErrorMsg('')
    try {
      if (!walletSessionReady) await initSession()
      if (!useWalletStore.getState().walletSessionReady) {
        throw new Error('Cannot connect to the wallet service. Please check your internet connection.')
      }
      const stored = await redeemCredentialOffer(pendingOffer)
      const portrait = stored.credential.credentialSubject?.portrait as string | undefined

      if (portrait) {
        storedCredRef.current = stored
        if (!cameraPermission?.granted) await requestCameraPermission()
        setStatus('face')
      } else {
        await addCredential(stored)
        setStatus('success')
      }
    } catch (err: any) {
      const raw: string = err.message ?? ''
      const isExpired =
        raw.includes('expired') || raw.includes('invalid_grant') ||
        raw.includes('400') || raw.includes('401')
      setErrorMsg(
        isExpired
          ? 'This offer has expired or has already been used. Please contact the issuer to resend.'
          : raw || 'Failed to receive credential',
      )
      setStatus('error')
    }
  }

  async function handleCapture() {
    if (!cameraRef.current || !storedCredRef.current) return
    setStatus('face_checking')
    setFaceMsg('')
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 })
      if (!photo?.base64) throw new Error('Camera capture failed')

      const livePhoto = `data:image/jpeg;base64,${photo.base64}`
      const portrait = storedCredRef.current.credential.credentialSubject?.portrait as string

      const res = await fetchWithTimeout(
        `${faceApiBase(pendingOffer.credentialIssuer)}/api/face/compare`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image1: portrait, image2: livePhoto }),
        },
        12000,
      )
      const result = await res.json() as { match: boolean; skipped?: boolean; error?: string }

      if (result.match || result.skipped) {
        setFaceSuccess(true)
        await addCredential(storedCredRef.current)
        setStatus('success')
      } else {
        setFaceMsg('Face does not match the registered photo. Please try again.')
        setStatus('face_failed')
      }
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (msg.includes('Abort') || msg.includes('abort')) {
        setFaceMsg('Request timed out. Please check your connection and try again.')
      } else {
        setFaceMsg(`Verification failed: ${msg}`)
      }
      setStatus('face_failed')
    }
  }

  async function handleDecline() {

    const cred = storedCredRef.current
    const inFaceStep = status === 'face' || status === 'face_checking' || status === 'face_failed'
    if (cred && inFaceStep) {
      removeCredential(cred.localId).catch(() => {})
    }
    setPendingOffer(null)
    router.replace('/(wallet)')
  }

  function handleDone() {
    setPendingOffer(null)
    router.replace('/(wallet)')
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <View style={[s.iconCircle, { backgroundColor: '#def7ec' }]}>
            <Ionicons name="checkmark-circle" size={64} color="#057a55" />
          </View>
          <Text style={s.successTitle}>Credential Received!</Text>
          <Text style={s.successText}>
            Your {meta.label} has been verified and saved to your wallet.
          </Text>
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={handleDone}>
            <Text style={s.btnText}>Go to Wallet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }


  if (status === 'error') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <View style={[s.iconCircle, { backgroundColor: '#fde8e8' }]}>
            <Ionicons name="close-circle" size={64} color="#dc2626" />
          </View>
          <Text style={s.successTitle}>Something went wrong</Text>
          <Text style={s.successText}>{errorMsg}</Text>
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={() => setStatus('idle')}>
            <Text style={s.btnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={handleDecline}>
            <Text style={[s.btnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (status === 'face' || status === 'face_checking' || status === 'face_failed') {
    const checking = status === 'face_checking'
    const failed = status === 'face_failed'

    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>

        <View style={[s.header, { backgroundColor: failed ? '#dc2626' : '#1a56db' }]}>
          <Ionicons name={failed ? 'close-circle-outline' : 'scan-outline'} size={28} color="#fff" />
          <Text style={s.headerTitle}>{failed ? 'Verification Failed' : 'Face Verification'}</Text>
          <Text style={s.headerSub}>
            {failed
              ? 'Your face did not match the registered photo'
              : 'Position your face in the oval and tap Verify'}
          </Text>
        </View>


        <View style={s.cameraWrap}>
          {cameraPermission?.granted ? (
            <CameraView ref={cameraRef} style={s.camera} facing={'front' as CameraType} />
          ) : (
            <View style={s.cameraPlaceholder}>
              <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
              <Text style={s.cameraPlaceholderText}>Camera permission required</Text>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.primary, marginTop: spacing.md }]}
                onPress={requestCameraPermission}
              >
                <Text style={s.btnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}


          {cameraPermission?.granted && (
            <View style={s.faceGuide} pointerEvents="none">
              <View style={[
                s.faceOval,
                checking && s.faceOvalChecking,
                failed && s.faceOvalFailed,
                faceSuccess && s.faceOvalSuccess,
              ]} />
              <Text style={s.faceGuideText}>
                {checking ? 'Verifying…' : failed ? 'Try again' : 'Centre your face in the oval'}
              </Text>
            </View>
          )}


          {checking && (
            <View style={s.checkingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#fff" />
              <Text style={s.checkingText}>Verifying…</Text>
            </View>
          )}

          {faceSuccess && (
            <View style={[s.checkingOverlay, { backgroundColor: 'rgba(5,122,85,0.75)' }]} pointerEvents="none">
              <Ionicons name="checkmark-circle" size={64} color="#fff" />
              <Text style={s.checkingText}>Identity Verified!</Text>
            </View>
          )}
        </View>


        {failed && (
          <View style={s.failBox}>
            <Ionicons name="warning" size={22} color="#dc2626" />
            <Text style={s.failText}>{faceMsg}</Text>
          </View>
        )}


        <View style={s.actions}>
          <TouchableOpacity
            style={[s.btn, s.btnOutline]}
            onPress={handleDecline}
            disabled={checking || faceSuccess}
          >
            <Text style={[s.btnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          {cameraPermission?.granted && (
            <TouchableOpacity
              style={[s.btn, { backgroundColor: failed ? '#dc2626' : '#1a56db', flex: 1 },
                (checking || faceSuccess) && s.btnDisabled]}
              onPress={handleCapture}
              disabled={checking || faceSuccess}
            >
              {checking
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>{failed ? 'Try Again' : 'Verify'}</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView style={s.container}>
      <View style={[s.header, { backgroundColor: meta.color }]}>
        <Ionicons name={meta.icon as any} size={36} color="#fff" />
        <Text style={s.headerTitle}>Credential Offer</Text>
        <Text style={s.headerSub}>An issuer wants to add a credential to your wallet</Text>
      </View>

      <View style={s.body}>
        <View style={s.card}>
          <View style={s.cardRow}>
            <View style={[s.typeIcon, { backgroundColor: meta.color + '18' }]}>
              <Ionicons name={meta.icon as any} size={28} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>Credential Type</Text>
              <Text style={s.cardValue}>{meta.label}</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>Issuer</Text>
          <Text style={s.cardValue}>EUDI Demo Issuer</Text>
          <Text style={s.cardSub} numberOfLines={1}>{pendingOffer.credentialIssuer}</Text>
        </View>

        <View style={s.notice}>
          <Ionicons name="scan-outline" size={18} color={colors.primary} />
          <Text style={s.noticeText}>
            This credential includes a face photo. You will be asked to verify your identity
            with the front camera before the credential is saved.
          </Text>
        </View>

        <View style={s.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={s.noticeText}>
            Accepting will securely download and store this credential in your wallet.
            Only you can share it.
          </Text>
        </View>
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={handleDecline} disabled={status === 'loading'}>
          <Text style={[s.btnText, { color: colors.text }]}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: meta.color, flex: 1 }]}
          onPress={handleAccept}
          disabled={status === 'loading'}
        >
          {status === 'loading'
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Accept & Download</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl + 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  body: { flex: 1, padding: spacing.md, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  typeIcon: { width: 52, height: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
  cardValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  notice: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md,
    backgroundColor: colors.primary + '10', borderRadius: radius.md, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  actions: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border },
  btn: { paddingVertical: 14, borderRadius: radius.full, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: spacing.lg, flexDirection: 'row' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.lg },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  successText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  cameraWrap: { flex: 1, position: 'relative', backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, gap: spacing.sm },
  cameraPlaceholderText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  faceGuide: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  faceOval: { width: 200, height: 260, borderRadius: 100, borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)', borderStyle: 'dashed' },
  faceOvalChecking: { borderColor: '#60a5fa', borderStyle: 'solid' },
  faceOvalFailed: { borderColor: '#f87171', borderStyle: 'solid' },
  faceOvalSuccess: { borderColor: '#34d399', borderStyle: 'solid' },
  faceGuideText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 14,
    fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  checkingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  checkingText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  failBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    margin: spacing.md, padding: spacing.md, backgroundColor: '#fde8e8',
    borderRadius: radius.md, borderWidth: 1.5, borderColor: '#fca5a5' },
  failText: { flex: 1, fontSize: 14, color: '#b91c1c', lineHeight: 20, fontWeight: '500' },
})
