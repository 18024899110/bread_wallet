import { useState, useMemo, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Switch,
} from 'react-native'
import { router, useRootNavigationState } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useWalletStore } from '@/store'
import { waltidWallet, ec2WaltidWallet } from '@/waltidWalletClient'
import { colors, spacing, radius, sdFields } from '@/theme'
import { isSdJwt, parseSdJwt } from '@/sdJwt'
import type { ClaimDisclosure } from '@/types'

export default function ConsentScreen() {
  const { pendingRequest, setPendingRequest, credentials, _ec2CredIds, initSession } = useWalletStore()
  const [jiazaiZhong, setJiazaiZhong] = useState(false)
  const [shibaiYuanyin, setShibaiYuanyin] = useState<string | null>(null)
  const [kaiguan, setKaiguan] = useState<Record<string, boolean>>({})
  const navState = useRootNavigationState()

  useEffect(() => {
    if (!navState?.key) return
    if (!pendingRequest) router.replace('/(wallet)')
  }, [navState?.key, pendingRequest])

  const credentialType = pendingRequest?.credentialType ?? ''
  const verifierName = pendingRequest?.verifierName
  const verifierDid = pendingRequest?.verifierDid
  const purpose = pendingRequest?.purpose
  const rawUrl = pendingRequest?.rawUrl

  const requestedClaims = pendingRequest?.requestedClaims ?? []
  const isGenericType = credentialType === 'VerifiableCredential' || credentialType === ''
  const matchingCredential = credentials.find((c) => {
    if (!c.credential.type?.includes(credentialType)) return false
    if (isGenericType && requestedClaims.length > 0) {
      const subjectKeys = Object.keys(c.credential.credentialSubject ?? {})
      return requestedClaims.some((claim) => subjectKeys.includes(claim))
    }
    return true
  })
  const config = sdFields[credentialType] ?? { required: [], optional: [] }

  const rawDocument: string = (matchingCredential?.credential.proof?.jws as string | undefined) ?? ''
  const isSd = isSdJwt(rawDocument)
  const sdParsed = useMemo(() => isSd ? parseSdJwt(rawDocument) : null, [rawDocument, isSd])

  const allClaims: ClaimDisclosure[] = useMemo(() => {
    if (!matchingCredential) return []

    if (sdParsed) {
      return sdParsed.disclosures.map((d) => ({
        key: d.key,
        label: formatKey(d.key),
        value: formatValue(d.value),
        required: !config.optional.includes(d.key),
      }))
    }

    return Object.keys(matchingCredential.credential.credentialSubject)
      .filter((k) => k !== 'id')
      .map((key) => ({
        key,
        label: formatKey(key),
        value: formatValue(matchingCredential.credential.credentialSubject[key]),
        required: !config.optional.includes(key),
      }))

  }, [matchingCredential?.localId, credentialType, isSd])

  if (!pendingRequest) return null

  if (shibaiYuanyin) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.failContainer}>
          <View style={s.failIconWrap}>
            <Ionicons name="close-circle" size={64} color="#ef4444" />
          </View>
          <Text style={s.failTitle}>验证失败</Text>
          <Text style={s.failReason}>{shibaiYuanyin}</Text>
          <TouchableOpacity
            style={s.failBtn}
            onPress={() => { setShibaiYuanyin(null); setPendingRequest(null); router.replace('/(wallet)') }}
          >
            <Text style={s.failBtnText}>返回钱包</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  function isDisclosed(claim: ClaimDisclosure): boolean {
    if (claim.required) return true
    return kaiguan[claim.key] !== false
  }

  function toggle(key: string) {
    setKaiguan((prev) => ({ ...prev, [key]: prev[key] === false ? true : false }))
  }

  const disclosedCount = allClaims.filter(isDisclosed).length
  const hasOptional = allClaims.some((c) => !c.required)

  async function onApprove() {
    if (!rawUrl) {
      const disclosed = allClaims.filter(isDisclosed).map((c) => `${c.label}: ${c.value}`)
      Alert.alert(
        'Credential Shared',
        `${disclosedCount} field${disclosedCount !== 1 ? 's' : ''} disclosed to ${verifierName || 'the verifier'}:\n\n${disclosed.join('\n')}`,
        [{ text: 'OK', onPress: () => { setPendingRequest(null); router.replace('/(wallet)') } }],
      )
      return
    }

    setJiazaiZhong(true)
    let tijiaoIds: string[] = []
    try {
      const pipeidList = credentials
        .filter((c) => {
          if (!c.credential.type?.includes(credentialType)) return false
          if (isGenericType && requestedClaims.length > 0) {
            const subjectKeys = Object.keys(c.credential.credentialSubject ?? {})
            return requestedClaims.some((claim) => subjectKeys.includes(claim))
          }
          return true
        })
        .map((c) => c.localId)

      if (!pipeidList.length) {
        setShibaiYuanyin(`你的钱包里没有 ${credentialType} 凭证，无法完成验证。`)
        setJiazaiZhong(false)
        return
      }

      const localIds = pipeidList.filter((id) => !_ec2CredIds.has(id))
      const ec2Ids   = pipeidList.filter((id) => _ec2CredIds.has(id))
      const yongEC2  = __DEV__ && ec2WaltidWallet.walletId != null && localIds.length === 0 && ec2Ids.length > 0
      const dangQianQianbao = yongEC2 ? ec2WaltidWallet : waltidWallet

      if (!dangQianQianbao.walletId) {
        await initSession()
        if (!dangQianQianbao.walletId) {
          setShibaiYuanyin('Wallet session not ready — please restart the app and try again.')
          setJiazaiZhong(false)
          return
        }
      }

      const chiYouZheDid = await dangQianQianbao.ensureDid()
      tijiaoIds = (yongEC2 ? ec2Ids : (localIds.length > 0 ? localIds : ec2Ids)).slice(0, 1)


      const isDemoOnly = tijiaoIds.every((id) => id.startsWith('demo-'))
      if (isDemoOnly) {
        Alert.alert(
          'Shared',
          `${disclosedCount} field${disclosedCount !== 1 ? 's' : ''} selectively disclosed to ${verifierName || 'the verifier'}.`,
          [{ text: 'OK', onPress: () => { setPendingRequest(null); router.replace('/(wallet)') } }],
        )
        return
      }

      await dangQianQianbao.usePresentationRequest(stripCustomParams(rawUrl), chiYouZheDid, tijiaoIds)
      Alert.alert(
        'Shared',
        `${disclosedCount} field${disclosedCount !== 1 ? 's' : ''} selectively disclosed to ${verifierName || 'the verifier'}.`,
        [{ text: 'OK', onPress: () => { setPendingRequest(null); router.replace('/(wallet)') } }],
      )
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      console.error('[Presentation] failed', {
        error: msg,
        credentialType,
        verifierName,
        rawUrl,
        tijiaoIds,
        timestamp: new Date().toISOString(),
      })
      const isExpiredSession =
        msg.includes('AuthorizationError') ||
        msg.includes('presentation definition') ||
        msg.includes('expired') ||
        msg.includes('NotFoundException') ||
        msg.includes('IllegalArgumentException')
      setShibaiYuanyin(
        isExpiredSession
          ? 'This QR code has expired or already been used. Please go back to the Verifier Portal and click the scenario card again to get a new QR code.'
          : msg || 'Something went wrong. Please try again.',
      )
    } finally {
      setJiazaiZhong(false)
    }
  }

  function onDecline() {
    setPendingRequest(null)
    router.replace('/(wallet)')
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.verifierCard}>
          <View style={s.verifierIcon}>
            <Ionicons name="business" size={28} color={colors.primary} />
          </View>
          <Text style={s.verifierName}>{verifierName || 'Unknown Verifier'}</Text>
          {!verifierName && (
            <View style={s.unknownBadge}>
              <Ionicons name="warning-outline" size={14} color={colors.warning} />
              <Text style={s.unknownText}>Unverified requester</Text>
            </View>
          )}
          {verifierDid && <Text style={s.verifierDid} numberOfLines={1}>{verifierDid}</Text>}
        </View>

        <View style={[s.sdBadge, isSd ? s.sdBadgeReal : s.sdBadgeSim]}>
          <Ionicons name={isSd ? 'shield-checkmark' : 'eye-outline'} size={15} color={isSd ? '#059669' : '#7c3aed'} />
          <View style={{ flex: 1 }}>
            <Text style={[s.sdBadgeTitle, { color: isSd ? '#059669' : '#7c3aed' }]}>
              {isSd ? 'SD-JWT VC — Real Selective Disclosure' : 'Selective Disclosure'}
            </Text>
            <Text style={[s.sdBadgeSub, { color: isSd ? '#047857' : '#6d28d9' }]}>
              {hasOptional
                ? 'Toggle optional fields to control what is shared'
                : 'All fields are required for this credential type'}
            </Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Requesting from</Text>
        <View style={s.credTypeBadge}>
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
          <Text style={s.credTypeText}>{credentialType}</Text>
        </View>

        {purpose && (
          <View style={s.purposeBox}>
            <Text style={s.purposeLabel}>Purpose</Text>
            <Text style={s.purposeValue}>{purpose}</Text>
          </View>
        )}

        <Text style={s.sectionLabel}>
          Fields to share — {disclosedCount} / {allClaims.length}
        </Text>

        {matchingCredential ? (
          <View style={s.claimsCard}>
            {allClaims.length === 0 ? (
              <Text style={s.noClaims}>No fields found in credential</Text>
            ) : (
              allClaims.map((claim, i) => {
                const on = isDisclosed(claim)
                return (
                  <View
                    key={claim.key}
                    style={[s.claimRow, i < allClaims.length - 1 && s.claimRowBorder]}
                  >
                    <View style={s.claimLeft}>
                      <View style={[s.claimIconWrap, { backgroundColor: claim.required ? '#dcfce7' : '#ede9fe' }]}>
                        <Ionicons
                          name={claim.required ? 'lock-closed' : 'eye-outline'}
                          size={13}
                          color={claim.required ? colors.success : '#7c3aed'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.claimKey, !on && s.dimText]}>{claim.label}</Text>
                        {on
                          ? <Text style={s.claimVal} numberOfLines={2}>{claim.value}</Text>
                          : <Text style={s.hiddenVal}>— withheld —</Text>
                        }
                      </View>
                    </View>

                    {!claim.required ? (
                      <Switch
                        value={on}
                        onValueChange={() => toggle(claim.key)}
                        trackColor={{ false: colors.border, true: '#c4b5fd' }}
                        thumbColor={on ? '#7c3aed' : '#94a3b8'}
                      />
                    ) : (
                      <View style={s.requiredBadge}>
                        <Text style={s.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </View>
        ) : (
          <View style={s.noCredCard}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
            <Text style={s.noCredText}>No {credentialType} credential in wallet</Text>
          </View>
        )}

        <Text style={s.notice}>
          {hasOptional
            ? 'Lock icon = always required. Eye icon = you can withhold this field.'
            : 'All fields in this credential type are required by the verifier.'}
        </Text>

      </ScrollView>

      <View style={s.actions}>
        <TouchableOpacity style={s.declineBtn} onPress={onDecline} disabled={jiazaiZhong}>
          <Text style={s.declineBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.approveBtn, !matchingCredential && { opacity: 0.5 }]}
          onPress={onApprove}
          disabled={jiazaiZhong || !matchingCredential}
        >
          {jiazaiZhong ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={s.approveBtnText}>
                Share {disclosedCount} field{disclosedCount !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function stripCustomParams(rawUrl: string): string {
  try {
    const schemeMatch = rawUrl.match(/^([a-z0-9+\-.]+):\/\//)
    if (!schemeMatch) return rawUrl
    const scheme = schemeMatch[1]
    const url = new URL(rawUrl.replace(`${scheme}://`, 'https://x.com/'))
    url.searchParams.delete('credential_type')
    url.searchParams.delete('verifier_env')
    return url.toString().replace('https://x.com/', `${scheme}://`)
  } catch {
    return rawUrl
  }
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).replace(/_/g, ' ')
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 24 },

  verifierCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', gap: spacing.sm, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  verifierIcon: {
    width: 56, height: 56, borderRadius: radius.full,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  verifierName: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  verifierDid: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' },
  unknownBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fef3c7', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full,
  },
  unknownText: { fontSize: 12, color: colors.warning, fontWeight: '500' },

  sdBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3,
  },
  sdBadgeReal: { backgroundColor: '#f0fdf4', borderLeftColor: '#059669' },
  sdBadgeSim: { backgroundColor: '#f5f3ff', borderLeftColor: '#7c3aed' },
  sdBadgeTitle: { fontSize: 13, fontWeight: '700' },
  sdBadgeSub: { fontSize: 12, marginTop: 2 },

  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  credTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.sm, alignSelf: 'flex-start',
  },
  credTypeText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  purposeBox: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md, gap: 4 },
  purposeLabel: { fontSize: 12, color: colors.textMuted },
  purposeValue: { fontSize: 14, color: colors.text },

  claimsCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    overflow: 'hidden',
  },
  claimRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.sm,
  },
  claimRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  claimLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  claimIconWrap: {
    width: 28, height: 28, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  claimKey: { fontSize: 13, fontWeight: '600', color: colors.text },
  claimVal: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  hiddenVal: { fontSize: 12, color: colors.border, marginTop: 1, fontStyle: 'italic' },
  dimText: { color: colors.textMuted },

  requiredBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full, flexShrink: 0,
  },
  requiredText: { fontSize: 10, fontWeight: '700', color: colors.success },

  noClaims: { fontSize: 14, color: colors.textMuted, padding: spacing.md },
  noCredCard: {
    backgroundColor: '#fef3c7', borderRadius: radius.md, padding: spacing.lg,
    alignItems: 'center', gap: spacing.sm,
  },
  noCredText: { fontSize: 14, color: colors.warning, textAlign: 'center' },

  notice: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },

  actions: {
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  declineBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  declineBtnText: { fontSize: 15, fontWeight: '600', color: colors.text },
  approveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, gap: spacing.sm,
  },
  approveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  failContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background,
  },
  failIconWrap: { marginBottom: spacing.sm },
  failTitle: { fontSize: 22, fontWeight: '700', color: '#ef4444' },
  failReason: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  failBtn: {
    marginTop: spacing.md, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  failBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
})
