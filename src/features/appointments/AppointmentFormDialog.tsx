import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api'
import { localInputToIso } from '@/lib/datetime'
import { listPatients } from '@/features/patients/api'
import { useCreateAppointment, useDeleteAppointment, useUpdateAppointment } from './hooks'
import { STATUS_STYLE, isoToDateKey, isoToHHMM, type DrawerPreset } from './AgendaPage'
import type { Appointment, AppointmentRequest, AppointmentStatus } from './types'

// ─── helpers ───────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
const AVATAR_PALETTE = ['#7fb0d8', '#9ec9a8', '#d8b87f', '#c9a0d8', '#d89e9e', '#7fcfd8']
const avatarColor = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length]

function getInitials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function minsOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function buildISO(dateKey: string, hhmm: string): string {
  return localInputToIso(`${dateKey}T${hhmm}`)
}

// ─── status pills ────────────────────────────────────────────────────────────

const STATUS_PILLS: { label: string; value: AppointmentStatus }[] = [
  { label: 'Agendada',   value: 'SCHEDULED'            },
  { label: 'Confirmada', value: 'CONFIRMED'             },
  { label: 'Realizada',  value: 'DONE'                  },
  { label: 'Cancelada',  value: 'CANCELED_BY_PATIENT'   },
]

function isPillActive(pillValue: AppointmentStatus, current: AppointmentStatus): boolean {
  if (pillValue === 'CANCELED_BY_PATIENT') return current === 'CANCELED_BY_PATIENT' || current === 'CANCELED_BY_PROFESSIONAL'
  return pillValue === current
}

// ─── form state ───────────────────────────────────────────────────────────────

interface DrawerForm {
  patientId: string
  patientName: string
  query: string
  dateKey: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes: string
}

function initForm(appt: Appointment | null, preset: DrawerPreset | null): DrawerForm {
  if (appt) {
    return {
      patientId: String(appt.patientId),
      patientName: appt.patientName,
      query: appt.patientName,
      dateKey: isoToDateKey(appt.startTime),
      startTime: isoToHHMM(appt.startTime),
      endTime: isoToHHMM(appt.endTime),
      status: appt.status,
      notes: appt.notes ?? '',
    }
  }
  const d = new Date()
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const h = preset?.startHour ?? 9
  return {
    patientId: '', patientName: '', query: '',
    dateKey: preset?.dateKey ?? today,
    startTime: `${pad(h)}:00`,
    endTime: `${pad(Math.min(h + 1, 20))}:00`,
    status: 'SCHEDULED', notes: '',
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  appointment: Appointment | null
  preset: DrawerPreset | null
  appointments: Appointment[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentFormDialog({ open, onClose, appointment, preset, appointments }: Props) {
  const [form, setForm] = useState<DrawerForm>(() => initForm(appointment, preset))
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const createMutation = useCreateAppointment()
  const updateMutation = useUpdateAppointment()
  const deleteMutation = useDeleteAppointment()
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  useEffect(() => {
    if (open) setForm(initForm(appointment, preset))
  }, [open, appointment, preset])

  // debounce patient search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(form.query), 280)
    return () => clearTimeout(t)
  }, [form.query])

  // scroll lock + ESC
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  const patientChosen = !!form.patientId && form.query === form.patientName
  const showSuggestions = !patientChosen && debouncedQuery.length >= 1

  const { data: patientsPage } = useQuery({
    queryKey: ['patients-autocomplete', debouncedQuery],
    queryFn: () => listPatients({ q: debouncedQuery, status: 'ACTIVE', size: 8 }),
    enabled: showSuggestions,
  })
  const suggestions = showSuggestions ? (patientsPage?.content ?? []) : []

  // conflict detection
  const timeError = !!(form.startTime && form.endTime && minsOf(form.endTime) <= minsOf(form.startTime))
  const conflict = (() => {
    if (!form.dateKey || !form.startTime || !form.endTime || timeError) return null
    const a0 = minsOf(form.startTime), a1 = minsOf(form.endTime)
    return appointments.find(a => {
      if (appointment && a.id === appointment.id) return false
      if (a.status === 'CANCELED_BY_PATIENT' || a.status === 'CANCELED_BY_PROFESSIONAL') return false
      if (isoToDateKey(a.startTime) !== form.dateKey) return false
      const s0 = minsOf(isoToHHMM(a.startTime)), s1 = minsOf(isoToHHMM(a.endTime))
      return a0 < s1 && a1 > s0
    }) ?? null
  })()

  const canSave = patientChosen && !!form.dateKey && !!form.startTime && !!form.endTime && !timeError && !conflict && !isPending

  function set<K extends keyof DrawerForm>(k: K, v: DrawerForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function pickPatient(id: string, name: string) {
    setForm(prev => ({ ...prev, patientId: id, patientName: name, query: name }))
  }

  function handleSubmit() {
    if (!canSave) return
    const body: AppointmentRequest = {
      patientId: Number(form.patientId),
      startTime: buildISO(form.dateKey, form.startTime),
      endTime: buildISO(form.dateKey, form.endTime),
      status: form.status,
      notes: form.notes || null,
    }
    const onError = (err: unknown) => toast.error(getApiErrorMessage(err, 'Erro ao salvar sessão'))
    if (appointment) {
      updateMutation.mutate({ id: appointment.id, body }, {
        onSuccess: () => { toast.success('Sessão atualizada'); onClose() }, onError,
      })
    } else {
      createMutation.mutate(body, {
        onSuccess: () => { toast.success('Sessão agendada'); onClose() }, onError,
      })
    }
  }

  function handleDelete() {
    if (!appointment) return
    if (!window.confirm('Excluir esta sessão?')) return
    deleteMutation.mutate(appointment.id, {
      onSuccess: () => { toast.success('Sessão excluída'); onClose() },
      onError: (err) => toast.error(getApiErrorMessage(err, 'Erro ao excluir sessão')),
    })
  }

  if (!open) return null

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,13,22,0.66)', backdropFilter: 'blur(3px)', zIndex: 200, display: 'flex', justifyContent: 'flex-end', animation: 'elo-overlay-in .2s ease' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 430, maxWidth: '92vw', height: '100%', background: '#16243a', borderLeft: '1px solid #2a3e58', boxShadow: '-24px 0 60px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', animation: 'elo-drawer-in .28s cubic-bezier(.2,.8,.2,1)', color: '#eef4fa', fontFamily: "'Manrope', sans-serif" }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px', borderBottom: '1px solid #22354e', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{appointment ? 'Editar sessão' : 'Agendar sessão'}</h2>
            <div style={{ fontSize: 13, color: '#8aa3bf', marginTop: 3 }}>{appointment ? 'Atualize os dados da sessão.' : 'Preencha os dados da nova sessão.'}</div>
          </div>
          <DIconBtn onClick={onClose}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </DIconBtn>
        </div>

        {/* Body */}
        <div className="elo-cal" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 24px' }}>

          {/* Patient */}
          <DLabel>Paciente</DLabel>
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#0f1726', border: `1px solid ${patientChosen ? '#2f5a45' : '#2a3e58'}`, borderRadius: 9, padding: '11px 13px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5f7896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={form.query}
                onChange={e => {
                  const v = e.target.value
                  setForm(prev => ({ ...prev, query: v, ...(form.patientId && v !== form.patientName ? { patientId: '', patientName: '' } : {}) }))
                }}
                placeholder="Buscar paciente pelo nome…"
                style={{ border: 'none', background: 'transparent', color: '#eef4fa', fontFamily: "'Manrope', sans-serif", fontSize: 14, width: '100%', outline: 'none' }}
              />
              {patientChosen && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7fcfa0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
            {showSuggestions && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#152234', border: '1px solid #2a3e58', borderRadius: 10, boxShadow: '0 16px 36px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 10 }}>
                {suggestions.length === 0 && (
                  <div style={{ padding: 13, fontSize: 13, color: '#5f7896', textAlign: 'center' }}>Nenhum paciente encontrado.</div>
                )}
                {suggestions.map(p => (
                  <SuggestionRow key={p.id} name={p.fullName} avatarBg={avatarColor(p.id)} initials={getInitials(p.fullName)} onPick={() => pickPatient(String(p.id), p.fullName)} />
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <DLabel>Data</DLabel>
          <DInput type="date" value={form.dateKey} onChange={e => set('dateKey', e.target.value)} style={{ marginBottom: 18 }} />

          {/* Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <DLabel>Início</DLabel>
              <DInput type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} step={300} hasError={timeError} />
            </div>
            <div>
              <DLabel>Fim</DLabel>
              <DInput type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} step={300} hasError={timeError} />
            </div>
          </div>
          {timeError
            ? <div style={{ color: '#e89090', fontSize: 12, fontWeight: 600, marginTop: 6, marginBottom: 12 }}>O horário de fim deve ser depois do início.</div>
            : <div style={{ height: 18 }} />
          }

          {/* Status */}
          <DLabel>Status</DLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {STATUS_PILLS.map(pill => {
              const active = isPillActive(pill.value, form.status)
              const s = STATUS_STYLE[pill.value]
              return (
                <StatusPill key={pill.value} label={pill.label} dot={s.dot} active={active}
                  activeBg={s.bg} activeBorder={s.accent} activeColor={s.text}
                  onClick={() => set('status', pill.value)} />
              )
            })}
          </div>

          {/* Conflict warning */}
          {conflict && (
            <div style={{ display: 'flex', gap: 12, background: 'rgba(232,144,144,0.10)', border: '1px solid #7e3b3b', borderLeft: '4px solid #e89090', borderRadius: 11, padding: '14px 15px', marginBottom: 18 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e89090" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#f2c4c4' }}>Atenção: conflito de horário</div>
                <div style={{ fontSize: 13, color: '#d9aeb0', marginTop: 4, lineHeight: 1.5 }}>
                  Este horário conflita com a sessão de{' '}
                  <b style={{ color: '#f2d4d4' }}>{conflict.patientName}</b>{' '}
                  ({isoToHHMM(conflict.startTime)}–{isoToHHMM(conflict.endTime)}). Ajuste o horário para confirmar.
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <DLabel>Observações</DLabel>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Anotações sobre a sessão…"
            rows={3}
            style={{ width: '100%', background: '#0f1726', border: '1.5px solid #2a3e58', borderRadius: 9, padding: '11px 13px', color: '#eef4fa', fontFamily: "'Manrope', sans-serif", fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', colorScheme: 'dark' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#7fb0d8')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a3e58')}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: appointment ? 'space-between' : 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid #22354e', background: '#142032', flexShrink: 0 }}>
          {appointment && (
            <DeleteBtn onClick={handleDelete} disabled={isPending} />
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <CancelBtn onClick={onClose} />
            <SaveBtn onClick={handleSubmit} canSave={canSave} isPending={isPending} isEdit={!!appointment} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#9bb0c6', marginBottom: 6 }}>{children}</label>
}

function DInput({ hasError, style, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input
      {...props}
      style={{ width: '100%', background: '#0f1726', border: `1px solid ${hasError ? '#e89090' : '#2a3e58'}`, borderRadius: 9, padding: '11px 13px', color: '#eef4fa', fontFamily: "'Manrope', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark', ...style }}
      onFocus={e => { e.currentTarget.style.borderColor = hasError ? '#e89090' : '#7fb0d8'; props.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = hasError ? '#e89090' : '#2a3e58'; props.onBlur?.(e) }}
    />
  )
}

function DIconBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #2a3e58', background: hov ? '#1c2c42' : 'transparent', color: hov ? '#eef4fa' : '#8aa3bf', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s ease, color .15s ease' }}>
      {children}
    </button>
  )
}

function SuggestionRow({ name, avatarBg, initials, onPick }: { name: string; avatarBg: string; initials: string; onPick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onPick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', cursor: 'pointer', borderBottom: '1px solid #1d2d42', background: hov ? '#1c2c44' : 'transparent', transition: 'background .15s ease' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0f1726', flexShrink: 0 }}>{initials}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#eef4fa' }}>{name}</div>
    </div>
  )
}

function StatusPill({ label, dot, active, activeBg, activeBorder, activeColor, onClick }: {
  label: string; dot: string; active: boolean
  activeBg: string; activeBorder: string; activeColor: string
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: '9px 15px', borderRadius: 999, border: `1px solid ${active ? activeBorder : '#2a3e58'}`, background: active ? activeBg : 'transparent', color: active ? activeColor : '#8aa3bf', fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, filter: hov ? 'brightness(1.12)' : 'none', transition: 'filter .15s ease' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? dot : '#4f6885', display: 'inline-block' }} />
      {label}
    </button>
  )
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? '#1c2c42' : 'transparent', border: '1.5px solid #355075', borderRadius: 10, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#cfe0ef', transition: 'background .15s ease' }}>
      Cancelar
    </button>
  )
}

function SaveBtn({ onClick, canSave, isPending, isEdit }: { onClick: () => void; canSave: boolean; isPending: boolean; isEdit: boolean }) {
  return (
    <button onClick={onClick} disabled={!canSave}
      style={{ border: 'none', borderRadius: 10, padding: '11px 24px', fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, background: canSave ? '#7fb0d8' : '#22354e', color: canSave ? '#16243a' : '#566f8c', cursor: canSave ? 'pointer' : 'not-allowed', transition: 'background .15s ease' }}>
      {isPending ? 'Salvando…' : isEdit ? 'Salvar' : 'Confirmar'}
    </button>
  )
}

function DeleteBtn({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov && !disabled ? 'rgba(232,144,144,0.15)' : 'transparent', border: '1px solid #7e3b3b', borderRadius: 10, padding: '10px 16px', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, color: '#e89090', display: 'flex', alignItems: 'center', gap: 8, transition: 'background .15s ease', opacity: disabled ? 0.6 : 1 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      Excluir
    </button>
  )
}
