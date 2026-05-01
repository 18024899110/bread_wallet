
import { waltidWallet } from './waltidWalletClient'


export async function getHolderDid(): Promise<string | null> {
  return waltidWallet.getDefaultDid()
}


export async function ensureHolderDid(): Promise<string> {
  const did = await waltidWallet.getDefaultDid()
  return did ?? 'pending'
}
