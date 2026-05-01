
import { create } from 'zustand'
import { StoredCredential, PresentationRequest, CredentialOffer } from './types'
import {
  loadAllCredentials,
  saveCredential,
  deleteCredential,
  loadWalletAccount,
  saveWalletAccount,
} from './secureStorage'
import { waltidWallet, ec2WaltidWallet } from './waltidWalletClient'
import { waltidCredToStored } from './issuerClient'
import { demoCredentials } from './demoCredentials'
import * as Crypto from 'expo-crypto'

interface WalletState {

  isAuthenticated: boolean
  setAuthenticated: (v: boolean) => void


  walletSessionReady: boolean
  holderDid: string | null
  initSession: () => Promise<void>


  credentials: StoredCredential[]

  _pendingDeletions: Set<string>

  _ec2CredIds: Set<string>
  loadCredentials: () => Promise<void>
  addCredential: (cred: StoredCredential) => Promise<void>
  removeCredential: (localId: string) => Promise<void>
  loadDemoCredentials: () => Promise<void>

  pendingRequest: PresentationRequest | null
  setPendingRequest: (req: PresentationRequest | null) => void

  pendingOffer: CredentialOffer | null
  setPendingOffer: (offer: CredentialOffer | null) => void
}

async function generateAccountCredentials(): Promise<{ email: string; password: string }> {
  const bytes = await Crypto.getRandomBytesAsync(24)
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return {
    email: `device-${hex.slice(0, 12)}@eudiwallet.local`,
    password: hex.slice(12),
  }
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isAuthenticated: false,
  setAuthenticated: (v) => set({ isAuthenticated: v }),


  walletSessionReady: false,
  holderDid: null,

  initSession: async () => {
    try {
      let account = await loadWalletAccount()
      if (!account) {

        account = await generateAccountCredentials()
        try {
          await waltidWallet.createAccount(account.email, account.password)
        } catch {
        }
        await saveWalletAccount(account.email, account.password)
      }
      try {
        await waltidWallet.login(account.email, account.password)
      } catch (loginErr: any) {
        const msg: string = loginErr?.message ?? ''
        if (msg.toLowerCase().includes('unknown user') || msg.includes('401') || msg.includes('404')) {
          await waltidWallet.createAccount(account.email, account.password)
          await waltidWallet.login(account.email, account.password)
        } else {
          throw loginErr
        }
      }
      await waltidWallet.getFirstWalletId()
      const did = await waltidWallet.ensureDid()

      if (__DEV__) {
        try {
          await ec2WaltidWallet.createAccount(account.email, account.password)
        } catch { /* account may already exist */ }
        try {
          await ec2WaltidWallet.login(account.email, account.password)
          await ec2WaltidWallet.getFirstWalletId()
        } catch {
          console.warn('[waltid] EC2 wallet session init failed — EC2 credential receive unavailable')
        }
      }

      set({ walletSessionReady: true, holderDid: did })
    } catch (err) {
      console.warn('[waltid] Session init failed:', err)
      set({ walletSessionReady: false })
    }
  },



  credentials: [],
  _pendingDeletions: new Set<string>(),
  _ec2CredIds: new Set<string>(),

  loadCredentials: async () => {
    const { walletSessionReady, initSession } = get()
    if (!walletSessionReady) await initSession()

    let apiCreds: StoredCredential[] = []
    if (get().walletSessionReady) {
      try {
        const wCreds = await waltidWallet.listCredentials()
        apiCreds = wCreds.filter((c) => !c.deletedOn).map(waltidCredToStored)
      } catch (err) {
        console.warn('[waltid] Failed to load credentials from local API:', err)
      }
      const ec2Ids = new Set<string>()
      if (__DEV__ && ec2WaltidWallet.walletId) {
        try {
          const ec2Creds = await ec2WaltidWallet.listCredentials()
          const ec2Mapped = ec2Creds.filter((c) => !c.deletedOn).map(waltidCredToStored)
          for (const c of ec2Mapped) {
            ec2Ids.add(c.localId)
            if (!apiCreds.find((a) => a.localId === c.localId)) apiCreds.push(c)
          }
        } catch (err) {
          console.warn('[waltid] Failed to load credentials from EC2 API:', err)
        }
      }
      set({ _ec2CredIds: ec2Ids })
    }


    const localCreds = await loadAllCredentials()
    const merged = [
      ...apiCreds,
      ...localCreds.filter((d) => !apiCreds.find((a) => a.localId === d.localId)),
    ]

    const pending = get()._pendingDeletions
    const filtered = pending.size > 0
      ? merged.filter((c) => !pending.has(c.localId))
      : merged

    set({ credentials: filtered })
  },

  addCredential: async (_cred) => {
   
    await get().loadCredentials()
  },

  removeCredential: async (localId) => {

    const newPending = new Set(get()._pendingDeletions)
    newPending.add(localId)

    set((s) => ({
      _pendingDeletions: newPending,
      credentials: s.credentials.filter((c) => c.localId !== localId),
    }))


    if (get().walletSessionReady) {
      let deleted = false

      try {
        await waltidWallet.deleteCredential(localId)
        deleted = true
      } catch { /* not in local wallet, try other sources */ }

      if (!deleted && __DEV__ && ec2WaltidWallet.walletId) {
        try {
          await ec2WaltidWallet.deleteCredential(localId)
          deleted = true
        } catch { /* not in EC2 wallet either */ }
      }

      if (!deleted) {
        try {
          await deleteCredential(localId)
        } catch (err: any) {
          const restored = new Set(get()._pendingDeletions)
          restored.delete(localId)
          set({ _pendingDeletions: restored })
          await get().loadCredentials()
          throw new Error(err?.message ?? 'Failed to delete credential')
        }
      }
    } else {
      await deleteCredential(localId)
    }

    await get().loadCredentials()

    setTimeout(() => {
      const cleaned = new Set(get()._pendingDeletions)
      cleaned.delete(localId)
      set({ _pendingDeletions: cleaned })
    }, 5000)
  },

  loadDemoCredentials: async () => {
    const existing = get().credentials.map((c) => c.localId)
    const toAdd = demoCredentials.filter((d) => !existing.includes(d.localId))
    for (const cred of toAdd) {
      await saveCredential(cred)
    }
    await get().loadCredentials()
  },


  pendingRequest: null,
  setPendingRequest: (req) => set({ pendingRequest: req }),

  pendingOffer: null,
  setPendingOffer: (offer) => set({ pendingOffer: offer }),
}))
