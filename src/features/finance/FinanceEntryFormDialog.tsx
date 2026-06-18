import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { usePatients } from '@/features/patients/hooks'
import { useCreateEntry, useUpdateEntry } from './hooks'
import {
  ENTRY_STATUS_LABELS,
  ENTRY_TYPE_LABELS,
  type FinancialEntry,
  type FinancialEntryRequest,
} from './types'

const SELECT_CLASSES =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

const entrySchema = z.object({
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  amount: z
    .string()
    .min(1, 'Valor é obrigatório')
    .refine((value) => {
      const parsed = Number(value.replace(',', '.'))
      return !Number.isNaN(parsed) && parsed > 0
    }, 'Valor deve ser positivo'),
  competenceDate: z.string().min(1, 'Data de competência é obrigatória'),
  type: z.enum(['RECEITA', 'DESPESA']),
  status: z.enum(['PAGO', 'PENDENTE']),
  patientId: z.string().optional(),
})

type EntryFormValues = z.infer<typeof entrySchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: FinancialEntry | null
}

function toDefaults(entry?: FinancialEntry | null): EntryFormValues {
  if (entry) {
    return {
      description: entry.description,
      amount: String(entry.amount),
      competenceDate: entry.competenceDate,
      type: entry.type,
      status: entry.status,
      patientId: entry.patientId ? String(entry.patientId) : '',
    }
  }
  return {
    description: '',
    amount: '',
    competenceDate: new Date().toISOString().slice(0, 10),
    type: 'RECEITA',
    status: 'PENDENTE',
    patientId: '',
  }
}

export function FinanceEntryFormDialog({ open, onOpenChange, entry }: Props) {
  const { data: patientsPage } = usePatients({ status: 'ACTIVE', size: 200 })
  const patients = patientsPage?.content ?? []

  const createMutation = useCreateEntry()
  const updateMutation = useUpdateEntry()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: toDefaults(entry),
  })

  useEffect(() => {
    if (open) {
      reset(toDefaults(entry))
    }
  }, [open, entry, reset])

  function onSubmit(values: EntryFormValues) {
    const body: FinancialEntryRequest = {
      description: values.description,
      amount: Number(values.amount.replace(',', '.')),
      competenceDate: values.competenceDate,
      type: values.type,
      status: values.status,
      patientId: values.patientId ? Number(values.patientId) : null,
    }

    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error, 'Erro ao salvar lançamento'))

    if (entry) {
      updateMutation.mutate(
        { id: entry.id, body },
        {
          onSuccess: () => {
            toast.success('Lançamento atualizado')
            onOpenChange(false)
          },
          onError,
        },
      )
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success('Lançamento criado')
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
          <DialogTitle>{entry ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
          <DialogDescription>Registre uma receita ou despesa.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" {...register('description')} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input id="amount" inputMode="decimal" placeholder="0,00" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="competenceDate">Competência *</Label>
              <Input id="competenceDate" type="date" {...register('competenceDate')} />
              {errors.competenceDate && (
                <p className="text-sm text-destructive">{errors.competenceDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo *</Label>
              <select id="type" className={SELECT_CLASSES} {...register('type')}>
                {Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status *</Label>
              <select id="status" className={SELECT_CLASSES} {...register('status')}>
                {Object.entries(ENTRY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="patientId">Paciente (opcional)</Label>
            <select id="patientId" className={SELECT_CLASSES} {...register('patientId')}>
              <option value="">Nenhum</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName}
                </option>
              ))}
            </select>
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
