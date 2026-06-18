export type PatientStatus = 'ACTIVE' | 'INACTIVE'

export interface Patient {
  id: number
  fullName: string
  cpf: string | null
  birthDate: string
  phone: string
  email: string
  status: PatientStatus
  profession: string | null
  address: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PatientRequest {
  fullName: string
  cpf?: string | null
  birthDate: string
  phone: string
  email: string
  status: PatientStatus
  profession?: string | null
  address?: string | null
  notes?: string | null
}

/** Página retornada pelo Spring Data (campos relevantes). */
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
