// EUDI-06: QR code / deep link presentation entry
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { CameraView, useCameraPermissions, Camera } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useWalletStore } from '@/store'
import { PresentationRequest, CredentialOffer } from '@/types'
import { colors, spacing, radius } from '@/theme'

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [pickingImage, setPickingImage] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const setPendingRequest = useWalletStore((s) => s.setPendingRequest)
  const setPendingOffer = useWalletStore((s) => s.setPendingOffer)

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  function handleBarcode({ data }: { data: string }) {
    if (scanned) return
    setScanned(true)
    parseAndRoute(data)
  }

  function retryScanning() {
    setScanError(null)
    setScanned(false)
  }

  async function pickFromLibrary() {
    if (pickingImage) return
    setPickingImage(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      })
      if (result.canceled || !result.assets?.length) return

      const uri = result.assets[0].uri
      const codes = await Camera.scanFromURLAsync(uri, ['qr'])
      if (!codes.length) {
        Alert.alert('No QR Found', 'No QR code was detected in the selected image.')
        return
      }
      // await so errors are caught and pickingImage spinner stays until navigation
      await parseAndRoute(codes[0].data)
    } catch (err: any) {
      setScanError(err.message ?? 'Failed to process QR code.')
      setScanned(true) // prevent re-scan until user taps retry
    } finally {
      setPickingImage(false)
    }
  }

  async function parseAndRoute(raw: string): Promise<void> {
    // OID4VCI credential offer — route to receive screen
    if (raw.startsWith('openid-credential-offer://')) {
      try {
        const offer = await parseCredentialOffer(raw)
        setPendingOffer(offer)
        router.replace('/receive')
        return
      } catch (err: any) {
        Alert.alert('Invalid Offer', `Could not parse credential offer.\n\n${err.message ?? ''}`,
          [{ text: 'OK', onPress: () => setScanned(false) }])
        return
      }
    }

    // OID4VP presentation request — route to consent screen
    try {
      const req = await parseRequest(raw)
      setPendingRequest(req)
      router.replace('/consent')
    } catch (err: any) {
      // Show inline error — do NOT reset scanned, user must tap "Scan Again"
      // to avoid infinite re-scan loop when the QR stays in frame
      setScanError(`This QR code could not be parsed as a valid presentation request.\n\n${err.message ?? ''}`)
    }
  }

  if (!permission) return <View style={s.container} />

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text style={s.permTitle}>Camera access needed</Text>
          <Text style={s.permText}>Allow camera access to scan QR codes</Text>
          <TouchableOpacity style={s.btn} onPress={requestPermission}>
            <Text style={s.btnText}>Grant Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={pickFromLibrary} disabled={pickingImage}>
            <Ionicons name="image-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={s.btnOutlineText}>{pickingImage ? 'Reading…' : 'Choose from Library'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={s.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay */}
      <SafeAreaView style={s.overlay} edges={['top', 'bottom']}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {scanError ? (
          /* Inline error panel — prevents infinite re-scan loop */
          <View style={s.errorPanel}>
            <Ionicons name="close-circle" size={52} color="#ef4444" />
            <Text style={s.errorTitle}>Invalid QR Code</Text>
            <Text style={s.errorMsg}>{scanError}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={retryScanning}>
              <Text style={s.retryText}>Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.finder}>
            <View style={[s.corner, s.tl]} />
            <View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} />
            <View style={[s.corner, s.br]} />
          </View>
        )}

        <View style={s.bottomBar}>
          <Text style={s.hint}>Scan a verifier QR or issuer offer QR</Text>
          <TouchableOpacity style={s.galleryBtn} onPress={pickFromLibrary} disabled={pickingImage}>
            <Ionicons name="image-outline" size={20} color="#fff" />
            <Text style={s.galleryText}>{pickingImage ? 'Reading…' : 'Choose from Library'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

// Parse QR payload into PresentationRequest
async function parseRequest(raw: string): Promise<PresentationRequest> {
  // Try JSON first (demo format)
  try {
    const obj = JSON.parse(raw)
    if (obj.verifierName && obj.requestedClaims) return obj as PresentationRequest
  } catch {}

  // OID4VP deep link (Walt.id and EUDI standard format)
  if (raw.startsWith('openid4vp://') || raw.startsWith('eudiw://') || raw.startsWith('haip://')) {
    // Reconstruct URL — replace custom scheme with https for URL parsing
    const urlStr = raw.replace(/^(openid4vp|eudiw|haip):\/\//, 'https://x.com/')
    const url = new URL(urlStr)

    const clientId = url.searchParams.get('client_id') ?? 'Unknown Verifier'
    const nonce = url.searchParams.get('nonce') ?? undefined
    const responseUri = url.searchParams.get('response_uri') ?? url.searchParams.get('response_url') ?? undefined

    // Extract verifier name from client_id URL
    let verifierName = clientId
    try {
      const cUrl = new URL(clientId)
      // Detect EUDI Verifier by port 7003 (works for any host: localhost or EC2)
      verifierName = cUrl.port === '7003' ? 'EUDI Verifier' : cUrl.hostname
    } catch {}

    // If Walt.id format: fetch presentation_definition_uri to get credential type
    let credentialType = url.searchParams.get('credential_type') ?? 'VerifiableCredential'
    let requestedClaims: string[] = url.searchParams.get('claims')?.split(',') ?? []

    const pdUri = url.searchParams.get('presentation_definition_uri')
    if (pdUri) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(pdUri, { signal: controller.signal })
        clearTimeout(timer)
        if (res.ok) {
          const pd = await res.json() as any
          // Extract credential type from input_descriptor constraints
          const descriptor = pd.input_descriptors?.[0]
          if (descriptor) {
            // Try to get type from filter pattern
            const typeField = descriptor.constraints?.fields?.find(
              (f: any) => f.path?.some((p: string) => p.includes('type'))
            )
            if (typeField?.filter?.pattern) {
              credentialType = typeField.filter.pattern
            }
            // Collect requested claim paths
            requestedClaims = (descriptor.constraints?.fields ?? [])
              .flatMap((f: any) => f.path ?? [])
              .map((p: string) => p.replace(/^\$\.vc\.credentialSubject\./, '').replace(/^\$\.credentialSubject\./, ''))
              .filter((p: string) => !p.startsWith('$') && p !== 'type')
          }
        }
      } catch {}
    }

    return {
      verifierName,
      verifierDid: clientId.startsWith('did:') ? clientId : undefined,
      requestedClaims,
      credentialType,
      nonce,
      responseUri,
      rawUrl: raw,
    }
  }

  throw new Error('Unrecognised QR format')
}

// Parse OID4VCI openid-credential-offer:// URL
async function parseCredentialOffer(raw: string): Promise<CredentialOffer> {
  const url = new URL(raw)

  let offer: any
  const inlineParam = url.searchParams.get('credential_offer')
  const uriParam = url.searchParams.get('credential_offer_uri')

  if (inlineParam) {
    offer = JSON.parse(decodeURIComponent(inlineParam))
  } else if (uriParam) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(uriParam, { signal: controller.signal })
      if (!res.ok) throw new Error(`Failed to fetch credential offer from ${uriParam}: ${res.status}`)
      offer = await res.json()
    } finally {
      clearTimeout(timer)
    }
  } else {
    throw new Error('Missing credential_offer or credential_offer_uri parameter')
  }

  const credentialIssuer: string = offer.credential_issuer
  const credentialType: string =
    url.searchParams.get('credential_type') ??
    offer.credential_configuration_ids?.[0] ??
    offer.credentials?.[0] ??
    'VerifiableCredential'
  const grants = offer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code']
  const preAuthCode: string = grants?.['pre-authorized_code']

  if (!credentialIssuer || !preAuthCode) throw new Error('Incomplete credential offer')
  return { credentialIssuer, credentialType, preAuthCode, rawUrl: raw }
}

const FINDER = 200
const CORNER = 24

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  permTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  permText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 4, borderRadius: radius.full, marginTop: spacing.sm },
  btnText: { color: '#fff', fontWeight: '600' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  back: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: radius.full, padding: 8 },
  finder: { width: FINDER, height: FINDER, position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  bottomBar: { alignItems: 'center', gap: spacing.sm },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center' },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  galleryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  errorPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  errorMsg: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 18 },
  retryBtn: { marginTop: spacing.sm, backgroundColor: '#fff', paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.full },
  retryText: { color: '#111', fontWeight: '700', fontSize: 15 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
})
