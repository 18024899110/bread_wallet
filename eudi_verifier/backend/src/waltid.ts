const VERIFIER_URL = (process.env.WALTID_VERIFIER_URL || 'http://localhost:7003').replace(/\/$/, '')

export interface PresentationSession {
  id: string
  requestUrl: string
}

export interface VerificationResult {
  state: 'pending' | 'success' | 'error'
  subject?: Record<string, unknown>
  error?: string
}

export const SCENARIOS = {
  bank: {
    label: 'Bank Onboarding',
    description: 'Verify age (18+) before opening account',
    credentialType: 'ProofOfAge',
    requestedFields: ['ageOver18', 'dateOfBirth'],
  },
  border: {
    label: 'Border Check',
    description: 'Verify national identity for cross-border travel',
    credentialType: 'NationalID',
    requestedFields: ['givenName', 'familyName', 'dateOfBirth', 'nationality', 'documentNumber'],
  },
  driving: {
    label: 'Driving Licence Check',
    description: 'Verify mobile driving licence for traffic stop or rental',
    credentialType: 'mDL',
    requestedFields: ['givenName', 'familyName', 'dateOfBirth', 'documentNumber', 'drivingPrivileges'],
  },
  address: {
    label: 'Address Verification',
    description: 'Verify residential address for delivery or KYC',
    credentialType: 'AddressCredential',
    requestedFields: ['givenName', 'familyName', 'streetAddress', 'locality', 'postalCode', 'country'],
  },
  healthcare: {
    label: 'Healthcare Access',
    description: 'Verify health insurance membership at clinic check-in',
    credentialType: 'HealthInsuranceCard',
    requestedFields: ['givenName', 'familyName', 'memberNumber', 'insurerName', 'planType', 'validUntil'],
  },
  student: {
    label: 'Student Discount',
    description: 'Verify student enrolment for discounts and access',
    credentialType: 'StudentID',
    requestedFields: ['givenName', 'familyName', 'studentNumber', 'institution', 'major'],
  },
  vehicle: {
    label: 'Vehicle Registration',
    description: 'Verify vehicle ownership at inspection or resale',
    credentialType: 'VehicleRegistration',
    requestedFields: ['ownerGivenName', 'ownerFamilyName', 'licensePlate', 'vehicleMake', 'vehicleModel', 'vehicleYear'],
  },
  professional: {
    label: 'Professional Licence',
    description: 'Verify professional credentials for regulated services',
    credentialType: 'ProfessionalLicense',
    requestedFields: ['givenName', 'familyName', 'licenseNumber', 'licenseType', 'issuingAuthority', 'validUntil'],
  },
  passport: {
    label: 'Passport Verification',
    description: 'Verify passport identity for hotel check-in or travel',
    credentialType: 'PassportCredential',
    requestedFields: ['givenName', 'familyName', 'dateOfBirth', 'documentNumber', 'nationality', 'validUntil'],
  },
  social: {
    label: 'Social Security',
    description: 'Verify social security number for benefits or employment',
    credentialType: 'SocialSecurityCredential',
    requestedFields: ['givenName', 'familyName', 'dateOfBirth', 'ssn'],
  },
  banking: {
    label: 'Bank Account Verification',
    description: 'Verify IBAN and account holder for financial transactions',
    credentialType: 'BankAccountCredential',
    requestedFields: ['accountHolderName', 'iban', 'bankName', 'accountType'],
  },
  employment: {
    label: 'Employment Verification',
    description: 'Verify employment status for housing or credit applications',
    credentialType: 'EmploymentCredential',
    requestedFields: ['givenName', 'familyName', 'employerName', 'jobTitle', 'employmentType'],
  },
  vaccination: {
    label: 'Vaccination Certificate',
    description: 'Verify vaccination status for travel or event entry',
    credentialType: 'VaccinationCredential',
    requestedFields: ['givenName', 'familyName', 'vaccineType', 'vaccinationDate', 'validUntil'],
  },
  disability: {
    label: 'Disability Credential',
    description: 'Verify disability status for accessible services',
    credentialType: 'DisabilityCredential',
    requestedFields: ['givenName', 'familyName', 'disabilityType', 'supportLevel'],
  },
} as const

export type ScenarioKey = keyof typeof SCENARIOS

function requireFields(subject: Record<string, unknown>, fields: string[]): string | null {
  const missing = fields.filter(f => {
    const v = subject[f]
    return v === undefined || v === null || v === ''
  })
  return missing.length > 0 ? `Missing required fields: ${missing.join(', ')}.` : null
}

function validateDob(subject: Record<string, unknown>): string | null {
  const dob = subject['dateOfBirth'] as string | undefined
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime()) || birth.getTime() >= Date.now()) return `Invalid date of birth: ${dob}.`
  return null
}

function validateClaims(scenario: ScenarioKey, subject: Record<string, unknown>): string | null {
  switch (scenario) {
    case 'bank': {
      const ageOver18 = subject['ageOver18']
      if (ageOver18 !== true && ageOver18 !== 'true') return 'Credential does not confirm age over 18.'
      const dob = subject['dateOfBirth'] as string | undefined
      if (dob) {
        const birth = new Date(dob)
        if (!isNaN(birth.getTime()) && (Date.now() - birth.getTime()) / 86400000 < 365.25 * 18)
          return `Date of birth (${dob}) indicates the holder is under 18.`
      }
      return null
    }
    case 'border':
      return requireFields(subject, ['givenName', 'familyName', 'dateOfBirth', 'nationality', 'documentNumber'])
        ?? validateDob(subject)
    case 'driving':
      return requireFields(subject, ['givenName', 'familyName', 'dateOfBirth', 'documentNumber'])
    case 'address':
      return requireFields(subject, ['givenName', 'familyName', 'streetAddress', 'locality', 'postalCode', 'country'])
    case 'healthcare':
      return requireFields(subject, ['givenName', 'familyName', 'memberNumber'])
    case 'student':
      return requireFields(subject, ['givenName', 'familyName', 'studentNumber', 'institution'])
    case 'vehicle':
      return requireFields(subject, ['licensePlate'])
    case 'professional':
      return requireFields(subject, ['givenName', 'familyName', 'licenseNumber', 'licenseType'])
    case 'passport':
      return requireFields(subject, ['givenName', 'familyName', 'dateOfBirth', 'documentNumber', 'nationality'])
        ?? validateDob(subject)
    case 'social':
      return requireFields(subject, ['givenName', 'familyName', 'ssn'])
    case 'banking':
      return requireFields(subject, ['accountHolderName', 'iban'])
    case 'employment':
      return requireFields(subject, ['givenName', 'familyName', 'employerName'])
    case 'vaccination':
      return requireFields(subject, ['givenName', 'familyName', 'vaccineType', 'vaccinationDate'])
    case 'disability':
      return requireFields(subject, ['givenName', 'familyName', 'disabilityType'])
    default:
      return null
  }
}

export async function createPresentationRequest(scenario: ScenarioKey): Promise<PresentationSession> {
  const { credentialType } = SCENARIOS[scenario]
  const body = {
    request_credentials: [
      {
        type: credentialType,
        format: 'vc+sd-jwt',
      },
    ],
  }

  const res = await fetch(`${VERIFIER_URL}/openid4vc/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Walt.id verifier error (${res.status}): ${await res.text()}`)

  const requestUrl = (await res.text()).trim()
  const stateMatch = requestUrl.match(/[?&]state=([^&]+)/)
  const id = stateMatch ? decodeURIComponent(stateMatch[1]) : requestUrl

  const verifierEnv = process.env.VERIFIER_ENV ?? 'local'
  const sep = requestUrl.includes('?') ? '&' : '?'
  const enhancedUrl = `${requestUrl}${sep}credential_type=${encodeURIComponent(credentialType)}&verifier_env=${verifierEnv}`

  return { id, requestUrl: enhancedUrl }
}

export async function getVerificationResult(sessionId: string, scenario: ScenarioKey): Promise<VerificationResult> {
  const res = await fetch(`${VERIFIER_URL}/openid4vc/session/${encodeURIComponent(sessionId)}`)

  if (!res.ok) {
    if (res.status === 404) return { state: 'pending' }
    return { state: 'error', error: `Status check failed: ${res.status}` }
  }

  const data = await res.json() as any

  const vpToken = data.tokenResponse?.vp_token || data.vp_token
  if (!vpToken) {
    return { state: 'pending' }
  }

  const rawSubject = extractSubject(vpToken)

  // Only expose fields the scenario actually requested plus portrait for face check.
  // With SD-JWT, the wallet already enforces user choices at the protocol level —
  // this whitelist is a defense-in-depth layer that guarantees no extra claims leak
  // through regardless of wallet behavior or format fallback.
  const allowed = new Set<string>([...(SCENARIOS[scenario].requestedFields as readonly string[]), 'portrait'])
  const subject: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rawSubject)) {
    if (allowed.has(k)) subject[k] = v
  }

  const violation = validateClaims(scenario, subject)
  if (violation) {
    return { state: 'error', error: violation, subject }
  }

  return { state: 'success', subject }
}

// ─── SD-JWT helpers ───────────────────────────────────────────────────────────

function b64urlDecode(s: string): string {
  // Pad to a multiple of 4 before decoding
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  return atob(pad ? padded + '='.repeat(4 - pad) : padded)
}

/**
 * Parse an SD-JWT string (header.payload.sig~disc1~disc2~...~KB-JWT?) and
 * return the union of non-selective payload claims and all disclosed claims.
 * Claims the holder chose NOT to disclose simply won't appear — that is the
 * whole point of SD-JWT selective disclosure.
 */
function extractFromSdJwt(sdJwt: string): Record<string, unknown> {
  const parts = sdJwt.split('~')
  const jwtPart = parts[0]                  // header.payload.signature
  const disclosureParts = parts.slice(1)    // disclosures + optional KB-JWT at end

  // Decode the SD-JWT issuer-signed payload
  const jwtSegments = jwtPart.split('.')
  if (jwtSegments.length < 2) return {}

  let payload: any
  try {
    payload = JSON.parse(b64urlDecode(jwtSegments[1]))
  } catch {
    return {}
  }

  // Collect base (non-selective) claims from credentialSubject or top-level payload.
  // SD-JWT VCs may embed claims directly at the top level or inside vc.credentialSubject.
  const rawCs = payload.vc?.credentialSubject ?? payload.credentialSubject ?? payload
  const subject: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rawCs as Record<string, unknown>)) {
    if (k !== '_sd' && k !== '_sd_alg' && !k.startsWith('_')) {
      subject[k] = v
    }
  }

  // Decode each disclosure and add its claim.
  // A disclosure is base64url([salt, claim_name, claim_value]).
  // Skip the last segment if it looks like a full JWT (Key Binding JWT has 2 dots).
  for (const disc of disclosureParts) {
    if (!disc) continue
    // KB-JWT has exactly 2 "." separators → skip it
    if ((disc.match(/\./g) ?? []).length === 2) continue
    try {
      const decoded = JSON.parse(b64urlDecode(disc))
      if (Array.isArray(decoded) && decoded.length === 3) {
        const [, name, value] = decoded as [string, string, unknown]
        if (typeof name === 'string') subject[name] = value
      }
    } catch { /* malformed disclosure – skip */ }
  }

  return subject
}

/**
 * Extract credentialSubject claims from a VP token, supporting both:
 *   • vc+sd-jwt  — SD-JWT string (contains "~")
 *   • jwt_vc_json — JWT VP wrapping a JWT VC (fallback for older credentials)
 */
function extractSubject(vpToken: unknown): Record<string, unknown> {
  try {
    const token = typeof vpToken === 'string' ? vpToken
      : Array.isArray(vpToken) ? String(vpToken[0]) : ''

    if (!token) return {}

    // SD-JWT Verifiable Presentation: SD-JWT~disc1~disc2~...~KB-JWT
    if (token.includes('~')) {
      return extractFromSdJwt(token)
    }

    // Regular JWT VP (fallback — handles jwt_vc_json credentials in the wallet)
    const parts = token.split('.')
    if (parts.length < 2) return {}
    const vpPayload = JSON.parse(b64urlDecode(parts[1])) as any

    const vc = vpPayload.vp?.verifiableCredential?.[0]
    if (!vc) return {}

    if (typeof vc === 'string') {
      // Nested SD-JWT VC inside a JWT VP envelope
      if (vc.includes('~')) return extractFromSdJwt(vc)

      const vcParts = vc.split('.')
      if (vcParts.length < 2) return {}
      const vcPayload = JSON.parse(b64urlDecode(vcParts[1])) as any
      return (vcPayload.vc?.credentialSubject || vcPayload.credentialSubject || {}) as Record<string, unknown>
    }

    return (vc.credentialSubject || {}) as Record<string, unknown>
  } catch {
    return {}
  }
}
