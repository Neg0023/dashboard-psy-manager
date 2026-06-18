import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEntry,
  deleteEntry,
  getDashboard,
  listEntries,
  updateEntry,
  type ListEntriesParams,
} from './api'
import type { FinancialEntryRequest } from './types'

const ENTRIES_KEY = 'finance-entries'
const DASHBOARD_KEY = 'finance-dashboard'

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] })
  queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] })
}

export function useFinanceEntries(params: ListEntriesParams) {
  return useQuery({
    queryKey: [ENTRIES_KEY, params],
    queryFn: () => listEntries(params),
  })
}

export function useDashboard(month: string) {
  return useQuery({
    queryKey: [DASHBOARD_KEY, month],
    queryFn: () => getDashboard(month),
  })
}

export function useCreateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: FinancialEntryRequest) => createEntry(body),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: FinancialEntryRequest }) => updateEntry(id, body),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteEntry(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}
