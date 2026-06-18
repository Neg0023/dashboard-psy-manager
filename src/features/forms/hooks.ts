import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createForm, listForms } from './api'
import type { CreateFormRequest } from './types'

const FORMS_KEY = 'forms'

export function useForms(patientId?: number) {
  return useQuery({
    queryKey: [FORMS_KEY, patientId ?? null],
    queryFn: () => listForms(patientId),
  })
}

export function useCreateForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateFormRequest) => createForm(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FORMS_KEY] }),
  })
}
