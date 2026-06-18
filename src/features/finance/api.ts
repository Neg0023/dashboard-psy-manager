import { api } from '@/lib/api'
import type {
  Dashboard,
  EntryStatus,
  EntryType,
  FinancialEntry,
  FinancialEntryRequest,
} from './types'

export interface ListEntriesParams {
  from?: string
  to?: string
  type?: EntryType
  status?: EntryStatus
}

export async function listEntries(params: ListEntriesParams): Promise<FinancialEntry[]> {
  const { data } = await api.get<FinancialEntry[]>('/api/finance/entries', { params })
  return data
}

export async function getDashboard(month: string): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>('/api/finance/dashboard', { params: { month } })
  return data
}

export async function createEntry(body: FinancialEntryRequest): Promise<FinancialEntry> {
  const { data } = await api.post<FinancialEntry>('/api/finance/entries', body)
  return data
}

export async function updateEntry(id: number, body: FinancialEntryRequest): Promise<FinancialEntry> {
  const { data } = await api.put<FinancialEntry>(`/api/finance/entries/${id}`, body)
  return data
}

export async function deleteEntry(id: number): Promise<void> {
  await api.delete(`/api/finance/entries/${id}`)
}
