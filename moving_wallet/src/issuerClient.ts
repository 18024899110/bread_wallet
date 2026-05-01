

import { StoredCredential, CredentialOffer, W3CVerifiableCredential, AssuranceLevel } from './types'
import { waltidWallet, ec2WaltidWallet, WaltidCredential } from './waltidWalletClient'
import { config } from './config'


const ASSURANCE_MAP: Record<string, AssuranceLevel> = {
  NationalID: 'high',          
  mDL: 'high',                 
  ProofOfAge: 'substantial',   
  AddressCredential: 'substantial', 
  EmailCredential: 'low', 
}

function inferAssuranceLevel(types: string[]): AssuranceLevel {
  const credType = types.find((t) => t !== 'VerifiableCredential') ?? ''
  return ASSURANCE_MAP[credType] ?? 'substantial'
}


function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.')
    if (parts.length < 2) return null
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    b64 += '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(atob(b64)) as Record<string, unknown>
  } catch {
    return null
  }
}

export function waltidCredToStored(wc: WaltidCredential): StoredCredential {
  let vc = wc.parsedDocument as W3CVerifiableCredential | null | undefined


  const jwtPayload = wc.document ? decodeJwtPayload(wc.document) : null
  const jwtVc = jwtPayload ? ((jwtPayload.vc ?? jwtPayload) as W3CVerifiableCredential) : null

  console.log('[waltidCredToStored] id:', wc.id,
    'hasDocument:', !!wc.document,
    'documentLen:', wc.document?.length ?? 0,
    'hasParsedDoc:', !!vc,
    'jwtPayloadKeys:', jwtPayload ? Object.keys(jwtPayload) : null,
    'jwtVcSubjectKeys:', jwtVc?.credentialSubject ? Object.keys(jwtVc.credentialSubject as object) : null,
    'hasPortraitInJwt:', !!(jwtVc?.credentialSubject as any)?.portrait,
    'hasPortraitInParsed:', !!(vc?.credentialSubject as any)?.portrait,
  )

  if (!vc && jwtVc) {

    vc = jwtVc

    if (!vc.proof) {
      vc = {
        ...vc,
        proof: {
          type: 'Ed25519Signature2020',
          created: wc.addedOn ?? new Date().toISOString(),
          proofPurpose: 'assertionMethod',
          verificationMethod: `${(vc.issuer as any)?.id ?? vc.issuer ?? ''}#key-1`,
          jws: wc.document,
        },
      }
    }
  }


  if (vc && !(vc.credentialSubject as any)?.portrait && jwtVc?.credentialSubject?.portrait) {
    vc = {
      ...vc,
      credentialSubject: {
        ...vc.credentialSubject,
        portrait: (jwtVc.credentialSubject as any).portrait,
      },
    }
  }

  const safeVc = (vc ?? {}) as W3CVerifiableCredential
  const types: string[] = Array.isArray(safeVc.type) ? safeVc.type : []

  const holderDid = (safeVc.credentialSubject?.id as string | undefined) ?? undefined
  return {
    localId: wc.id,
    credential: safeVc,
    addedAt: wc.addedOn ?? new Date().toISOString(),
    assuranceLevel: inferAssuranceLevel(types),
    holderDid,
  }
}


function buildOfferUrl(offer: CredentialOffer): string {
  const offerData = {
    credential_issuer: offer.credentialIssuer,
    credential_configuration_ids: [offer.credentialType],
    grants: {
      'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
        'pre-authorized_code': offer.preAuthCode,
      },
    },
  }
  return (
    `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(offerData))}` +
    `&credential_type=${encodeURIComponent(offer.credentialType)}`
  )
}

const ISSUER_API_URL = config.issuerApiUrl.replace(/\/$/, '')


async function bindHolderDid(preAuthCode: string, holderDid: string, issuerApiUrl: string): Promise<void> {
  try {
    await fetch(`${issuerApiUrl}/api/applications/bind-did`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pre_auth_code: preAuthCode, holder_did: holderDid }),
    })
  } catch {
    // Network error — silently ignore, credential is already in the wallet
  }
}

function pickWalletForOffer(offerUrl: string) {

  if (__DEV__ && offerUrl.includes('3.26.11.128')) return ec2WaltidWallet
  return waltidWallet
}

export async function redeemCredentialOffer(offer: CredentialOffer): Promise<StoredCredential> {
  const offerUrl = offer.rawUrl ?? buildOfferUrl(offer)
  const wallet = pickWalletForOffer(offerUrl)

  const did = await wallet.ensureDid()
  if (!did) throw new Error('Holder DID could not be created — check wallet-api connection')

  const newCreds = await wallet.useOfferRequest(offerUrl, did)
  if (!newCreds?.length) throw new Error('No credential returned from issuer')

  const issuerApiUrl = (() => {
    try {
      const { protocol, hostname } = new URL(offer.credentialIssuer)
      return `${protocol}//${hostname}:4000`
    } catch {
      return ISSUER_API_URL
    }
  })()
  bindHolderDid(offer.preAuthCode, did, issuerApiUrl)

  const credId = newCreds[0].id
  let fullCred = newCreds[0]
  try {
    fullCred = await wallet.getCredential(credId)
  } catch {
  }

  return waltidCredToStored(fullCred)
}
