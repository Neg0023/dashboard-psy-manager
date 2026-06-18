import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPatient,
  deactivatePatient,
  listPatients,
  updatePatient,
  type ListPatientsParams,
} from './api'
import type { PatientRequest } from './types'

const PATIENTS_KEY = 'patients'

export function usePatients(params: ListPatientsParams) {
  return useQuery({
    queryKey: [PATIENTS_KEY, params],
    queryFn: () => listPatients(params),
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PatientRequest) => createPatient(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] }),
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PatientRequest }) => updatePatient(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] }),
  })
}

export function useDeactivatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deactivatePatient(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] }),
  })
}
