export type EntryType = 'RECEITA' | 'DESPESA'
export type EntryStatus = 'PAGO' | 'PENDENTE'

export interface FinancialEntry {
  id: number
  description: string
  amount: number
  competenceDate: string
  type: EntryType
  status: EntryStatus
  patientId: number | null
  patientName: string | null
}

export interface FinancialEntryRequest {
  description: string
  amount: number
  competenceDate: string
  type: EntryType
  status: EntryStatus
  patientId?: number | null
}

export interface Dashboard {
  totalReceitas: number
  totalDespesas: number
  saldoLiquido: number
}

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
}

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  PAGO: 'Pago',
  PENDENTE: 'Pendente',
}
