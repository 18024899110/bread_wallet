import { IssuerKeys, getPrivateKeyJwk } from './keys'

const WALTID_URL = process.env.WALTID_ISSUER_URL || 'http://localhost:7002'
const WALTID_PUBLIC = process.env.WALTID_PUBLIC_URL || 'http://localhost:7002'

type AppData = {
  given_name: string; family_name: string; date_of_birth: string
  document_number: string; street_address: string; locality: string
  region: string; postal_code: string; country: string
  nationality: string; sex: string; height: number
  face_image?: string; extra_data?: string
}

function parseExtra(app: AppData): Record<string, string> {
  try { return JSON.parse(app.extra_data || '{}') } catch { return {} }
}

function buildSubject(type: string, d: AppData) {
  const portrait = d.face_image && d.face_image.length > 0 ? { portrait: d.face_image } : {}
  const extra = parseExtra(d)

  switch (type) {
    case 'NationalID':
      return { givenName: d.given_name, familyName: d.family_name,
        dateOfBirth: d.date_of_birth, documentNumber: d.document_number,
        nationality: d.nationality, sex: d.sex, ...portrait }

    case 'mDL':
      return { givenName: d.given_name, familyName: d.family_name,
        dateOfBirth: d.date_of_birth, issuingCountry: d.country,
        issuingAuthority: 'EUDI Demo Authority', documentNumber: d.document_number,
        drivingPrivileges: [{ vehicleCategory: 'C', issueDate: '2020-01-01', expiryDate: '2030-01-01' }],
        address: `${d.street_address}, ${d.locality} ${d.region} ${d.postal_code}`,
        sex: d.sex, height: d.height, age_over_18: true, age_over_21: true, ...portrait }

    case 'AddressCredential':
      return { givenName: d.given_name, familyName: d.family_name,
        streetAddress: d.street_address, locality: d.locality,
        region: d.region, postalCode: d.postal_code, country: d.country }

    case 'ProofOfAge':
      return { ageOver18: true, ageOver21: true, dateOfBirth: d.date_of_birth }

    case 'HealthInsuranceCard':
      return { givenName: d.given_name, familyName: d.family_name,
        dateOfBirth: d.date_of_birth, memberNumber: d.document_number,
        insurerName: extra.insurer_name || '', planType: extra.plan_type || '',
        validUntil: extra.valid_until || '' }

    case 'StudentID':
      return { givenName: d.given_name, familyName: d.family_name,
        dateOfBirth: d.date_of_birth, studentNumber: d.document_number,
        institution: extra.institution || '', major: extra.major || '',
        enrollmentDate: extra.enrollment_date || '', ...portrait }

    case 'VehicleRegistration':
      return { ownerGivenName: d.given_name, ownerFamilyName: d.family_name,
        licensePlate: d.document_number, vehicleMake: extra.vehicle_make || '',
        vehicleModel: extra.vehicle_model || '', vehicleYear: extra.vehicle_year || '',
        vin: extra.vin || '' }

    case 'ProfessionalLicense':
      return { givenName: d.given_name, familyName: d.family_name,
        licenseNumber: d.document_number, licenseType: extra.license_type || '',
        issuingAuthority: extra.issuing_authority || '', validUntil: extra.valid_until || '',
        jurisdiction: extra.jurisdiction || '', ...portrait }

    case 'PassportCredential':
      return { givenName: d.given_name, familyName: d.family_name,
        dateOfBirth: d.date_of_birth, documentNumber: d.document_number,
        nationality: d.nationality, sex: d.sex,
        placeOfBirth: extra.place_of_birth || '', validUntil: extra.valid_until || '', ...portrait }

    case 'SocialSecurityCredential':
      return { givenName: d.given_name, familyName: d.family_name,
        dateOfBirth: d.date_of_birth, ssn: d.document_number }

    case 'BankAccountCredential':
      return { accountHolderName: `${d.given_name} ${d.family_name}`,
        givenName: d.given_name, familyName: d.family_name,
        iban: d.document_number, bankName: extra.bank_name || '',
        accountType: extra.account_type || '' }

    case 'EmploymentCredential':
      return { givenName: d.given_name, familyName: d.family_name,
        employeeId: d.document_number, employerName: extra.employer_name || '',
        jobTitle: extra.job_title || '', employmentType: extra.employment_type || '',
        startDate: extra.start_date || '' }

    case 'VaccinationCredential':
      return { givenName: d.given_name, familyName: d.family_name,
        dateOfBirth: d.date_of_birth, certificateNumber: d.document_number,
        vaccineType: extra.vaccine_type || '', vaccineName: extra.vaccine_name || '',
        vaccinationDate: extra.vaccination_date || '', validUntil: extra.valid_until || '',
        issuerOrganization: extra.issuer_organization || '' }

    case 'DisabilityCredential':
      return { givenName: d.given_name, familyName: d.family_name,
        dateOfBirth: d.date_of_birth, documentNumber: d.document_number,
        disabilityType: extra.disability_type || '', supportLevel: extra.disability_level || '',
        ...portrait }

    default:
      return { givenName: d.given_name, familyName: d.family_name, ...portrait }
  }
}

// Mark every top-level credentialSubject field as selectively disclosable.
// Complex objects (arrays, nested objects) are kept as-is since SD-JWT
// selective disclosure operates at the top-level claim granularity.
function buildSelectiveDisclosure(subject: Record<string, unknown>): Record<string, { sd: boolean }> {
  return Object.fromEntries(
    Object.keys(subject).map(k => [k, { sd: true }])
  )
}

const WALTID_CONFIG_ID: Record<string, string> = {
  NationalID:               'NationalID_vc+sd-jwt',
  mDL:                      'mDL_vc+sd-jwt',
  AddressCredential:        'AddressCredential_vc+sd-jwt',
  ProofOfAge:               'ProofOfAge_vc+sd-jwt',
  HealthInsuranceCard:      'HealthInsuranceCard_vc+sd-jwt',
  StudentID:                'StudentID_vc+sd-jwt',
  VehicleRegistration:      'VehicleRegistration_vc+sd-jwt',
  ProfessionalLicense:      'ProfessionalLicense_vc+sd-jwt',
  PassportCredential:       'PassportCredential_vc+sd-jwt',
  SocialSecurityCredential: 'SocialSecurityCredential_vc+sd-jwt',
  BankAccountCredential:    'BankAccountCredential_vc+sd-jwt',
  EmploymentCredential:     'EmploymentCredential_vc+sd-jwt',
  VaccinationCredential:    'VaccinationCredential_vc+sd-jwt',
  DisabilityCredential:     'DisabilityCredential_vc+sd-jwt',
}

export async function createOffer(keys: IssuerKeys, credentialType: string, app: AppData): Promise<string> {
  const configId = WALTID_CONFIG_ID[credentialType] ?? `${credentialType}_vc+sd-jwt`
  const credSubject = buildSubject(credentialType, app)

  const body = {
    issuerKey: { type: 'jwk', jwk: getPrivateKeyJwk(keys) },
    issuerDid: keys.did,
    credentialConfigurationId: configId,
    credentialData: {
      '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential', credentialType],
      credentialSubject: credSubject,
    },
    selectiveDisclosure: {
      fields: buildSelectiveDisclosure(credSubject),
    },
    mapping: {
      id: '<uuid>',
      issuer: { id: '<issuerDid>' },
      issuanceDate: '<timestamp>',
      expirationDate: '<timestamp-in:1825d>',
      credentialSubject: { id: '<subjectDid>' },
    },
  }

  const res = await fetch(`${WALTID_URL}/openid4vc/sdjwt/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`walt.id error (${res.status}): ${await res.text()}`)

  const offerDeepLink = await res.text()
  const dlUrl = new URL(offerDeepLink.trim())
  const offerUri = dlUrl.searchParams.get('credential_offer_uri')
  if (!offerUri) throw new Error('walt.id did not return credential_offer_uri')

  const internalOfferUri = offerUri
    .replace('http://localhost:7002', WALTID_URL)
    .replace('https://localhost:7002', WALTID_URL)
    .replace(WALTID_PUBLIC, WALTID_URL)

  const offerRes = await fetch(internalOfferUri)
  if (!offerRes.ok) throw new Error(`Failed to fetch offer JSON: ${offerRes.status}`)
  const offerJson = await offerRes.json() as Record<string, unknown>

  const fixedJson = JSON.parse(
    JSON.stringify(offerJson)
      .replace(/http:\/\/localhost:7002/g, WALTID_PUBLIC)
      .replace(/https:\/\/localhost:7002/g, WALTID_PUBLIC)
      .replace(new RegExp(WALTID_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), WALTID_PUBLIC)
  )

  const inlineParam = encodeURIComponent(JSON.stringify(fixedJson))
  return `openid-credential-offer://?credential_offer=${inlineParam}&credential_type=${encodeURIComponent(credentialType)}`
}

export async function pingWaltid(): Promise<boolean> {
  try {
    const r = await fetch(`${WALTID_URL}/`, { signal: AbortSignal.timeout(3000), redirect: 'manual' })
    return r.status < 500
  } catch { return false }
}
