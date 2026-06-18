import { api } from '@/lib/api'
import type { Page, Patient, PatientRequest, PatientStatus } from './types'

export interface ListPatientsParams {
  status?: PatientStatus
  q?: string
  page?: number
  size?: number
}

export async function listPatients(params: ListPatientsParams): Promise<Page<Patient>> {
  const { data } = await api.get<Page<Patient>>('/api/patients', { params })
  return data
}

export async function createPatient(body: PatientRequest): Promise<Patient> {
  const { data } = await api.post<Patient>('/api/patients', body)
  return data
}

export async function updatePatient(id: number, body: PatientRequest): Promise<Patient> {
  const { data } = await api.put<Patient>(`/api/patients/${id}`, body)
  return data
}

export async function deactivatePatient(id: number): Promise<void> {
  await api.delete(`/api/patients/${id}`)
}
