import { config } from './config'

export interface WaltidCredential {
  id: string
  document: string          // raw JWT string
  addedOn: string
  pending: boolean
  parsedDocument?: Record<string, unknown> | null
  deletedOn?: string | null
}

export interface WaltidDid {
  did: string
  default: boolean
  keyId?: string
}

const REQUEST_TIMEOUT_MS = 10000

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

class WaltidWalletClient {
  private token: string | null = null
  walletId: string | null = null
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  setToken(token: string) { this.token = token }
  setWalletId(id: string) { this.walletId = id }

  private get authHeader(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {}
  }

  private checkSession() {
    if (!this.walletId) throw new Error('Wallet session not initialised — call initSession first')
  }


  async createAccount(email: string, password: string): Promise<void> {
    const res = await fetchWithTimeout(`${this.baseUrl}/wallet-api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'EUDI Wallet', email, password, type: 'email' }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any
      throw new Error(err.message ?? `Create account failed: ${res.status}`)
    }
  }

  async login(email: string, password: string): Promise<string> {
    const res = await fetchWithTimeout(`${this.baseUrl}/wallet-api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, type: 'email' }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any
      throw new Error(err.message ?? `Login failed: ${res.status}`)
    }
    const data = await res.json() as any
    const token = data.token as string
    this.setToken(token)
    return token
  }


  async getFirstWalletId(): Promise<string> {
    const res = await fetchWithTimeout(`${this.baseUrl}/wallet-api/wallet/accounts/wallets`, {
      headers: { 'Content-Type': 'application/json', ...this.authHeader },
    })
    if (!res.ok) throw new Error(`Failed to list wallets: ${res.status}`)
    const data = await res.json() as any
    const id = (data.wallets as any[])?.[0]?.id as string | undefined
    if (!id) throw new Error('No wallet found for this account')
    this.setWalletId(id)
    return id
  }


  async listCredentials(): Promise<WaltidCredential[]> {
    this.checkSession()
    const res = await fetchWithTimeout(`${this.baseUrl}/wallet-api/wallet/${this.walletId}/credentials`, {
      headers: { 'Content-Type': 'application/json', ...this.authHeader },
    })
    if (!res.ok) throw new Error(`Failed to list credentials: ${res.status}`)
    return res.json()
  }

  async getCredential(credentialId: string): Promise<WaltidCredential> {
    this.checkSession()
    const res = await fetchWithTimeout(
      `${this.baseUrl}/wallet-api/wallet/${this.walletId}/credentials/${encodeURIComponent(credentialId)}`,
      { headers: { 'Content-Type': 'application/json', ...this.authHeader } },
    )
    if (!res.ok) throw new Error(`Failed to get credential: ${res.status}`)
    return res.json()
  }

  async deleteCredential(credentialId: string): Promise<void> {
    this.checkSession()
    const url = `${this.baseUrl}/wallet-api/wallet/${this.walletId}/credentials/${encodeURIComponent(credentialId)}`
    console.log('[waltid] DELETE', url)
    const res = await fetchWithTimeout(url, { method: 'DELETE', headers: { ...this.authHeader } })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[waltid] delete failed:', res.status, body)
      throw new Error(`Failed to delete credential: ${res.status} ${body}`)
    }
  }

  async useOfferRequest(offerUrl: string, did?: string): Promise<WaltidCredential[]> {
    this.checkSession()
    const params = new URLSearchParams({ requireUserInput: 'false' })
    if (did) params.set('did', did)
    const res = await fetchWithTimeout(
      `${this.baseUrl}/wallet-api/wallet/${this.walletId}/exchange/useOfferRequest?${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', ...this.authHeader },
        body: offerUrl,
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status))
      throw new Error(`Credential offer failed: ${text}`)
    }
    return res.json()
  }


  async resolvePresentationRequest(presentationRequestUrl: string): Promise<any> {
    this.checkSession()
    const res = await fetchWithTimeout(
      `${this.baseUrl}/wallet-api/wallet/${this.walletId}/exchange/resolvePresentationRequest`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', ...this.authHeader },
        body: presentationRequestUrl,
      },
    )
    if (!res.ok) throw new Error(`Failed to resolve presentation request: ${res.status}`)
    return res.json()
  }

  async usePresentationRequest(
    presentationRequestUrl: string,
    did: string,
    selectedCredentialIds: string[],
  ): Promise<any> {
    this.checkSession()
    const res = await fetchWithTimeout(
      `${this.baseUrl}/wallet-api/wallet/${this.walletId}/exchange/usePresentationRequest`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader },
        body: JSON.stringify({
          did,
          presentationRequest: presentationRequestUrl,
          selectedCredentials: selectedCredentialIds,
        }),
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status))
      throw new Error(`Presentation failed: ${text}`)
    }
    return res.json()
  }

  async listDids(): Promise<WaltidDid[]> {
    this.checkSession()
    const res = await fetchWithTimeout(`${this.baseUrl}/wallet-api/wallet/${this.walletId}/dids`, {
      headers: { 'Content-Type': 'application/json', ...this.authHeader },
    })
    if (!res.ok) throw new Error(`Failed to list DIDs: ${res.status}`)
    return res.json()
  }

  async createDid(method: 'key' | 'jwk' = 'key'): Promise<string> {
    this.checkSession()
    const res = await fetchWithTimeout(
      `${this.baseUrl}/wallet-api/wallet/${this.walletId}/dids/create/${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeader },
        body: JSON.stringify({}),
      },
    )
    if (!res.ok) throw new Error(`Failed to create DID: ${res.status}`)
    const data = await res.json() as any
    return typeof data === 'string' ? data : (data.did as string)
  }

  async getDefaultDid(): Promise<string | null> {
    try {
      const dids = await this.listDids()
      const def = dids.find((d) => d.default) ?? dids[0]
      return def?.did ?? null
    } catch {
      return null
    }
  }

  async ensureDid(): Promise<string> {
    const existing = await this.getDefaultDid()
    if (existing) return existing
    return this.createDid('key')
  }
}

export const waltidWallet = new WaltidWalletClient(config.waltidWalletUrl)
export const ec2WaltidWallet = new WaltidWalletClient(`http://3.26.11.128:7001`)
