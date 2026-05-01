
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { router } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import { isWalletSetup } from '@/auth'
import { useWalletStore } from '@/store'
import { PresentationRequest } from '@/types'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const { isAuthenticated, setPendingRequest } = useWalletStore()

  useEffect(() => {
    async function init() {
      const setup = await isWalletSetup()
      if (!setup) {
        router.replace('/setup')
      } else {
        router.replace('/unlock')
      }
      setReady(true)
    }
    init()
  }, [])


  useEffect(() => {
    function handleUrl({ url }: { url: string }) {
      if (!isAuthenticated) return
      try {
        const req = parseDeepLink(url)
        setPendingRequest(req)
        router.push('/consent')
      } catch {}
    }

    const sub = Linking.addEventListener('url', handleUrl)
    return () => sub.remove()
  }, [isAuthenticated])

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="setup" />
        <Stack.Screen name="unlock" />
        <Stack.Screen name="(wallet)" />
        <Stack.Screen name="credential/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="consent" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  )
}

function parseDeepLink(url: string): PresentationRequest {
  const parsed = Linking.parse(url)
  const params = parsed.queryParams ?? {}
  return {
    verifierName: String(params.client_id ?? 'Unknown Verifier'),
    verifierDid: params.client_id ? String(params.client_id) : undefined,
    requestedClaims: params.claims ? String(params.claims).split(',') : [],
    credentialType: String(params.credential_type ?? 'VerifiableCredential'),
    nonce: params.nonce ? String(params.nonce) : undefined,
    responseUri: params.response_uri ? String(params.response_uri) : undefined,
    rawUrl: url,
  }
}
