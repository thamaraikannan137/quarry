const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (res.status === 204) return undefined as T

  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new ApiError(data.error || res.statusText || 'Request failed', res.status)
  }
  return data as T
}

export function isFormValidationError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'errorFields' in error)
}

export function errorMessage(error: unknown, fallback = 'Request failed') {
  if (isFormValidationError(error)) return null
  if (error instanceof Error && error.message) return error.message
  return fallback
}
