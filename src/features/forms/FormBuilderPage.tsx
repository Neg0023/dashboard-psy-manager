import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePatients } from '@/features/patients/hooks'
import { getConsentUrl } from './api'
import { useCreateForm, useForms } from './hooks'
import {
  QUESTION_TYPE_LABELS,
  type CreateFormRequest,
  type FormQuestionDraft,
  type FormQuestionType,
} from './types'

const SELECT_CLASSES =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'

function newQuestion(): FormQuestionDraft {
  return { id: crypto.randomUUID(), text: '', type: 'SHORT_TEXT', options: [] }
}

export function FormBuilderPage() {
  const { data: patientsPage } = usePatients({ status: 'ACTIVE', size: 200 })
  const patients = patientsPage?.content ?? []
  const { data: forms } = useForms()
  const createMutation = useCreateForm()

  const [title, setTitle] = useState('')
  const [patientId, setPatientId] = useState('')
  const [questions, setQuestions] = useState<FormQuestionDraft[]>([newQuestion()])

  function updateQuestion(id: string, patch: Partial<FormQuestionDraft>) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const updated = { ...q, ...patch }
        if (patch.type === 'MULTIPLE_CHOICE' && updated.options.length < 2) {
          updated.options = ['', '']
        }
        return updated
      }),
    )
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[index], copy[target]] = [copy[target], copy[index]]
      return copy
    })
  }

  function setOption(questionId: string, optionIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o, i) => (i === optionIndex ? value : o)) }
          : q,
      ),
    )
  }

  function addOption(questionId: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, options: [...q.options, ''] } : q)),
    )
  }

  function removeOption(questionId: string, optionIndex: number) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, options: q.options.filter((_, i) => i !== optionIndex) } : q,
      ),
    )
  }

  async function connectGoogle() {
    try {
      const url = await getConsentUrl()
      window.open(url, '_blank', 'noopener')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao obter a URL de consentimento'))
    }
  }

  function resetForm() {
    setTitle('')
    setPatientId('')
    setQuestions([newQuestion()])
  }

  function handleSubmit() {
    if (!title.trim()) {
      toast.error('Informe o título do formulário')
      return
    }
    if (questions.some((q) => !q.text.trim())) {
      toast.error('Todas as perguntas precisam de um texto')
      return
    }
    const invalidChoice = questions.some(
      (q) => q.type === 'MULTIPLE_CHOICE' && q.options.filter((o) => o.trim()).length < 2,
    )
    if (invalidChoice) {
      toast.error('Perguntas de múltipla escolha precisam de ao menos 2 opções')
      return
    }

    const body: CreateFormRequest = {
      title: title.trim(),
      patientId: patientId ? Number(patientId) : null,
      questions: questions.map((q) => ({
        text: q.text.trim(),
        type: q.type,
        options: q.type === 'MULTIPLE_CHOICE' ? q.options.filter((o) => o.trim()) : undefined,
      })),
    }

    createMutation.mutate(body, {
      onSuccess: (created) => {
        toast.success('Formulário criado no Google Forms')
        window.open(created.shareUrl, '_blank', 'noopener')
        resetForm()
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Erro ao criar formulário')),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Anamnese (Google Forms)</h1>
          <p className="text-sm text-muted-foreground">
            Monte perguntas e gere o formulário na sua conta Google
          </p>
        </div>
        <Button variant="outline" onClick={connectGoogle}>
          Conectar Google
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo formulário</CardTitle>
          <CardDescription>
            Se ainda não conectou sua conta Google, clique em “Conectar Google” primeiro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Anamnese inicial"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient">Paciente (opcional)</Label>
              <select
                id="patient"
                className={SELECT_CLASSES}
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
              >
                <option value="">Nenhum</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-md border p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-3">
                    <Input
                      value={question.text}
                      onChange={(event) => updateQuestion(question.id, { text: event.target.value })}
                      placeholder={`Pergunta ${index + 1}`}
                    />
                    <select
                      className={SELECT_CLASSES}
                      value={question.type}
                      onChange={(event) =>
                        updateQuestion(question.id, { type: event.target.value as FormQuestionType })
                      }
                    >
                      {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    {question.type === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(event) =>
                                setOption(question.id, optionIndex, event.target.value)
                              }
                              placeholder={`Opção ${optionIndex + 1}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(question.id, optionIndex)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(question.id)}
                        >
                          <Plus className="size-4" />
                          Opção
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveQuestion(index, -1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveQuestion(index, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setQuestions((prev) => prev.filter((q) => q.id !== question.id))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={() => setQuestions((prev) => [...prev, newQuestion()])}>
              <Plus className="size-4" />
              Adicionar pergunta
            </Button>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Gerando...' : 'Gerar formulário'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Formulários gerados</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(forms ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Nenhum formulário gerado ainda
                  </TableCell>
                </TableRow>
              )}
              {(forms ?? []).map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.title}</TableCell>
                  <TableCell>{form.patientName ?? '—'}</TableCell>
                  <TableCell>
                    <a
                      href={form.shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline"
                    >
                      Abrir <ExternalLink className="size-3.5" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
