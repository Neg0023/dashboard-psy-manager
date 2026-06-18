import axios from 'axios'
import { getToken } from '@/features/auth/tokenStore'
import { notifyAuthError } from '@/lib/authBridge'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
})

// Injeta o ID Token do Google em cada requisição.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Encaminha 401 (token inválido/expirado) e 403 (e-mail não autorizado) ao app.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401 || status === 403) {
      notifyAuthError(status)
    }
    return Promise.reject(error)
  },
)

/** Extrai uma mensagem de erro amigável da resposta do backend. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    if (data?.message) return data.message
  }
  return fallback
}
