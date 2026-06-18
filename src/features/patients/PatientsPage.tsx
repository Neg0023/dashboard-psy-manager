import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PatientFormDialog } from './PatientFormDialog'
import { usePatients, useDeactivatePatient } from './hooks'
import type { Patient, PatientStatus } from './types'

const SELECT_CLASSES =
  'flex h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

function formatCpf(cpf: string | null): string {
  if (!cpf) return '—'
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
      {status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
    </Badge>
  )
}

export function PatientsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | PatientStatus>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)

  // Debounce simples da busca.
  useEffect(() => {
    const timer = setTimeout(() => setQ(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError } = usePatients({
    q: q || undefined,
    status: statusFilter || undefined,
    page: 0,
    size: 50,
  })
  const deactivateMutation = useDeactivatePatient()

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(patient: Patient) {
    setEditing(patient)
    setDialogOpen(true)
  }

  function handleDeactivate(patient: Patient) {
    if (!window.confirm(`Inativar o paciente "${patient.fullName}"?`)) return
    deactivateMutation.mutate(patient.id, {
      onSuccess: () => toast.success('Paciente inativado'),
      onError: (error) => toast.error(getApiErrorMessage(error, 'Erro ao inativar paciente')),
    })
  }

  const patients = data?.content ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie o cadastro de pacientes</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Novo paciente
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="sm:max-w-xs"
        />
        <select
          className={SELECT_CLASSES}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as '' | PatientStatus)}
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-destructive">
                  Erro ao carregar pacientes
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum paciente encontrado
                </TableCell>
              </TableRow>
            )}
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.fullName}</TableCell>
                <TableCell>{formatCpf(patient.cpf)}</TableCell>
                <TableCell>{patient.phone}</TableCell>
                <TableCell>{patient.email}</TableCell>
                <TableCell>
                  <StatusBadge status={patient.status} />
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(patient)}>
                    Editar
                  </Button>
                  {patient.status === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(patient)}
                    >
                      Inativar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PatientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} patient={editing} />
    </div>
  )
}
