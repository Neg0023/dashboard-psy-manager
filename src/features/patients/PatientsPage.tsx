import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import { usePatients, useDeactivatePatient, useUpdatePatient } from './hooks'
import { PatientFormDialog } from './PatientFormDialog'
import { usePatientAppointments } from '@/features/appointments/hooks'
import { useForms } from '@/features/forms/hooks'
import { APPOINTMENT_STATUS_LABELS } from '@/features/appointments/types'
import type { Patient, PatientStatus, PatientRequest } from './types'

// ─── helpers ───────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#7fb0d8', '#9ec9a8', '#d8b87f', '#c9a0d8', '#d89e9e', '#7fcfd8']

function avatarColor(id: number) {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatCpf(cpf: string | null): string {
  if (!cpf) return '—'
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatBirthDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso)
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${d.getDate()} ${months[d.getMonth()]} · ${d.getFullYear()}`
}

function statusStyle(status: PatientStatus) {
  return status === 'ACTIVE'
    ? { color: '#7fcfa0', bg: 'rgba(127,207,160,0.13)', label: 'Ativo' }
    : { color: '#8aa3bf', bg: 'rgba(138,163,191,0.13)', label: 'Inativo' }
}

// ─── shared input style ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#16243a', border: '1px solid #22354e',
  borderRadius: 10, padding: '10px 14px', color: '#eef4fa',
  fontFamily: "'Manrope', sans-serif", fontSize: 14, outline: 'none',
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function PatientsPage() {
  const [view, setView] = useState<'list' | 'profile'>('list')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | PatientStatus>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading, isError } = usePatients({ q: q || undefined, status: statusFilter || undefined, page: 0, size: 50 })
  const deactivateMutation = useDeactivatePatient()
  const updateMutation = useUpdatePatient()

  const patients = data?.content ?? []
  const total = data?.totalElements ?? patients.length
  const ativos = patients.filter((p) => p.status === 'ACTIVE').length

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(patient: Patient) {
    setEditing(patient)
    setDialogOpen(true)
  }

  function openProfile(patient: Patient) {
    setSelectedPatient(patient)
    setView('profile')
  }

  function handleToggleStatus(patient: Patient, e: React.MouseEvent) {
    e.stopPropagation()
    if (patient.status === 'ACTIVE') {
      deactivateMutation.mutate(patient.id, {
        onSuccess: () => toast.success('Paciente inativado'),
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erro ao inativar paciente')),
      })
    } else {
      const body: PatientRequest = {
        fullName: patient.fullName, cpf: patient.cpf, birthDate: patient.birthDate,
        phone: patient.phone, email: patient.email, status: 'ACTIVE',
        profession: patient.profession, address: patient.address, notes: patient.notes,
      }
      updateMutation.mutate({ id: patient.id, body }, {
        onSuccess: () => toast.success('Paciente reativado'),
        onError: (err) => toast.error(getApiErrorMessage(err, 'Erro ao reativar paciente')),
      })
    }
  }

  return (
    <div style={{ padding: '30px 38px 48px' }}>
      {view === 'list' ? (
        <ListView
          patients={patients}
          total={total}
          ativos={ativos}
          isLoading={isLoading}
          isError={isError}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onOpenCreate={openCreate}
          onOpenProfile={openProfile}
          onToggleStatus={handleToggleStatus}
        />
      ) : (
        selectedPatient && (
          <ProfileView
            patient={selectedPatient}
            onBack={() => setView('list')}
            onEdit={() => openEdit(selectedPatient)}
            onToggleStatus={(e) => handleToggleStatus(selectedPatient, e)}
          />
        )
      )}

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          // se o paciente editado for o selecionado no perfil, não perdemos a view
        }}
        patient={editing}
      />
    </div>
  )
}

// ─── List view ─────────────────────────────────────────────────────────────

interface ListViewProps {
  patients: Patient[]
  total: number
  ativos: number
  isLoading: boolean
  isError: boolean
  searchInput: string
  setSearchInput: (v: string) => void
  statusFilter: '' | PatientStatus
  setStatusFilter: (v: '' | PatientStatus) => void
  onOpenCreate: () => void
  onOpenProfile: (p: Patient) => void
  onToggleStatus: (p: Patient, e: React.MouseEvent) => void
}

function ListView({ patients, total, ativos, isLoading, isError, searchInput, setSearchInput, statusFilter, setStatusFilter, onOpenCreate, onOpenProfile, onToggleStatus }: ListViewProps) {
  const countLabel = `${total} ${total === 1 ? 'paciente' : 'pacientes'} · ${ativos} ${ativos === 1 ? 'ativo' : 'ativos'}`

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Pacientes</h1>
          <div style={{ fontSize: 14, color: '#8aa3bf', marginTop: 6 }}>{countLabel}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#16243a', border: '1px solid #22354e', borderRadius: 10, padding: '10px 14px', width: 240 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5f7896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome ou CPF"
              style={{ border: 'none', background: 'transparent', color: '#eef4fa', fontFamily: "'Manrope', sans-serif", fontSize: 14, width: '100%', outline: 'none' }}
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | PatientStatus)}
            style={{ ...inputStyle, width: 'auto', padding: '10px 12px', cursor: 'pointer' }}
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
          {/* New patient */}
          <ActionButton
            onClick={onOpenCreate}
            style={{ background: '#7fb0d8', boxShadow: '0 6px 16px rgba(127,176,216,0.22)', hoverBg: '#92bfe0' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16243a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#16243a' }}>Novo Paciente</span>
          </ActionButton>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1.4fr 0.9fr 1fr', gap: 16, padding: '14px 22px', borderBottom: '1px solid #22354e', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' as const, color: '#5f7896' }}>
          <div>Paciente</div><div>CPF</div><div>Telefone</div><div>Status</div><div style={{ textAlign: 'right' }}>Ação</div>
        </div>

        {isLoading && (
          <div style={{ padding: '46px', textAlign: 'center', color: '#5f7896', fontSize: 14 }}>Carregando…</div>
        )}
        {isError && (
          <div style={{ padding: '46px', textAlign: 'center', color: '#e89090', fontSize: 14 }}>Erro ao carregar pacientes</div>
        )}
        {!isLoading && !isError && patients.length === 0 && (
          <div style={{ padding: '46px', textAlign: 'center', color: '#5f7896', fontSize: 14 }}>
            {searchInput ? `Nenhum paciente encontrado para "${searchInput}".` : 'Nenhum paciente cadastrado.'}
          </div>
        )}

        {patients.map((patient) => {
          const ss = statusStyle(patient.status)
          const isActive = patient.status === 'ACTIVE'
          const actionStyle = isActive
            ? { label: 'Inativar', color: '#cfe0ef', bg: 'transparent', border: '#355075', dot: '#8aa3bf', hoverBg: '#1c2c42' }
            : { label: 'Ativar', color: '#7fcfa0', bg: 'rgba(127,207,160,0.12)', border: 'rgba(127,207,160,0.4)', dot: '#7fcfa0', hoverBg: 'rgba(127,207,160,0.2)' }

          return (
            <PatientRow
              key={patient.id}
              patient={patient}
              ss={ss}
              actionStyle={actionStyle}
              onClick={() => onOpenProfile(patient)}
              onToggle={(e) => onToggleStatus(patient, e)}
            />
          )
        })}
      </div>
    </>
  )
}

interface RowActionStyle {
  label: string; color: string; bg: string; border: string; dot: string; hoverBg: string
}

function PatientRow({ patient, ss, actionStyle, onClick, onToggle }: {
  patient: Patient
  ss: { color: string; bg: string; label: string }
  actionStyle: RowActionStyle
  onClick: () => void
  onToggle: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1.4fr 0.9fr 1fr', gap: 16, padding: '15px 22px', borderBottom: '1px solid #1b2c43', alignItems: 'center', cursor: 'pointer', background: hovered ? 'rgba(127,176,216,0.04)' : 'transparent', transition: 'background .15s ease' }}
    >
      {/* Name + email */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(patient.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0f1726', flexShrink: 0 }}>
          {getInitials(patient.fullName)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{patient.fullName}</div>
          <div style={{ fontSize: 12, color: '#5f7896', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{patient.email}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#9bb0c6', fontVariantNumeric: 'tabular-nums' }}>{formatCpf(patient.cpf)}</div>
      <div style={{ fontSize: 13, color: '#9bb0c6', fontVariantNumeric: 'tabular-nums' }}>{patient.phone}</div>

      <div>
        <span style={{ fontSize: 12, fontWeight: 700, color: ss.color, background: ss.bg, padding: '4px 11px', borderRadius: 999 }}>
          {ss.label}
        </span>
      </div>

      {/* Action button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onToggle}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: btnHovered ? actionStyle.hoverBg : actionStyle.bg, border: `1px solid ${actionStyle.border}`, color: actionStyle.color, borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'background .15s ease' }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: actionStyle.dot, display: 'inline-block' }} />
          {actionStyle.label}
        </button>
      </div>
    </div>
  )
}

// ─── Profile view ──────────────────────────────────────────────────────────

function ProfileView({ patient, onBack, onEdit, onToggleStatus }: {
  patient: Patient
  onBack: () => void
  onEdit: () => void
  onToggleStatus: (e: React.MouseEvent) => void
}) {
  const [backHovered, setBackHovered] = useState(false)
  const [editHovered, setEditHovered] = useState(false)
  const { data: appointments = [], isLoading: loadingAppts } = usePatientAppointments(patient.id)
  const { data: forms = [], isLoading: loadingForms } = useForms(patient.id)

  const ss = statusStyle(patient.status)
  const isActive = patient.status === 'ACTIVE'
  const toggleStyle = isActive
    ? { label: 'Inativar', color: '#cfe0ef', bg: 'transparent', border: '#355075', dot: '#8aa3bf' }
    : { label: 'Ativar', color: '#7fcfa0', bg: 'rgba(127,207,160,0.12)', border: 'rgba(127,207,160,0.4)', dot: '#7fcfa0' }

  return (
    <>
      {/* Back button */}
      <button
        onClick={onBack}
        onMouseEnter={() => setBackHovered(true)}
        onMouseLeave={() => setBackHovered(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', color: backHovered ? '#cfe0ef' : '#8aa3bf', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, padding: '6px 0', marginBottom: 20, transition: 'color .15s ease' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Pacientes
      </button>

      {/* Patient header card */}
      <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, padding: 26, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ width: 74, height: 74, borderRadius: '50%', background: avatarColor(patient.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#0f1726', flexShrink: 0 }}>
          {getInitials(patient.fullName)}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>{patient.fullName}</h1>
            <span style={{ fontSize: 12, fontWeight: 700, color: ss.color, background: ss.bg, padding: '4px 11px', borderRadius: 999 }}>{ss.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginTop: 12 }}>
            {[
              { label: 'CPF', value: formatCpf(patient.cpf) },
              { label: 'Telefone', value: patient.phone },
              { label: 'E-mail', value: patient.email },
              { label: 'Nascimento', value: formatBirthDate(patient.birthDate) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#5f7896', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 14, color: '#cfe0ef', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              </div>
            ))}
            {patient.profession && (
              <div>
                <div style={{ fontSize: 11, color: '#5f7896', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Profissão</div>
                <div style={{ fontSize: 14, color: '#cfe0ef', marginTop: 3 }}>{patient.profession}</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
          <HoverButton onClick={onEdit} hovered={editHovered} setHovered={setEditHovered}
            base={{ background: 'transparent', border: '1.5px solid #355075', color: '#cfe0ef' }}
            hover={{ background: '#1c2c42' }}
          >
            Editar
          </HoverButton>
          <ToggleButton
            label={toggleStyle.label} color={toggleStyle.color}
            bg={toggleStyle.bg} border={toggleStyle.border} dot={toggleStyle.dot}
            onClick={onToggleStatus}
          />
        </div>
      </div>

      {/* Notes */}
      {patient.notes && (
        <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, padding: 24, marginBottom: 22 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: '#8aa3bf', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observações</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#cfe0ef', lineHeight: 1.6 }}>{patient.notes}</p>
        </div>
      )}

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
        {/* Sessions */}
        <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 18px' }}>Histórico de sessões</h2>
          {loadingAppts && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#5f7896', fontSize: 13 }}>Carregando…</div>
          )}
          {!loadingAppts && appointments.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#5f7896', fontSize: 13, lineHeight: 1.6 }}>
              Nenhuma sessão registrada ainda.<br />O histórico aparecerá aqui após o primeiro atendimento.
            </div>
          )}
          {!loadingAppts && appointments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {appointments.map((appt, i) => (
                <div key={appt.id} style={{ display: 'flex', gap: 15, paddingBottom: 18 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#7fb0d8', marginTop: 4 }} />
                    {i < appointments.length - 1 && (
                      <span style={{ width: 2, flex: 1, background: '#22354e', marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#cfe0ef' }}>{formatSessionDate(appt.startTime)}</div>
                    <div style={{ fontSize: 12, color: '#7fb0d8', marginTop: 2 }}>{APPOINTMENT_STATUS_LABELS[appt.status]}</div>
                    {appt.notes && (
                      <div style={{ fontSize: 13, color: '#8aa3bf', marginTop: 4, lineHeight: 1.5 }}>{appt.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Forms */}
        <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 18px' }}>Formulários vinculados</h2>
          {loadingForms && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#5f7896', fontSize: 13 }}>Carregando…</div>
          )}
          {!loadingForms && forms.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#5f7896', fontSize: 13, lineHeight: 1.6 }}>Nenhum formulário vinculado.</div>
          )}
          {!loadingForms && forms.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {forms.map((form) => (
                <a
                  key={form.id}
                  href={form.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 15px', background: '#1a2c44', border: '1px solid #22354e', borderRadius: 11, cursor: 'pointer', textDecoration: 'none', transition: 'border-color .15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#355075')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#22354e')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7fb0d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#eef4fa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.title}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7fcfa0', background: 'rgba(127,207,160,0.13)', padding: '3px 9px', borderRadius: 999, flexShrink: 0 }}>Gerado</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── small reusable button components ──────────────────────────────────────

function ActionButton({ onClick, children, style: s }: {
  onClick: () => void
  children: React.ReactNode
  style: { background: string; boxShadow: string; hoverBg: string }
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: hovered ? s.hoverBg : s.background, border: 'none', borderRadius: 10, padding: '11px 18px', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", boxShadow: s.boxShadow, transition: 'background .15s ease' }}
    >
      {children}
    </button>
  )
}

function HoverButton({ onClick, children, base, hover, hovered, setHovered }: {
  onClick: () => void
  children: React.ReactNode
  base: React.CSSProperties
  hover: React.CSSProperties
  hovered: boolean
  setHovered: (v: boolean) => void
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...(hovered ? hover : {}), borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, transition: 'background .15s ease' }}
    >
      {children}
    </button>
  )
}

function ToggleButton({ label, color, bg, border, dot, onClick }: {
  label: string; color: string; bg: string; border: string; dot: string
  onClick: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 7, background: hovered ? (bg === 'transparent' ? '#1c2c42' : bg) : bg, border: `1px solid ${border}`, color, borderRadius: 8, padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'background .15s ease' }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block' }} />
      {label}
    </button>
  )
}
