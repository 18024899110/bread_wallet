import { useNavigate } from 'react-router-dom'
import s from './Home.module.css'

const SCENARIOS = [
  {
    key: 'bank',
    icon: '🏦',
    title: 'Bank Onboarding',
    description: 'Verify customer age (18+) to open a bank account',
    credential: 'Proof of Age',
    color: '#1a56db',
    fields: ['Age Over 18', 'Date of Birth (optional)'],
  },
  {
    key: 'border',
    icon: '✈️',
    title: 'Border Check',
    description: 'Verify traveller identity for cross-border entry',
    credential: 'National ID',
    color: '#059669',
    fields: ['Given Name', 'Family Name', 'Date of Birth', 'Nationality', 'Document Number'],
  },
  {
    key: 'driving',
    icon: '🚗',
    title: 'Driving Licence Check',
    description: 'Verify mobile driving licence for traffic stop or car rental',
    credential: 'Mobile Driving Licence',
    color: '#d97706',
    fields: ['Given Name', 'Family Name', 'Date of Birth', 'Document Number', 'Driving Privileges'],
  },
  {
    key: 'address',
    icon: '🏠',
    title: 'Address Verification',
    description: 'Verify residential address for delivery or KYC',
    credential: 'Address Credential',
    color: '#7e3af2',
    fields: ['Given Name', 'Family Name', 'Street Address', 'Locality', 'Postal Code', 'Country'],
  },
  {
    key: 'healthcare',
    icon: '🏥',
    title: 'Healthcare Access',
    description: 'Verify health insurance membership at clinic check-in',
    credential: 'Health Insurance Card',
    color: '#e11d48',
    fields: ['Given Name', 'Family Name', 'Member Number', 'Insurer Name', 'Plan Type'],
  },
  {
    key: 'student',
    icon: '🎓',
    title: 'Student Discount',
    description: 'Verify student enrolment for discounts and campus access',
    credential: 'Student ID',
    color: '#0891b2',
    fields: ['Given Name', 'Family Name', 'Student Number', 'Institution', 'Major'],
  },
  {
    key: 'vehicle',
    icon: '🚘',
    title: 'Vehicle Registration',
    description: 'Verify vehicle ownership at inspection or resale',
    credential: 'Vehicle Registration',
    color: '#64748b',
    fields: ['Owner Name', 'Licence Plate', 'Vehicle Make', 'Vehicle Model', 'Year'],
  },
  {
    key: 'professional',
    icon: '👔',
    title: 'Professional Licence',
    description: 'Verify professional credentials for regulated services',
    credential: 'Professional License',
    color: '#0f766e',
    fields: ['Given Name', 'Family Name', 'Licence Number', 'Licence Type', 'Issuing Authority'],
  },
  {
    key: 'passport',
    icon: '🛂',
    title: 'Passport Verification',
    description: 'Verify passport identity for hotel check-in or travel',
    credential: 'Passport',
    color: '#1d4ed8',
    fields: ['Given Name', 'Family Name', 'Date of Birth', 'Document Number', 'Nationality'],
  },
  {
    key: 'social',
    icon: '🔒',
    title: 'Social Security',
    description: 'Verify social security number for benefits or employment',
    credential: 'Social Security Credential',
    color: '#6b21a8',
    fields: ['Given Name', 'Family Name', 'Date of Birth', 'SSN'],
  },
  {
    key: 'banking',
    icon: '💳',
    title: 'Bank Account Verification',
    description: 'Verify IBAN and account holder for financial transactions',
    credential: 'Bank Account Credential',
    color: '#15803d',
    fields: ['Account Holder Name', 'IBAN', 'Bank Name', 'Account Type'],
  },
  {
    key: 'employment',
    icon: '💼',
    title: 'Employment Verification',
    description: 'Verify employment status for housing or credit applications',
    credential: 'Employment Credential',
    color: '#b45309',
    fields: ['Given Name', 'Family Name', 'Employer Name', 'Job Title', 'Employment Type'],
  },
  {
    key: 'vaccination',
    icon: '💉',
    title: 'Vaccination Certificate',
    description: 'Verify vaccination status for travel or event entry',
    credential: 'Vaccination Credential',
    color: '#0369a1',
    fields: ['Given Name', 'Family Name', 'Vaccine Type', 'Vaccination Date', 'Valid Until'],
  },
  {
    key: 'disability',
    icon: '♿',
    title: 'Disability Credential',
    description: 'Verify disability status for accessible services',
    credential: 'Disability Credential',
    color: '#9f1239',
    fields: ['Given Name', 'Family Name', 'Disability Type', 'Support Level'],
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.logo}>
            <span className={s.logoIcon}>🛡️</span>
            <div>
              <div className={s.logoTitle}>EUDI Verifier</div>
              <div className={s.logoSub}>Identity Verification Portal</div>
            </div>
          </div>
          <div className={s.badge}>OID4VP · SD-JWT · W3C VC 2.0</div>
        </div>
      </header>

      <main className={s.main}>
        <h1 className={s.title}>Select Verification Scenario</h1>
        <p className={s.subtitle}>
          Choose a use case to generate a QR code. The user scans it with their EUDI wallet to present their credential.
        </p>

        <div className={s.grid}>
          {SCENARIOS.map((sc) => (
            <button
              key={sc.key}
              className={s.card}
              onClick={() => navigate(`/verify/${sc.key}`)}
              style={{ '--accent': sc.color } as any}
            >
              <div className={s.cardIcon}>{sc.icon}</div>
              <h2 className={s.cardTitle}>{sc.title}</h2>
              <p className={s.cardDesc}>{sc.description}</p>
              <div className={s.credBadge}>
                <span className={s.credDot} style={{ background: sc.color }} />
                {sc.credential}
              </div>
              <div className={s.fieldList}>
                <div className={s.fieldLabel}>Requested fields:</div>
                {sc.fields.map((f) => (
                  <div key={f} className={s.fieldItem}>
                    <span className={s.check}>✓</span> {f}
                  </div>
                ))}
              </div>
              <div className={s.cardAction} style={{ background: sc.color }}>
                Start Verification →
              </div>
            </button>
          ))}
        </div>

        <div className={s.howBox}>
          <h3 className={s.howTitle}>How it works</h3>
          <div className={s.steps}>
            {[
              ['1', 'Select scenario', 'Choose from 14 real-world verification use cases'],
              ['2', 'QR is generated', 'A presentation request QR appears on screen'],
              ['3', 'User scans with wallet', 'The EUDI mobile wallet reads the request'],
              ['4', 'Selective disclosure', 'User chooses which fields to share'],
              ['5', 'Result shown here', 'This page displays the verified identity'],
            ].map(([n, title, desc]) => (
              <div key={n} className={s.step}>
                <div className={s.stepNum}>{n}</div>
                <div>
                  <div className={s.stepTitle}>{title}</div>
                  <div className={s.stepDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
