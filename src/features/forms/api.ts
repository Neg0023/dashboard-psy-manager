import { api } from '@/lib/api'
import type { AnamnesisForm, CreateFormRequest } from './types'

export async function getConsentUrl(): Promise<string> {
  const { data } = await api.get<{ url: string }>('/api/integrations/google/consent')
  return data.url
}

export async function createForm(body: CreateFormRequest): Promise<AnamnesisForm> {
  const { data } = await api.post<AnamnesisForm>('/api/forms', body)
  return data
}

export async function listForms(patientId?: number): Promise<AnamnesisForm[]> {
  const { data } = await api.get<AnamnesisForm[]>('/api/forms', {
    params: patientId ? { patientId } : {},
  })
  return data
}
