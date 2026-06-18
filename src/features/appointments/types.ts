export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'DONE'
  | 'CANCELED_BY_PATIENT'
  | 'CANCELED_BY_PROFESSIONAL'

export interface Appointment {
  id: number
  patientId: number
  patientName: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes: string | null
}

export interface AppointmentRequest {
  patientId: number
  startTime: string
  endTime: string
  status?: AppointmentStatus
  notes?: string | null
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  DONE: 'Realizada',
  CANCELED_BY_PATIENT: 'Cancelada (paciente)',
  CANCELED_BY_PROFESSIONAL: 'Cancelada (profissional)',
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: '#3b82f6',
  CONFIRMED: '#22c55e',
  DONE: '#6b7280',
  CANCELED_BY_PATIENT: '#ef4444',
  CANCELED_BY_PROFESSIONAL: '#b91c1c',
}
