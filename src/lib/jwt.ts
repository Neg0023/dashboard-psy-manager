export interface GoogleIdTokenClaims {
  email?: string
  name?: string
  picture?: string
  exp?: number
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Decodifica (sem verificar assinatura) o payload de um ID Token para exibição. */
export function decodeJwt(token: string): GoogleIdTokenClaims | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(base64UrlDecode(payload)) as GoogleIdTokenClaims
  } catch {
    return null
  }
}
