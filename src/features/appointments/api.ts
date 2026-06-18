import { api } from '@/lib/api'
import type { Appointment, AppointmentRequest, AppointmentStatus } from './types'

export async function listAppointments(start: string, end: string): Promise<Appointment[]> {
  const { data } = await api.get<Appointment[]>('/api/appointments', { params: { start, end } })
  return data
}

export async function createAppointment(body: AppointmentRequest): Promise<Appointment> {
  const { data } = await api.post<Appointment>('/api/appointments', body)
  return data
}

export async function updateAppointment(id: number, body: AppointmentRequest): Promise<Appointment> {
  const { data } = await api.put<Appointment>(`/api/appointments/${id}`, body)
  return data
}

export async function updateAppointmentStatus(
  id: number,
  status: AppointmentStatus,
): Promise<Appointment> {
  const { data } = await api.patch<Appointment>(`/api/appointments/${id}/status`, { status })
  return data
}

export async function deleteAppointment(id: number): Promise<void> {
  await api.delete(`/api/appointments/${id}`)
}
