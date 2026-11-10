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
    retryAfterSeconds?: number
    details?: ApiErrorDetail[]
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfterSeconds?: number

  constructor(status: number, code: string, message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    if (retryAfterSeconds !== undefined) this.retryAfterSeconds = retryAfterSeconds
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

  const formData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !formData && !headers.has('Content-Type')) {
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
      body: body === undefined ? undefined : formData ? body : JSON.stringify(body),
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
      retryAfterFrom(response, payload),
    )
  }

  return payload as T
}

function retryAfterFrom(response: Response, payload: ErrorPayload | null): number | undefined {
  if (response.status !== 429) return undefined
  const fromBody = payload?.error?.retryAfterSeconds
  if (typeof fromBody === 'number' && Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody)
  const header = response.headers.get('Retry-After')
  if (!header) return undefined
  const asSeconds = Number(header)
  if (Number.isFinite(asSeconds) && asSeconds > 0) return Math.ceil(asSeconds)
  const asDate = Date.parse(header)
  if (Number.isNaN(asDate)) return undefined
  return Math.max(1, Math.ceil((asDate - Date.now()) / 1000))
}

export async function apiBlob(path: string, options: { skipAuthRetry?: boolean } = {}): Promise<{ blob: Blob; filename: string }> {
  const headers = new Headers()
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const guestToken = getGuestToken()
  if (guestToken) headers.set('X-Guest-Cart-Token', guestToken)

  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, { headers, credentials: 'include' })
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con la API. Verifica que el backend esté en ejecución.',
    )
  }

  if (response.status === 401 && !options.skipAuthRetry && unauthorizedHandler) {
    const recovered = await unauthorizedHandler()
    if (recovered) return apiBlob(path, { skipAuthRetry: true })
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ErrorPayload | null
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message || 'No se pudo completar la solicitud.',
    )
  }

  const match = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')
  return {
    blob: await response.blob(),
    filename: match?.[1] ?? 'shopcart-reporte.xlsx',
  }
}
