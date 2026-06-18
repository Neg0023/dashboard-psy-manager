import { useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api'
import { usePatients } from '@/features/patients/hooks'
import { getConsentUrl } from './api'
import { useCreateForm, useForms } from './hooks'
import {
  QUESTION_TYPE_LABELS,
  type CreateFormRequest,
  type FormQuestionDraft,
  type FormQuestionType,
} from './types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function newQuestion(): FormQuestionDraft {
  return { id: crypto.randomUUID(), text: '', type: 'SHORT_TEXT', options: [] }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── shared styles ────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%', background: '#0f1726', border: '1.5px solid #2a3e58',
  borderRadius: 9, padding: '10px 13px', color: '#eef4fa',
  fontFamily: "'Manrope', sans-serif", fontSize: 14, outline: 'none',
  boxSizing: 'border-box', colorScheme: 'dark',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: '#8aa3bf',
  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6,
}

function DInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, onFocus, onBlur, ...rest } = props
  return (
    <input {...rest} style={{ ...inputBase, ...style }}
      onFocus={e => { e.currentTarget.style.borderColor = '#7fb0d8'; onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = '#2a3e58'; onBlur?.(e) }}
    />
  )
}

function DSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, onFocus, onBlur, ...rest } = props
  return (
    <select {...rest} style={{ ...inputBase, cursor: 'pointer', ...style }}
      onFocus={e => { e.currentTarget.style.borderColor = '#7fb0d8'; onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = '#2a3e58'; onBlur?.(e) }}
    />
  )
}

// ─── FormBuilderPage ──────────────────────────────────────────────────────────

export function FormBuilderPage() {
  const { data: patientsPage } = usePatients({ status: 'ACTIVE', size: 200 })
  const patients = patientsPage?.content ?? []
  const { data: forms } = useForms()
  const createMutation = useCreateForm()

  const [title, setTitle] = useState('')
  const [patientId, setPatientId] = useState('')
  const [questions, setQuestions] = useState<FormQuestionDraft[]>([newQuestion()])

  function updateQuestion(id: string, patch: Partial<FormQuestionDraft>) {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== id) return q
        const updated = { ...q, ...patch }
        if (patch.type === 'MULTIPLE_CHOICE' && updated.options.length < 2) updated.options = ['', '']
        return updated
      }),
    )
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]]
      return copy
    })
  }

  function setOption(questionId: string, optionIndex: number, value: string) {
    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, options: q.options.map((o, i) => (i === optionIndex ? value : o)) }
          : q,
      ),
    )
  }

  function addOption(questionId: string) {
    setQuestions(prev =>
      prev.map(q => (q.id === questionId ? { ...q, options: [...q.options, ''] } : q)),
    )
  }

  function removeOption(questionId: string, optionIndex: number) {
    setQuestions(prev =>
      prev.map(q =>
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
    if (!title.trim()) { toast.error('Informe o título do formulário'); return }
    if (questions.some(q => !q.text.trim())) { toast.error('Todas as perguntas precisam de um texto'); return }
    const invalidChoice = questions.some(q => q.type === 'MULTIPLE_CHOICE' && q.options.filter(o => o.trim()).length < 2)
    if (invalidChoice) { toast.error('Perguntas de múltipla escolha precisam de ao menos 2 opções'); return }

    const body: CreateFormRequest = {
      title: title.trim(),
      patientId: patientId ? Number(patientId) : null,
      questions: questions.map(q => ({
        text: q.text.trim(),
        type: q.type,
        options: q.type === 'MULTIPLE_CHOICE' ? q.options.filter(o => o.trim()) : undefined,
      })),
    }

    createMutation.mutate(body, {
      onSuccess: created => {
        toast.success('Formulário criado no Google Forms')
        window.open(created.shareUrl, '_blank', 'noopener')
        resetForm()
      },
      onError: error => toast.error(getApiErrorMessage(error, 'Erro ao criar formulário')),
    })
  }

  const isPending = createMutation.isPending

  return (
    <div style={{ padding: '30px 38px 48px', fontFamily: "'Manrope', sans-serif", color: '#eef4fa', minHeight: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Anamnese</h1>
          <div style={{ fontSize: 14, color: '#8aa3bf', marginTop: 6 }}>Monte perguntas e gere o formulário na sua conta Google</div>
        </div>
        <ConnectBtn onClick={connectGoogle} />
      </div>

      {/* ── Builder panel ── */}
      <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #22354e', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FormIcon />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Novo formulário</div>
            <div style={{ fontSize: 13, color: '#5f7896', marginTop: 2 }}>Se ainda não conectou sua conta Google, clique em "Conectar Google" primeiro.</div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Título + Paciente */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>Título <span style={{ color: '#e89090' }}>*</span></label>
              <DInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Anamnese inicial" />
            </div>
            <div>
              <label style={labelStyle}>Paciente <span style={{ color: '#5f7896', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
              <DSelect value={patientId} onChange={e => setPatientId(e.target.value)}>
                <option value="">Nenhum</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </DSelect>
            </div>
          </div>

          {/* Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
            {questions.map((q, index) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={index}
                total={questions.length}
                onUpdate={patch => updateQuestion(q.id, patch)}
                onMoveUp={() => moveQuestion(index, -1)}
                onMoveDown={() => moveQuestion(index, 1)}
                onDelete={() => setQuestions(prev => prev.filter(x => x.id !== q.id))}
                onSetOption={(optIdx, val) => setOption(q.id, optIdx, val)}
                onAddOption={() => addOption(q.id)}
                onRemoveOption={optIdx => removeOption(q.id, optIdx)}
              />
            ))}
          </div>

          <button
            onClick={() => setQuestions(prev => [...prev, newQuestion()])}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1.5px dashed #355075', borderRadius: 10, padding: '9px 16px', color: '#8aa3bf', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif', transition: 'all .15s ease'", marginBottom: 28 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7fb0d8'; e.currentTarget.style.color = '#cfe0ef' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#355075'; e.currentTarget.style.color = '#8aa3bf' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar pergunta
          </button>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSubmit} disabled={isPending}
              style={{ background: isPending ? '#22354e' : '#7fb0d8', color: isPending ? '#566f8c' : '#16243a', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", display: 'flex', alignItems: 'center', gap: 8, boxShadow: isPending ? 'none' : '0 6px 16px rgba(127,176,216,0.22)', transition: 'all .15s ease' }}>
              {isPending ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="psy-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Gerando…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Gerar formulário
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Generated forms ── */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Formulários gerados</h2>
        <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, overflow: 'hidden' }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 100px', gap: 16, padding: '13px 22px', borderBottom: '1px solid #22354e', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#5f7896' }}>
            <div>Título</div><div>Paciente</div><div>Criado em</div><div style={{ textAlign: 'center' }}>Link</div>
          </div>

          {(forms ?? []).length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#5f7896', fontSize: 14 }}>Nenhum formulário gerado ainda.</div>
          )}
          {(forms ?? []).map(form => <FormRow key={form.id} form={form} />)}
        </div>
      </div>
    </div>
  )
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: FormQuestionDraft
  index: number
  total: number
  onUpdate: (patch: Partial<FormQuestionDraft>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onSetOption: (i: number, val: string) => void
  onAddOption: () => void
  onRemoveOption: (i: number) => void
}

function QuestionCard({ question, index, total, onUpdate, onMoveUp, onMoveDown, onDelete, onSetOption, onAddOption, onRemoveOption }: QuestionCardProps) {
  return (
    <div style={{ background: '#1a2c44', border: '1px solid #22354e', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {/* Number badge */}
      <div style={{ width: 26, height: 26, borderRadius: 7, background: '#22354e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#8aa3bf', flexShrink: 0, marginTop: 9 }}>
        {index + 1}
      </div>

      {/* Fields */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <DInput
          value={question.text}
          onChange={e => onUpdate({ text: e.target.value })}
          placeholder={`Pergunta ${index + 1}`}
        />

        {/* Type selector as pill buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.entries(QUESTION_TYPE_LABELS) as [FormQuestionType, string][]).map(([type, label]) => {
            const active = question.type === type
            return (
              <button key={type} onClick={() => onUpdate({ type })}
                style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${active ? '#7fb0d8' : '#2a3e58'}`, background: active ? 'rgba(127,176,216,0.13)' : 'transparent', color: active ? '#cfe0ef' : '#5f7896', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'all .15s ease' }}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Options (MULTIPLE_CHOICE) */}
        {question.type === 'MULTIPLE_CHOICE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4 }}>
            {question.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #355075', flexShrink: 0 }} />
                <DInput value={opt} onChange={e => onSetOption(i, e.target.value)} placeholder={`Opção ${i + 1}`} />
                {question.options.length > 2 && (
                  <IconBtn onClick={() => onRemoveOption(i)} title="Remover opção">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </IconBtn>
                )}
              </div>
            ))}
            <button onClick={onAddOption}
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1.5px solid #2a3e58', borderRadius: 7, padding: '5px 11px', color: '#8aa3bf', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Opção
            </button>
          </div>
        )}
      </div>

      {/* Order + delete */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <IconBtn onClick={onMoveUp} disabled={index === 0} title="Mover para cima">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </IconBtn>
        <IconBtn onClick={onMoveDown} disabled={index === total - 1} title="Mover para baixo">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </IconBtn>
        <IconBtn onClick={onDelete} danger title="Remover pergunta">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </IconBtn>
      </div>
    </div>
  )
}

// ─── FormRow ──────────────────────────────────────────────────────────────────

function FormRow({ form }: { form: { id: number; title: string; patientName: string | null; shareUrl: string; createdAt: string } }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 100px', gap: 16, padding: '14px 22px', borderBottom: '1px solid #1b2c43', alignItems: 'center', background: hov ? '#1a2c44' : 'transparent', transition: 'background .15s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(127,176,216,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FormIcon small />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{form.title}</span>
      </div>
      <div style={{ fontSize: 13, color: '#9bb0c6' }}>{form.patientName ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#9bb0c6' }}>{formatDate(form.createdAt)}</div>
      <div style={{ textAlign: 'center' }}>
        <a href={form.shareUrl} target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#7fb0d8', textDecoration: 'none', padding: '5px 12px', borderRadius: 8, border: '1.5px solid #2a3e58', transition: 'all .15s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(127,176,216,0.1)'; e.currentTarget.style.borderColor = '#7fb0d8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#2a3e58' }}>
          Abrir
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    </div>
  )
}

// ─── small components ─────────────────────────────────────────────────────────

function ConnectBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: hov ? '#1c2c42' : 'transparent', border: '1.5px solid #355075', borderRadius: 10, padding: '11px 18px', color: hov ? '#cfe0ef' : '#9bb0c6', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'all .15s ease' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      Conectar Google
    </button>
  )
}

function IconBtn({ onClick, disabled, danger, title, children }: { onClick: () => void; disabled?: boolean; danger?: boolean; title?: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: hov && !disabled ? (danger ? 'rgba(224,122,122,0.13)' : '#22354e') : 'transparent', color: disabled ? '#2a3e58' : hov ? (danger ? '#f0a0a0' : '#cfe0ef') : '#5f7896', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s ease' }}>
      {children}
    </button>
  )
}

function FormIcon({ small }: { small?: boolean }) {
  const size = small ? 16 : 20
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={small ? '#7fb0d8' : '#5f7896'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}
