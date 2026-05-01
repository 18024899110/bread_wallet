export const colors = {
  primary: '#1a56db',
  primaryLight: '#e8f0fd',
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#64748b',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }
export const radius = { sm: 8, md: 12, lg: 16, full: 999 }

export const credentialMeta: Record<string, { label: string; color: string; icon: string }> = {
  NationalID:        { label: 'National ID',     color: '#1a56db', icon: 'id-card' },
  mDL:              { label: 'Driving Licence',  color: '#0891b2', icon: 'car' },
  AddressCredential: { label: 'Address',          color: '#7c3aed', icon: 'home' },
  ProofOfAge:        { label: 'Proof of Age',     color: '#059669', icon: 'shield-checkmark' },
}


export const assuranceMeta: Record<string, { label: string; color: string; icon: string }> = {
  high:        { label: 'High',        color: '#16a34a', icon: 'shield-checkmark' },
  substantial: { label: 'Substantial', color: '#d97706', icon: 'shield-half' },
  low:         { label: 'Low',         color: '#64748b', icon: 'shield-outline' },
}

export const sdFields: Record<string, { required: string[]; optional: string[] }> = {
  NationalID: {
    required: ['givenName', 'familyName'],
    optional: ['dateOfBirth', 'documentNumber', 'nationality', 'sex'],
  },
  mDL: {
    required: ['givenName', 'familyName', 'dateOfBirth'],
    optional: ['address', 'sex', 'height', 'eyeColour', 'age_over_18', 'age_over_21', 'drivingPrivileges', 'portrait'],
  },
  AddressCredential: {
    required: ['streetAddress', 'locality'],
    optional: ['region', 'postalCode', 'country'],
  },
  ProofOfAge: {
    required: ['ageOver18'],
    optional: ['ageOver21', 'dateOfBirth'],
  },
}
