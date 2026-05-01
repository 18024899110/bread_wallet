
export type AssuranceLevel = 'low' | 'substantial' | 'high'

export interface IssuerMetadata {
  id: string
  name: string
}

export interface W3CVerifiableCredential {
  '@context': string[]
  id: string
  type: string[]
  issuer: IssuerMetadata
  issuanceDate: string
  expirationDate?: string
  // EUDI: assurance level of the credential
  credentialStatus?: {
    id: string
    type: string
  }
  credentialSubject: Record<string, unknown> & { id?: string }
  proof?: {
    type: string
    created: string
    proofPurpose: string
    verificationMethod: string
    jws?: string
  }
}

export interface StoredCredential {
  localId: string
  credential: W3CVerifiableCredential
  addedAt: string
  assuranceLevel: AssuranceLevel
  // DID of the holder this credential was issued to
  holderDid?: string
}

export interface PresentationRequest {
  verifierName: string
  verifierDid?: string
  requestedClaims: string[]
  credentialType: string
  purpose?: string
  nonce?: string
  responseUri?: string
  rawUrl?: string            // original openid4vp:// URL (passed to waltid API)
}

export type CredentialTypeKey = 'NationalID' | 'mDL' | 'AddressCredential' | 'ProofOfAge'

export interface ClaimDisclosure {
  key: string
  label: string
  value: string
  required: boolean   // if true, cannot be toggled off
}

export interface CredentialOffer {
  credentialIssuer: string   // base URL of the issuer
  credentialType: string     // e.g. 'NationalID'
  preAuthCode: string        // pre-authorized_code
  rawUrl?: string            // original openid-credential-offer:// URL (passed to waltid API)
}
