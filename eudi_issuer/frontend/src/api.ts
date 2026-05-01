const BASE = '/api'

function getToken() { return localStorage.getItem('token') }

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error ?? `HTTP ${res.status}`)
  return data
}

async function reqForm(method: string, path: string, formData: FormData) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      // No Content-Type — browser sets multipart boundary automatically
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error ?? `HTTP ${res.status}`)
  return data
}

async function reqBlob(path: string): Promise<string> {
  const res = await fetch(BASE + path, {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return URL.createObjectURL(await res.blob())
}

export const api = {

  register: (body: unknown) => req('POST', '/auth/register', body),
  login: (body: unknown) => req('POST', '/auth/login', body),
  me: () => req('GET', '/auth/me'),


  submitApplication: (formData: FormData) => reqForm('POST', '/applications', formData),
  updateApplication: (id: string, formData: FormData) => reqForm('PUT', `/applications/${id}`, formData),
  deleteApplication: (id: string) => req('DELETE', `/applications/${id}`),
  getMyApplications: () => req('GET', '/applications'),
  getApplication: (id: string) => req('GET', `/applications/${id}`),


  getAdminApplications: () => req('GET', '/admin/applications'),
  getAdminApplication: (id: string) => req('GET', `/admin/applications/${id}`),
  getAdminApplicationDocumentUrl: (id: string): Promise<string> => reqBlob(`/admin/applications/${id}/document`),
  approveApplication: (id: string, note?: string) => req('POST', `/admin/applications/${id}/approve`, { note }),
  rejectApplication: (id: string, note?: string) => req('POST', `/admin/applications/${id}/reject`, { note }),
  resendApplication: (id: string) => req('POST', `/admin/applications/${id}/resend`),
  reissueApplication: (id: string, note?: string) => req('POST', `/admin/applications/${id}/reissue`, { note }),
  getAdminStats: () => req('GET', '/admin/stats'),
  getAdminUsers: (search?: string) => req('GET', `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getAdminUser: (id: string) => req('GET', `/admin/users/${id}`),
  updateAdminUser: (id: string, body: unknown) => req('PUT', `/admin/users/${id}`, body),
  deleteAdminUser: (id: string) => req('DELETE', `/admin/users/${id}`),
  getAdminUserApplications: (id: string) => req('GET', `/admin/users/${id}/applications`),
  getWaltidStatus: () => req('GET', '/admin/waltid-status'),
}

export function saveToken(token: string) { localStorage.setItem('token', token) }
export function clearToken() { localStorage.removeItem('token') }
export function isLoggedIn() { return !!getToken() }
