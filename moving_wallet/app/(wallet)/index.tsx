// EUDI-03: Credential list home screen
import { useEffect } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useWalletStore } from '@/store'
import { StoredCredential, AssuranceLevel } from '@/types'
import { colors, spacing, radius, credentialMeta, assuranceMeta } from '@/theme'

export default function HomeScreen() {
  const { credentials, loadCredentials, removeCredential, loadDemoCredentials } = useWalletStore()

  useEffect(() => { loadCredentials() }, [])

  function getCredType(cred: StoredCredential): string {
    return cred.credential.type.find((t) => t !== 'VerifiableCredential') ?? 'Unknown'
  }

  function confirmDelete(localId: string) {
    Alert.alert('Remove Credential', 'Are you sure you want to remove this credential?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeCredential(localId) },
    ])
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>My Wallet</Text>
        <TouchableOpacity style={s.scanBtn} onPress={() => router.push('/(wallet)/scan')}>
          <Ionicons name="qr-code" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {credentials.length === 0 ? (
        <EmptyState onImport={loadDemoCredentials} />
      ) : (
        <>
          <Text style={s.count}>{credentials.length} credential{credentials.length !== 1 ? 's' : ''}</Text>
          <FlatList
            data={credentials}
            keyExtractor={(c) => c.localId}
            contentContainerStyle={s.list}
            renderItem={({ item }) => (
              <CredentialCard
                item={item}
                type={getCredType(item)}
                onPress={() => router.push(`/credential/${item.localId}`)}
                onDelete={() => confirmDelete(item.localId)}
              />
            )}
          />
        </>
      )}
    </SafeAreaView>
  )
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <View style={s.empty}>
      <Ionicons name="wallet-outline" size={64} color={colors.border} />
      <Text style={s.emptyTitle}>No credentials yet</Text>
      <Text style={s.emptyText}>Load demo credentials to get started</Text>
      <TouchableOpacity style={s.importBtn} onPress={onImport}>
        <Text style={s.importBtnText}>Load Demo Credentials</Text>
      </TouchableOpacity>
    </View>
  )
}

function AssuranceBadge({ level }: { level: AssuranceLevel }) {
  const meta = assuranceMeta[level]
  return (
    <View style={[s.badge, { backgroundColor: meta.color + '18' }]}>
      <Ionicons name={meta.icon as any} size={10} color={meta.color} />
      <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  )
}

function CredentialCard({
  item, type, onPress, onDelete,
}: {
  item: StoredCredential
  type: string
  onPress: () => void
  onDelete: () => void
}) {
  const meta = credentialMeta[type] ?? { label: type, color: colors.primary, icon: 'document' }
  const issuerName = typeof item.credential.issuer === 'string'
    ? item.credential.issuer
    : item.credential.issuer.name

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.cardAccent, { backgroundColor: meta.color }]} />
      <View style={s.cardBody}>
        <View style={[s.iconBg, { backgroundColor: meta.color + '20' }]}>
          <Ionicons name={meta.icon as any} size={24} color={meta.color} />
        </View>
        <View style={s.cardText}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>{meta.label}</Text>
            <AssuranceBadge level={item.assuranceLevel} />
          </View>
          <Text style={s.cardIssuer}>{issuerName}</Text>
          <Text style={s.cardDate}>
            Issued {new Date(item.credential.issuanceDate).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity style={s.deleteBtn} onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  scanBtn: { backgroundColor: colors.primary, borderRadius: radius.full, padding: spacing.sm },
  count: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: 4 },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  iconBg: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardIssuer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  importBtn: { marginTop: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 4, borderRadius: radius.full },
  importBtnText: { color: colors.surface, fontWeight: '600', fontSize: 15 },
})
