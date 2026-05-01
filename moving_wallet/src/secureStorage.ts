
import { Platform } from 'react-native'
import { StoredCredential } from './types'


const store = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key)
    }
    const SecureStore = await import('expo-secure-store')
    return SecureStore.getItemAsync(key)
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value)
      return
    }
    const SecureStore = await import('expo-secure-store')
    await SecureStore.setItemAsync(key, value)
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key)
      return
    }
    const SecureStore = await import('expo-secure-store')
    await SecureStore.deleteItemAsync(key)
  },
}

const KEYS = {
  pinHash: 'wallet_pin_hash',
  pinSalt: 'wallet_pin_salt',
  credIndex: 'wallet_cred_index',
  cred: (id: string) => `wallet_cred_${id}`,
  walletEmail: 'wallet_account_email',
  walletPassword: 'wallet_account_password',
}

export async function savePinHash(hash: string, salt: string) {
  await store.set(KEYS.pinHash, hash)
  await store.set(KEYS.pinSalt, salt)
}

export async function loadPinData(): Promise<{ hash: string; salt: string } | null> {
  const hash = await store.get(KEYS.pinHash)
  const salt = await store.get(KEYS.pinSalt)
  if (!hash || !salt) return null
  return { hash, salt }
}

async function getIndex(): Promise<string[]> {
  const raw = await store.get(KEYS.credIndex)
  return raw ? JSON.parse(raw) : []
}

async function setIndex(ids: string[]) {
  await store.set(KEYS.credIndex, JSON.stringify(ids))
}

export async function saveCredential(cred: StoredCredential): Promise<void> {
  const ids = await getIndex()
  if (!ids.includes(cred.localId)) {
    ids.push(cred.localId)
    await setIndex(ids)
  }
  await store.set(KEYS.cred(cred.localId), JSON.stringify(cred))
}

export async function loadAllCredentials(): Promise<StoredCredential[]> {
  const ids = await getIndex()
  const results = await Promise.all(
    ids.map(async (id) => {
      const raw = await store.get(KEYS.cred(id))
      return raw ? (JSON.parse(raw) as StoredCredential) : null
    }),
  )
  return results.filter((c): c is StoredCredential => c !== null)
}

export async function deleteCredential(localId: string): Promise<void> {
  const ids = (await getIndex()).filter((id) => id !== localId)
  await setIndex(ids)
  await store.del(KEYS.cred(localId))
}


export async function saveWalletAccount(email: string, password: string): Promise<void> {
  await store.set(KEYS.walletEmail, email)
  await store.set(KEYS.walletPassword, password)
}

export async function loadWalletAccount(): Promise<{ email: string; password: string } | null> {
  const email = await store.get(KEYS.walletEmail)
  const password = await store.get(KEYS.walletPassword)
  if (!email || !password) return null
  return { email, password }
}

export async function clearAll(): Promise<void> {
  const ids = await getIndex()
  await Promise.all(ids.map((id) => store.del(KEYS.cred(id))))
  await store.del(KEYS.credIndex)
  await store.del(KEYS.pinHash)
  await store.del(KEYS.pinSalt)
  await store.del(KEYS.walletEmail)
  await store.del(KEYS.walletPassword)
}
