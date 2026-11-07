import { getGuestToken } from '../lib/session.ts'

export type UserRole = 'Cliente' | 'Operador' | 'Administrador'

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
}

export interface ApiErrorDetail {
  field?: string
  message?: string
}

interface ErrorPayload {
  error?: {
    code?: string
    message?: string
    details?: ApiErrorDetail[]
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type UnauthorizedHandler = () => Promise<boolean>

let accessToken: string | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null

const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuthRetry?: boolean
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Ocurrió un error inesperado.'
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry = false, headers: headerInit, ...rest } = options
  const headers = new Headers(headerInit)

  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const guestToken = getGuestToken()
  if (guestToken) headers.set('X-Guest-Cart-Token', guestToken)

  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...rest,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con la API. Verifica que el backend esté en ejecución.',
    )
  }

  if (response.status === 401 && !skipAuthRetry && unauthorizedHandler) {
    const recovered = await unauthorizedHandler()
    if (recovered) return api<T>(path, { ...options, skipAuthRetry: true })
  }

  if (response.status === 204) return undefined as T

  const payload = (await response.json().catch(() => null)) as (ErrorPayload & T) | null
  if (!response.ok) {
    const details = payload?.error?.details
    const detailMessage = details?.find((detail) => detail.message)?.message
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      detailMessage || payload?.error?.message || 'No se pudo completar la solicitud.',
    )
  }

  return payload as T
}
