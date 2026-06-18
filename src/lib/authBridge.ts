/**
 * Ponte entre o interceptor do Axios (fora do React) e o estado de autenticação
 * (dentro do React). O AuthProvider registra um handler; o interceptor o aciona
 * quando recebe 401/403.
 */
type AuthErrorHandler = (status: number) => void

let handler: AuthErrorHandler | null = null

export function setAuthErrorHandler(next: AuthErrorHandler | null): void {
  handler = next
}

export function notifyAuthError(status: number): void {
  handler?.(status)
}
