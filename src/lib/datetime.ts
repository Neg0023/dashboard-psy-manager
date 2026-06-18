/** Converte ISO (com offset/UTC) para o formato de <input type="datetime-local"> (hora local). */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Converte o valor de <input type="datetime-local"> (hora local) para ISO com offset. */
export function localInputToIso(local: string): string {
  return new Date(local).toISOString()
}
