// EUDI-01: PIN hashing + biometric authentication
// Native: expo-crypto + expo-local-authentication | Web: SubtleCrypto fallback
import { Platform } from 'react-native'
import { loadPinData, savePinHash } from './secureStorage'

function randomSalt(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function sha256(value: string): Promise<string> {
  if (Platform.OS === 'web') {
    const encoder = new TextEncoder()
    const data = encoder.encode(value)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  const Crypto = await import('expo-crypto')
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value)
}

export async function setupPin(pin: string): Promise<void> {
  const salt = randomSalt()
  const hash = await sha256(pin + salt)
  await savePinHash(hash, salt)
}

export async function verifyPin(pin: string): Promise<boolean> {
  const data = await loadPinData()
  if (!data) return false
  const hash = await sha256(pin + data.salt)
  return hash === data.hash
}

export async function isWalletSetup(): Promise<boolean> {
  const data = await loadPinData()
  return data !== null
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const LocalAuth = await import('expo-local-authentication')
  const compatible = await LocalAuth.hasHardwareAsync()
  if (!compatible) return false
  return LocalAuth.isEnrolledAsync()
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const LocalAuth = await import('expo-local-authentication')
  const result = await LocalAuth.authenticateAsync({
    promptMessage: 'Unlock your EUDI Wallet',
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  })
  return result.success
}
