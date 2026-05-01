

export interface SdDisclosure {
  key: string
  value: unknown
  encoded: string 
}

export interface ParsedSdJwt {
  jwt: string                    
  disclosures: SdDisclosure[]  
  payload: Record<string, unknown>  
}


export function isSdJwt(document: string): boolean {
  return typeof document === 'string' && document.includes('~')
}


function b64uDecode(s: string): string {

  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '===='.slice((s.length % 4) || 4)
  return atob(padded)
}


export function parseSdJwt(document: string): ParsedSdJwt {
  const parts = document.split('~')
  const jwt = parts[0]                                  
  const rawDisclosures = parts.slice(1).filter(Boolean) 


  const jwtParts = jwt.split('.')
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(b64uDecode(jwtParts[1])) as Record<string, unknown>
  } catch {

  }


  const disclosures: SdDisclosure[] = []
  for (const encoded of rawDisclosures) {
    try {
      const arr = JSON.parse(b64uDecode(encoded)) as unknown[]
      if (Array.isArray(arr) && arr.length === 3) {
        disclosures.push({ key: String(arr[1]), value: arr[2], encoded })
      }
    } catch {

    }
  }

  return { jwt, disclosures, payload }
}

export function buildFilteredSdJwt(document: string, selectedKeys: Set<string>): string {
  const { jwt, disclosures } = parseSdJwt(document)
  const selected = disclosures.filter((d) => selectedKeys.has(d.key))

  return [jwt, ...selected.map((d) => d.encoded), ''].join('~')
}
