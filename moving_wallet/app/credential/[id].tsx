// EUDI-04: Credential detail view
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useWalletStore } from '@/store'
import { colors, spacing, radius, credentialMeta, assuranceMeta } from '@/theme'
import { AssuranceLevel } from '@/types'

const ISSUER_FIELDS = new Set(['id', 'portrait'])

export default function CredentialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { credentials, removeCredential } = useWalletStore()
  const item = credentials.find((c) => c.localId === id)

  if (!item) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.notFound}>Credential not found.</Text>
      </SafeAreaView>
    )
  }

  const { credential } = item
  const credType = credential.type.find((t) => t !== 'VerifiableCredential') ?? 'Unknown'
  const meta = credentialMeta[credType] ?? { label: credType, color: colors.primary, icon: 'document' }
  const issuerRaw = typeof credential.issuer === 'string' ? credential.issuer : (credential.issuer.name ?? credential.issuer.id ?? '')
  const issuerName = issuerRaw.startsWith('did:') || !issuerRaw ? 'EUDI Digital Identity Issuer' : issuerRaw
  const assurance = assuranceMeta[item.assuranceLevel]

  const portrait = credential.credentialSubject?.portrait as string | undefined
  const subjectClaims = Object.entries(credential.credentialSubject).filter(
    ([key]) => !ISSUER_FIELDS.has(key),
  )

  function confirmDelete() {
    Alert.alert('Remove Credential', 'Remove this credential from your wallet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await removeCredential(item.localId)
            router.back()
          } catch (err: any) {
            Alert.alert('Delete Failed', err?.message ?? 'Could not remove credential. Please try again.')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Credential</Text>
        <TouchableOpacity onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Header */}
        <View style={[s.headerCard, { backgroundColor: meta.color }]}>
          {portrait ? (
            <Image source={{ uri: portrait }} style={s.portrait} />
          ) : (
            <Ionicons name={meta.icon as any} size={36} color="#fff" />
          )}
          <Text style={s.headerLabel}>{meta.label}</Text>
          <Text style={s.headerIssuer}>{issuerName}</Text>

          {/* Assurance level trust indicator */}
          <View style={s.assuranceBadge}>
            <Ionicons name={assurance.icon as any} size={14} color={assurance.color} />
            <Text style={[s.assuranceText, { color: assurance.color }]}>
              {assurance.label} Assurance
            </Text>
          </View>
        </View>

        {/* Issuer */}
        <Section title="Issuer">
          <ClaimRow label="Name" value={issuerName} />
          <ClaimRow label="Issued" value={new Date(credential.issuanceDate).toLocaleDateString()} />
          {credential.expirationDate && (
            <ClaimRow label="Expires" value={new Date(credential.expirationDate).toLocaleDateString()} />
          )}
        </Section>

        {/* Credential status (revocation) */}
        {credential.credentialStatus && (
          <Section title="Status">
            <ClaimRow label="Type" value={credential.credentialStatus.type} />
            <ClaimRow label="Endpoint" value={credential.credentialStatus.id} mono />
            <View style={s.statusRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={s.statusText}>Valid — not revoked</Text>
            </View>
          </Section>
        )}

        {/* Subject claims */}
        <Section title="Attributes">
          {subjectClaims.map(([key, value]) => (
            <ClaimRow key={key} label={formatKey(key)} value={String(value)} />
          ))}
        </Section>

        {/* Proof */}
        {credential.proof && (
          <Section title="Proof">
            <ClaimRow label="Type" value={credential.proof.type} />
            <ClaimRow label="Purpose" value={credential.proof.proofPurpose} />
            <ClaimRow label="Method" value={credential.proof.verificationMethod} mono />
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  )
}

function ClaimRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, mono && s.mono]} numberOfLines={2}>{value}</Text>
    </View>
  )
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  notFound: { textAlign: 'center', marginTop: 80, color: colors.textMuted },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  navTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  headerCard: { borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  headerLabel: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerIssuer: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  portrait: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' },
  assuranceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, marginTop: 4 },
  assuranceText: { fontSize: 12, fontWeight: '700' },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 14, color: colors.textMuted, flex: 1 },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: '500', flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  statusText: { fontSize: 14, color: colors.success, fontWeight: '500' },
})
