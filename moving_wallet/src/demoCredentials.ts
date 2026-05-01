
import { StoredCredential } from './types'

const ISSUER = {
  id: 'did:web:gov.au.identity',
  name: 'Australian Government Identity Authority',
}

const HOLDER_DID = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'

export const demoCredentials: StoredCredential[] = [

  {
    localId: 'demo-national-id',
    addedAt: '2026-01-15T10:00:00Z',
    assuranceLevel: 'high',
    holderDid: HOLDER_DID,
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/ns/credentials/v2',
      ],
      id: 'urn:uuid:demo-national-id-001',
      type: ['VerifiableCredential', 'NationalID'],
      issuer: ISSUER,
      issuanceDate: '2026-01-15T10:00:00Z',
      expirationDate: '2031-01-15T10:00:00Z',
      credentialStatus: {
        id: 'https://gov.au.identity/status/1#0',
        type: 'StatusList2021Entry',
      },
      credentialSubject: {
        id: HOLDER_DID,
        givenName: 'Alex',
        familyName: 'Johnson',
        dateOfBirth: '1990-06-15',
        documentNumber: 'AU123456789',
        nationality: 'Australian',
        sex: 'M',
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: '2026-01-15T10:00:00Z',
        proofPurpose: 'assertionMethod',
        verificationMethod: 'did:web:gov.au.identity#key-1',
        jws: 'DEMO_PROOF_NOT_FOR_PRODUCTION',
      },
    },
  },


  {
    localId: 'demo-mdl',
    addedAt: '2026-01-15T10:02:00Z',
    assuranceLevel: 'high',
    holderDid: HOLDER_DID,
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/ns/credentials/v2',
        'https://w3id.org/vdl/v1',
      ],
      id: 'urn:uuid:demo-mdl-001',
      type: ['VerifiableCredential', 'mDL'],
      issuer: { id: 'did:web:rms.vic.gov.au', name: 'Roads & Maritime Services NSW' },
      issuanceDate: '2026-01-15T10:02:00Z',
      expirationDate: '2030-01-15T10:02:00Z',
      credentialStatus: {
        id: 'https://rms.vic.gov.au/status/1#42',
        type: 'StatusList2021Entry',
      },
      credentialSubject: {
        id: HOLDER_DID,
        // ISO 18013-5 mDL mandatory fields
        familyName: 'Johnson',
        givenName: 'Alex',
        dateOfBirth: '1990-06-15',
        issuingCountry: 'AU',
        issuingAuthority: 'NSW Roads & Maritime Services',
        documentNumber: 'NSW-DL-987654',
        drivingPrivileges: [
          { vehicleCategory: 'C', issueDate: '2010-06-20', expiryDate: '2030-01-15' },
        ],
        unDistinguishingSign: 'AUS',
        portrait: '[biometric_portrait_not_included_in_demo]',
        // Selectively disclosable (SD-JWT in Sprint 2)
        address: '42 Innovation Drive, Sydney NSW 2000',
        sex: 'M',
        height: 178,
        eyeColour: 'BRN',
        age_over_18: true,
        age_over_21: true,
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: '2026-01-15T10:02:00Z',
        proofPurpose: 'assertionMethod',
        verificationMethod: 'did:web:rms.vic.gov.au#key-1',
        jws: 'DEMO_PROOF_NOT_FOR_PRODUCTION',
      },
    },
  },


  {
    localId: 'demo-address',
    addedAt: '2026-01-15T10:05:00Z',
    assuranceLevel: 'substantial',
    holderDid: HOLDER_DID,
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/ns/credentials/v2',
      ],
      id: 'urn:uuid:demo-address-001',
      type: ['VerifiableCredential', 'AddressCredential'],
      issuer: ISSUER,
      issuanceDate: '2026-01-15T10:05:00Z',
      expirationDate: '2027-01-15T10:05:00Z',
      credentialStatus: {
        id: 'https://gov.au.identity/status/1#1',
        type: 'StatusList2021Entry',
      },
      credentialSubject: {
        id: HOLDER_DID,
        streetAddress: '42 Innovation Drive',
        locality: 'Sydney',
        region: 'NSW',
        postalCode: '2000',
        country: 'AU',
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: '2026-01-15T10:05:00Z',
        proofPurpose: 'assertionMethod',
        verificationMethod: 'did:web:gov.au.identity#key-1',
        jws: 'DEMO_PROOF_NOT_FOR_PRODUCTION',
      },
    },
  },


  {
    localId: 'demo-proof-of-age',
    addedAt: '2026-01-15T10:10:00Z',
    assuranceLevel: 'high',
    holderDid: HOLDER_DID,
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/ns/credentials/v2',
      ],
      id: 'urn:uuid:demo-age-001',
      type: ['VerifiableCredential', 'ProofOfAge'],
      issuer: ISSUER,
      issuanceDate: '2026-01-15T10:10:00Z',
      expirationDate: '2031-01-15T10:10:00Z',
      credentialStatus: {
        id: 'https://gov.au.identity/status/1#2',
        type: 'StatusList2021Entry',
      },
      credentialSubject: {
        id: HOLDER_DID,

        ageOver18: true,
        ageOver21: true,

        dateOfBirth: '1990-06-15',
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: '2026-01-15T10:10:00Z',
        proofPurpose: 'assertionMethod',
        verificationMethod: 'did:web:gov.au.identity#key-1',
        jws: 'DEMO_PROOF_NOT_FOR_PRODUCTION',
      },
    },
  },
]
