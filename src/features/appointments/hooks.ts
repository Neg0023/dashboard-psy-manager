import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from './api'
import type { AppointmentRequest } from './types'

const APPOINTMENTS_KEY = 'appointments'

export function useAppointments(range: { start: string; end: string } | null) {
  return useQuery({
    queryKey: [APPOINTMENTS_KEY, range?.start, range?.end],
    queryFn: () => listAppointments(range!.start, range!.end),
    enabled: range !== null,
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AppointmentRequest) => createAppointment(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_KEY] }),
  })
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AppointmentRequest }) =>
      updateAppointment(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_KEY] }),
  })
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_KEY] }),
  })
}
