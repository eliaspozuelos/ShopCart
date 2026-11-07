import { api, setAccessToken, type User } from '../../shared/api/client.ts'

export interface AuthSession {
  accessToken: string
  user: User
}

interface Envelope<T> {
  data: T
  message?: string
}

let refreshRequest: Promise<AuthSession | null> | null = null

export function refreshSession(): Promise<AuthSession | null> {
  if (!refreshRequest) {
    refreshRequest = api<Envelope<AuthSession>>('/api/v1/auth/refresh', {
      method: 'POST',
      skipAuthRetry: true,
    })
      .then((body) => {
        setAccessToken(body.data.accessToken)
        return body.data
      })
      .catch(() => {
        setAccessToken(null)
        return null
      })
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  const body = await api<Envelope<AuthSession>>('/api/v1/auth/login', {
    method: 'POST',
    body: input,
  })
  setAccessToken(body.data.accessToken)
  return body.data
}

export async function register(input: { email: string; password: string; name: string }): Promise<void> {
  await api('/api/v1/auth/register', { method: 'POST', body: input })
}

export async function logout(): Promise<void> {
  try {
    await api('/api/v1/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
  }
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await api('/api/v1/auth/password', { method: 'PATCH', body: input })
  setAccessToken(null)
}
