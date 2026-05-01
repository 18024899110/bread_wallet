// EUDI-01: First-launch wallet setup — create a 6-digit PIN
import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { setupPin } from '@/auth'
import { colors, spacing, radius } from '@/theme'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, undefined, 0, 'del'] as const

export default function SetupScreen() {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'create' | 'confirm'>('create')

  const active = step === 'create' ? pin : confirmPin
  const setActive = step === 'create' ? setPin : setConfirmPin

  function onDigit(d: number | 'del' | undefined) {
    if (d === undefined) return
    if (d === 'del') {
      setActive((v) => v.slice(0, -1))
      return
    }
    if (active.length >= 6) return
    const next = active + String(d)
    setActive(next)
    if (next.length === 6) handleComplete(next)
  }

  async function handleComplete(value: string) {
    if (step === 'create') {
      setStep('confirm')
      return
    }
    // confirm step
    if (value !== pin) {
      Alert.alert('PINs do not match', 'Please try again.')
      setPin('')
      setConfirmPin('')
      setStep('create')
      return
    }
    await setupPin(pin)

    router.replace('/(wallet)/')
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Set up your Wallet</Text>
        <Text style={s.subtitle}>
          {step === 'create' ? 'Create a 6-digit PIN' : 'Confirm your PIN'}
        </Text>
      </View>

      <PinDots value={active} />

      <NumPad onPress={onDigit} />
    </SafeAreaView>
  )
}

function PinDots({ value }: { value: string }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={[s.dot, i < value.length && s.dotFilled]} />
      ))}
    </View>
  )
}

function NumPad({ onPress }: { onPress: (d: (typeof DIGITS)[number]) => void }) {
  return (
    <View style={s.numpad}>
      {DIGITS.map((d, i) => (
        <TouchableOpacity
          key={i}
          style={[s.key, d === undefined && s.keyHidden]}
          onPress={() => onPress(d)}
          disabled={d === undefined}
        >
          <Text style={s.keyText}>{d === 'del' ? '⌫' : d}</Text>
        </TouchableOpacity>
      ))}
    </View>
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
  numpad: { width: '80%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  key: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  keyHidden: { opacity: 0 },
  keyText: { fontSize: 22, fontWeight: '500', color: colors.text },
})
