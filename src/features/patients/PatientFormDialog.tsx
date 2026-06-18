import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api'
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
import { patientSchema, type PatientFormValues } from './patientSchema'
import { useCreatePatient, useUpdatePatient } from './hooks'
import type { Patient, PatientRequest } from './types'

interface PatientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient?: Patient | null
}

const SELECT_CLASSES =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none'

function toDefaults(patient?: Patient | null): PatientFormValues {
  return {
    fullName: patient?.fullName ?? '',
    cpf: patient?.cpf ?? '',
    birthDate: patient?.birthDate ?? '',
    phone: patient?.phone ?? '',
    email: patient?.email ?? '',
    status: patient?.status ?? 'ACTIVE',
    profession: patient?.profession ?? '',
    address: patient?.address ?? '',
    notes: patient?.notes ?? '',
  }
}

export function PatientFormDialog({ open, onOpenChange, patient }: PatientFormDialogProps) {
  const createMutation = useCreatePatient()
  const updateMutation = useUpdatePatient()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: toDefaults(patient),
  })

  // Recarrega os valores quando o diálogo abre ou troca o paciente em edição.
  useEffect(() => {
    if (open) {
      reset(toDefaults(patient))
    }
  }, [open, patient, reset])

  function onSubmit(values: PatientFormValues) {
    const body: PatientRequest = {
      fullName: values.fullName,
      cpf: values.cpf ? values.cpf : null,
      birthDate: values.birthDate,
      phone: values.phone,
      email: values.email,
      status: values.status,
      profession: values.profession || null,
      address: values.address || null,
      notes: values.notes || null,
    }

    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error, 'Erro ao salvar paciente'))

    if (patient) {
      updateMutation.mutate(
        { id: patient.id, body },
        {
          onSuccess: () => {
            toast.success('Paciente atualizado')
            onOpenChange(false)
          },
          onError,
        },
      )
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success('Paciente criado')
          onOpenChange(false)
        },
        onError,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? 'Editar paciente' : 'Novo paciente'}</DialogTitle>
          <DialogDescription>
            Campos com * são obrigatórios. O CPF é opcional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome completo *</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="Somente se desejar" {...register('cpf')} />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Data de nascimento *</Label>
              <Input id="birthDate" type="date" {...register('birthDate')} />
              {errors.birthDate && (
                <p className="text-sm text-destructive">{errors.birthDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status *</Label>
              <select id="status" className={SELECT_CLASSES} {...register('status')}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profession">Profissão</Label>
              <Input id="profession" {...register('profession')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Histórico / Observações</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
