import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))

const DATA_DIR = join(__dirname, '../../data')
const KEYS_FILE = join(DATA_DIR, 'keys.json')

export interface IssuerKeys {
  privateKeyHex: string
  publicKeyHex: string
  did: string
}

function toBase58(bytes: Uint8Array): string {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let n = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''))
  let r = ''
  while (n > 0n) { r = A[Number(n % 58n)] + r; n /= 58n }
  for (const b of bytes) { if (b !== 0) break; r = '1' + r }
  return r
}

let _cached: IssuerKeys | null = null

export async function getOrCreateKeys(): Promise<IssuerKeys> {
  if (_cached) return _cached
  mkdirSync(DATA_DIR, { recursive: true })
  if (existsSync(KEYS_FILE)) {
    _cached = JSON.parse(readFileSync(KEYS_FILE, 'utf-8')) as IssuerKeys
    return _cached
  }
  const priv = ed.utils.randomPrivateKey()
  const pub = await ed.getPublicKeyAsync(priv)
  const combined = new Uint8Array([0xed, 0x01, ...pub])
  _cached = {
    privateKeyHex: Buffer.from(priv).toString('hex'),
    publicKeyHex: Buffer.from(pub).toString('hex'),
    did: `did:key:z${toBase58(combined)}`,
  }
  writeFileSync(KEYS_FILE, JSON.stringify(_cached, null, 2))
  return _cached
}

export function getPrivateKeyJwk(k: IssuerKeys) {
  return {
    kty: 'OKP', crv: 'Ed25519',
    d: Buffer.from(k.privateKeyHex, 'hex').toString('base64url'),
    x: Buffer.from(k.publicKeyHex, 'hex').toString('base64url'),
  }
}
