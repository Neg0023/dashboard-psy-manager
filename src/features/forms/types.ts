export type FormQuestionType = 'SHORT_TEXT' | 'LONG_TEXT' | 'MULTIPLE_CHOICE'

/** Pergunta em edição no builder (com id local para a UI). */
export interface FormQuestionDraft {
  id: string
  text: string
  type: FormQuestionType
  options: string[]
}

export interface CreateFormRequest {
  title: string
  patientId?: number | null
  questions: { text: string; type: FormQuestionType; options?: string[] }[]
}

export interface AnamnesisForm {
  id: number
  patientId: number | null
  patientName: string | null
  googleFormId: string
  shareUrl: string
  title: string
  createdAt: string
}

export const QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
  SHORT_TEXT: 'Texto curto',
  LONG_TEXT: 'Texto longo',
  MULTIPLE_CHOICE: 'Múltipla escolha',
}
