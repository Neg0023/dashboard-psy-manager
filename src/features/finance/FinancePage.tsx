import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FinanceEntryFormDialog } from './FinanceEntryFormDialog'
import { useDashboard, useDeleteEntry, useFinanceEntries } from './hooks'
import {
  ENTRY_STATUS_LABELS,
  ENTRY_TYPE_LABELS,
  type EntryStatus,
  type EntryType,
  type FinancialEntry,
} from './types'

const SELECT_CLASSES =
  'flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

export function FinancePage() {
  const [month, setMonth] = useState(currentMonth())
  const [typeFilter, setTypeFilter] = useState<'' | EntryType>('')
  const [statusFilter, setStatusFilter] = useState<'' | EntryStatus>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialEntry | null>(null)

  const range = useMemo(() => monthRange(month), [month])

  const { data: dashboard } = useDashboard(month)
  const { data: entries, isLoading } = useFinanceEntries({
    from: range.from,
    to: range.to,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  })
  const deleteMutation = useDeleteEntry()

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(entry: FinancialEntry) {
    setEditing(entry)
    setDialogOpen(true)
  }

  function handleDelete(entry: FinancialEntry) {
    if (!window.confirm(`Excluir o lançamento "${entry.description}"?`)) return
    deleteMutation.mutate(entry.id, {
      onSuccess: () => toast.success('Lançamento excluído'),
      onError: (error) => toast.error(getApiErrorMessage(error, 'Erro ao excluir lançamento')),
    })
  }

  const list = entries ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Fluxo de caixa do consultório</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Novo lançamento
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="month" className="text-sm text-muted-foreground">
          Mês de referência:
        </label>
        <input
          id="month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Faturamento do mês</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {currency.format(dashboard?.totalReceitas ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Despesas do mês</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {currency.format(dashboard?.totalDespesas ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saldo líquido</CardDescription>
            <CardTitle className="text-2xl">
              {currency.format(dashboard?.saldoLiquido ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className={SELECT_CLASSES}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as '' | EntryType)}
        >
          <option value="">Todos os tipos</option>
          <option value="RECEITA">Receitas</option>
          <option value="DESPESA">Despesas</option>
        </select>
        <select
          className={SELECT_CLASSES}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as '' | EntryStatus)}
        >
          <option value="">Todos os status</option>
          <option value="PAGO">Pagos</option>
          <option value="PENDENTE">Pendentes</option>
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && list.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum lançamento neste período
                </TableCell>
              </TableRow>
            )}
            {list.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.competenceDate.split('-').reverse().join('/')}</TableCell>
                <TableCell className="font-medium">{entry.description}</TableCell>
                <TableCell>
                  <Badge variant={entry.type === 'RECEITA' ? 'default' : 'secondary'}>
                    {ENTRY_TYPE_LABELS[entry.type]}
                  </Badge>
                </TableCell>
                <TableCell>{ENTRY_STATUS_LABELS[entry.status]}</TableCell>
                <TableCell>{entry.patientName ?? '—'}</TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    entry.type === 'RECEITA' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {currency.format(entry.amount)}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(entry)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(entry)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FinanceEntryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} entry={editing} />
    </div>
  )
}
