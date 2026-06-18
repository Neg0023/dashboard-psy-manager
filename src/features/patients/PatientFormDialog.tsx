import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api'
import { patientSchema, type PatientFormValues } from './patientSchema'
import { useCreatePatient, useUpdatePatient } from './hooks'
import type { Patient, PatientRequest } from './types'

interface PatientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient?: Patient | null
}

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

// ─── shared styles ──────────────────────────────────────────────────────────

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

const errorStyle: React.CSSProperties = {
  fontSize: 12, color: '#e89090', marginTop: 4,
  display: 'flex', alignItems: 'center', gap: 5,
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <div style={errorStyle}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  )
}

function FocusableInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const style: React.CSSProperties = {
    ...inputBase,
    ...(error ? { borderColor: '#e89090' } : {}),
  }
  return (
    <input
      ref={ref}
      {...props}
      style={style}
      onFocus={(e) => { e.currentTarget.style.borderColor = error ? '#e89090' : '#7fb0d8'; props.onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.borderColor = error ? '#e89090' : '#2a3e58'; props.onBlur?.(e) }}
    />
  )
}

function FocusableTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputBase, resize: 'vertical', minHeight: 80, ...props.style }}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#7fb0d8'; props.onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.borderColor = '#2a3e58'; props.onBlur?.(e) }}
    />
  )
}

function FocusableSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...inputBase, cursor: 'pointer', ...props.style }}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#7fb0d8'; props.onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.borderColor = '#2a3e58'; props.onBlur?.(e) }}
    />
  )
}

// ─── Dialog ─────────────────────────────────────────────────────────────────

export function PatientFormDialog({ open, onOpenChange, patient }: PatientFormDialogProps) {
  const createMutation = useCreatePatient()
  const updateMutation = useUpdatePatient()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: toDefaults(patient),
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) reset(toDefaults(patient))
  }, [open, patient, reset])

  // Scroll lock + ESC handler
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

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
      updateMutation.mutate({ id: patient.id, body }, {
        onSuccess: () => { toast.success('Paciente atualizado'); onOpenChange(false) },
        onError,
      })
    } else {
      createMutation.mutate(body, {
        onSuccess: () => { toast.success('Paciente criado'); onOpenChange(false) },
        onError,
      })
    }
  }

  if (!open) return null

  const canSave = !isPending && isDirty && isValid

  return createPortal(
    <div
      onClick={() => onOpenChange(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(8,13,22,0.72)', backdropFilter: 'blur(3px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 540, background: '#16243a', border: '1px solid #2a3e58', borderRadius: 18, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', color: '#eef4fa', fontFamily: "'Manrope', sans-serif" }}
      >
        {/* Header */}
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid #22354e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
            {patient ? 'Editar paciente' : 'Novo paciente'}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{ background: 'transparent', border: 'none', color: '#5f7896', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#cfe0ef'; e.currentTarget.style.background = '#1c2c42' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#5f7896'; e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form
          id="patient-form"
          onSubmit={handleSubmit(onSubmit)}
          style={{ overflowY: 'auto', flex: 1, padding: '20px 26px' }}
        >
          {/* Section: Dados pessoais */}
          <SectionLabel>Dados pessoais</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome completo <Req /></label>
              <FocusableInput {...register('fullName')} error={!!errors.fullName} placeholder="Nome completo do paciente" />
              <FieldError msg={errors.fullName?.message} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>CPF <span style={{ color: '#5f7896', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <FocusableInput {...register('cpf')} error={!!errors.cpf} placeholder="000.000.000-00" />
                <FieldError msg={errors.cpf?.message} />
              </div>
              <div>
                <label style={labelStyle}>Nascimento <Req /></label>
                <FocusableInput {...register('birthDate')} error={!!errors.birthDate} type="date" />
                <FieldError msg={errors.birthDate?.message} />
              </div>
            </div>
          </div>

          {/* Section: Contato */}
          <SectionLabel style={{ marginTop: 22 }}>Contato</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Telefone / WhatsApp <Req /></label>
                <FocusableInput {...register('phone')} error={!!errors.phone} placeholder="(00) 00000-0000" />
                <FieldError msg={errors.phone?.message} />
              </div>
              <div>
                <label style={labelStyle}>E-mail <Req /></label>
                <FocusableInput {...register('email')} error={!!errors.email} type="email" placeholder="email@exemplo.com" />
                <FieldError msg={errors.email?.message} />
              </div>
            </div>
          </div>

          {/* Section: Outros */}
          <SectionLabel style={{ marginTop: 22 }}>Outros dados</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Status <Req /></label>
                <FocusableSelect {...register('status')}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </FocusableSelect>
              </div>
              <div>
                <label style={labelStyle}>Profissão</label>
                <FocusableInput {...register('profession')} placeholder="Ex.: professora" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Endereço</label>
              <FocusableInput {...register('address')} placeholder="Rua, número, bairro..." />
            </div>

            <div>
              <label style={labelStyle}>Observações</label>
              <FocusableTextarea {...register('notes')} rows={3} placeholder="Histórico, notas clínicas..." />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: '16px 26px', background: '#142032', borderTop: '1px solid #22354e', display: 'flex', justifyContent: 'flex-end', gap: 11 }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{ background: 'transparent', border: '1.5px solid #355075', color: '#cfe0ef', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'background .15s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1c2c42')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="patient-form"
            disabled={!canSave}
            style={{
              background: canSave ? '#7fb0d8' : '#22354e',
              color: canSave ? '#16243a' : '#566f8c',
              border: 'none', borderRadius: 10, padding: '10px 22px',
              fontSize: 13, fontWeight: 700,
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontFamily: "'Manrope', sans-serif",
              transition: 'background .15s ease',
            }}
          >
            {isPending ? 'Salvando…' : patient ? 'Salvar alterações' : 'Criar paciente'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#5f7896', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12, ...style }}>
      {children}
    </div>
  )
}

function Req() {
  return <span style={{ color: '#e89090' }}>*</span>
}
