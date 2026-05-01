// EUDI-01: Unlock screen — PIN or biometric authentication
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { verifyPin, isBiometricAvailable, authenticateWithBiometric } from '@/auth'
import { useWalletStore } from '@/store'
import { colors, spacing, radius } from '@/theme'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, undefined, 0, 'del'] as const

export default function UnlockScreen() {
  const [pin, setPin] = useState('')
  const [hasBiometric, setHasBiometric] = useState(false)
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const { setAuthenticated, initSession } = useWalletStore()

  useEffect(() => {
    isBiometricAvailable().then((ok) => {
      setHasBiometric(ok)
      if (ok) tryBiometric()
    })
  }, [])

  async function tryBiometric() {
    const ok = await authenticateWithBiometric()
    if (ok) unlock()
  }

  async function unlock() {
    setAuthenticated(true)
    setConnecting(true)
    await initSession()
    setConnecting(false)
    router.replace('/(wallet)/')
  }

  async function onDigit(d: (typeof DIGITS)[number]) {
    if (d === undefined) return
    setError('')
    if (d === 'del') { setPin((v) => v.slice(0, -1)); return }
    if (pin.length >= 6) return
    const next = pin + String(d)
    setPin(next)
    if (next.length === 6) {
      const ok = await verifyPin(next)
      if (ok) {
        unlock()
      } else {
        setError('Incorrect PIN. Try again.')
        setPin('')
      }
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
        <Text style={s.title}>Unlock Wallet</Text>
        <Text style={s.subtitle}>Enter your PIN</Text>
      </View>

      <View style={s.dots}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
        ))}
      </View>

      {connecting
        ? <ActivityIndicator size="small" color={colors.primary} />
        : error ? <Text style={s.error}>{error}</Text> : <View style={{ height: 20 }} />
      }

      <View style={s.numpad}>
        {DIGITS.map((d, i) => {
          const isBioSlot = d === undefined && hasBiometric
          return (
            <TouchableOpacity
              key={i}
              style={[s.key, !isBioSlot && d === undefined && s.keyHidden]}
              onPress={() => (isBioSlot ? tryBiometric() : onDigit(d))}
              disabled={!isBioSlot && d === undefined}
            >
              {isBioSlot ? (
                <Ionicons name="finger-print" size={28} color={colors.primary} />
              ) : (
                <Text style={s.keyText}>{d === 'del' ? '⌫' : d}</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted },
  dots: { flexDirection: 'row', gap: spacing.md },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: colors.primary },
  error: { fontSize: 14, color: colors.danger },
  numpad: { width: '80%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  key: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  keyHidden: { opacity: 0 },
  keyText: { fontSize: 22, fontWeight: '500', color: colors.text },
})
