import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api'
import { isoToLocalInput, localInputToIso } from '@/lib/datetime'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePatients } from '@/features/patients/hooks'
import { useCreateAppointment, useDeleteAppointment, useUpdateAppointment } from './hooks'
import { APPOINTMENT_STATUS_LABELS, type Appointment, type AppointmentRequest } from './types'

const SELECT_CLASSES =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

const appointmentFormSchema = z
  .object({
    patientId: z.string().min(1, 'Selecione um paciente'),
    startTime: z.string().min(1, 'Início é obrigatório'),
    endTime: z.string().min(1, 'Término é obrigatório'),
    status: z.enum([
      'SCHEDULED',
      'CONFIRMED',
      'DONE',
      'CANCELED_BY_PATIENT',
      'CANCELED_BY_PROFESSIONAL',
    ]),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'O término deve ser após o início',
    path: ['endTime'],
  })

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: Appointment | null
  preset?: { start: string; end: string } | null
}

function toDefaults(appointment?: Appointment | null, preset?: { start: string; end: string } | null): AppointmentFormValues {
  if (appointment) {
    return {
      patientId: String(appointment.patientId),
      startTime: isoToLocalInput(appointment.startTime),
      endTime: isoToLocalInput(appointment.endTime),
      status: appointment.status,
      notes: appointment.notes ?? '',
    }
  }
  return {
    patientId: '',
    startTime: preset ? isoToLocalInput(preset.start) : '',
    endTime: preset ? isoToLocalInput(preset.end) : '',
    status: 'SCHEDULED',
    notes: '',
  }
}

export function AppointmentFormDialog({ open, onOpenChange, appointment, preset }: Props) {
  const { data: patientsPage } = usePatients({ status: 'ACTIVE', size: 200 })
  const patients = patientsPage?.content ?? []

  const createMutation = useCreateAppointment()
  const updateMutation = useUpdateAppointment()
  const deleteMutation = useDeleteAppointment()
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: toDefaults(appointment, preset),
  })

  useEffect(() => {
    if (open) {
      reset(toDefaults(appointment, preset))
    }
  }, [open, appointment, preset, reset])

  function onSubmit(values: AppointmentFormValues) {
    const body: AppointmentRequest = {
      patientId: Number(values.patientId),
      startTime: localInputToIso(values.startTime),
      endTime: localInputToIso(values.endTime),
      status: values.status,
      notes: values.notes || null,
    }

    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error, 'Erro ao salvar sessão'))

    if (appointment) {
      updateMutation.mutate(
        { id: appointment.id, body },
        {
          onSuccess: () => {
            toast.success('Sessão atualizada')
            onOpenChange(false)
          },
          onError,
        },
      )
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success('Sessão agendada')
          onOpenChange(false)
        },
        onError,
      })
    }
  }

  function handleDelete() {
    if (!appointment) return
    if (!window.confirm('Excluir esta sessão?')) return
    deleteMutation.mutate(appointment.id, {
      onSuccess: () => {
        toast.success('Sessão excluída')
        onOpenChange(false)
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Erro ao excluir sessão')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Editar sessão' : 'Nova sessão'}</DialogTitle>
          <DialogDescription>Vincule um paciente e defina o horário.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="patientId">Paciente *</Label>
            <select id="patientId" className={SELECT_CLASSES} {...register('patientId')}>
              <option value="">Selecione...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName}
                </option>
              ))}
            </select>
            {errors.patientId && (
              <p className="text-sm text-destructive">{errors.patientId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Início *</Label>
              <Input id="startTime" type="datetime-local" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">Término *</Label>
              <Input id="endTime" type="datetime-local" {...register('endTime')} />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status *</Label>
            <select id="status" className={SELECT_CLASSES} {...register('status')}>
              {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {appointment ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
