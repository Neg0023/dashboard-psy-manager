import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api'
import { listPatients } from '@/features/patients/api'
import type { Patient } from '@/features/patients/types'
import { useCreateEntry, useDeleteEntry, useUpdateEntry } from './hooks'
import type { EntryStatus, EntryType, FinancialEntry, FinancialEntryRequest } from './types'

// ─── currency mask ────────────────────────────────────────────────────────────

function maskValor(raw: string): string {
  let d = (raw ?? '').replace(/\D/g, '')
  if (!d) return ''
  d = d.replace(/^0+/, '') || '0'
  while (d.length < 3) d = '0' + d
  const reais = d.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${reais},${d.slice(-2)}`
}

function amountToMasked(amount: number): string {
  return maskValor(String(Math.round(amount * 100)))
}

function maskedToAmount(s: string): number {
  const digits = s.replace(/\D/g, '')
  return parseInt(digits || '0', 10) / 100
}

// ─── shared input styles ──────────────────────────────────────────────────────

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
    <input
      {...rest}
      style={{ ...inputBase, ...style }}
      onFocus={(e) => { e.currentTarget.style.borderColor = '#7fb0d8'; onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.borderColor = '#2a3e58'; onBlur?.(e) }}
    />
  )
}

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  entry: FinancialEntry | null
}

// ─── FinanceEntryFormDialog ───────────────────────────────────────────────────

export function FinanceEntryFormDialog({ open, onClose, entry }: Props) {
  const isEdit = entry != null

  const [tipo, setTipo] = useState<EntryType>('RECEITA')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [statusEntry, setStatusEntry] = useState<EntryStatus>('PENDENTE')
  const [patientId, setPatientId] = useState<number | null>(null)
  const [patientName, setPatientName] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const queryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const createMutation = useCreateEntry()
  const updateMutation = useUpdateEntry()
  const deleteMutation = useDeleteEntry()
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  useEffect(() => {
    if (!open) return
    if (entry) {
      setTipo(entry.type)
      setDescricao(entry.description)
      setValor(amountToMasked(entry.amount))
      setVencimento(entry.competenceDate)
      setStatusEntry(entry.status)
      setPatientId(entry.patientId ?? null)
      setPatientName(entry.patientName ?? '')
      setQuery(entry.patientName ?? '')
    } else {
      setTipo('RECEITA')
      setDescricao('')
      setValor('')
      setVencimento('')
      setStatusEntry('PENDENTE')
      setPatientId(null)
      setPatientName('')
      setQuery('')
    }
    setShowSuggestions(false)
    setDebouncedQuery('')
  }, [open, entry])

  useEffect(() => {
    if (queryRef.current) clearTimeout(queryRef.current)
    queryRef.current = setTimeout(() => setDebouncedQuery(query), 300)
    return () => { if (queryRef.current) clearTimeout(queryRef.current) }
  }, [query])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const { data: suggestions = [] } = useQuery({
    queryKey: ['patients-autocomplete', debouncedQuery],
    queryFn: () => listPatients({ q: debouncedQuery, status: 'ACTIVE', size: 8 }).then(p => p.content),
    enabled: showSuggestions && debouncedQuery.length >= 1,
    staleTime: 30_000,
  })

  function handleTipoChange(t: EntryType) {
    setTipo(t)
    if (t === 'DESPESA') { setPatientId(null); setPatientName(''); setQuery('') }
  }

  function selectPatient(id: number, name: string) {
    setPatientId(id); setPatientName(name); setQuery(name); setShowSuggestions(false)
  }

  function buildBody(): FinancialEntryRequest {
    return {
      description: descricao.trim(),
      amount: maskedToAmount(valor),
      competenceDate: vencimento,
      type: tipo,
      status: statusEntry,
      patientId: tipo === 'RECEITA' && patientId ? patientId : null,
    }
  }

  function canSave(): boolean {
    return !isPending && descricao.trim().length > 0 && maskedToAmount(valor) > 0 && vencimento.length === 10
  }

  function handleSave() {
    const body = buildBody()
    const onError = (error: unknown) => toast.error(getApiErrorMessage(error, 'Erro ao salvar lançamento'))
    if (isEdit) {
      updateMutation.mutate({ id: entry.id, body }, {
        onSuccess: () => { toast.success('Lançamento atualizado'); onClose() },
        onError,
      })
    } else {
      createMutation.mutate(body, {
        onSuccess: () => { toast.success('Lançamento criado'); onClose() },
        onError,
      })
    }
  }

  function handleDelete() {
    if (!entry) return
    if (!window.confirm('Excluir este lançamento?')) return
    deleteMutation.mutate(entry.id, {
      onSuccess: () => { toast.success('Lançamento excluído'); onClose() },
      onError: (err) => toast.error(getApiErrorMessage(err, 'Erro ao excluir')),
    })
  }

  if (!open) return null

  const recActive = tipo === 'RECEITA'
  const isPago = statusEntry === 'PAGO'

  const tipoRecBorder = recActive ? '#3f7d5c' : '#2a3e58'
  const tipoRecBg = recActive ? 'rgba(92,201,142,0.13)' : 'transparent'
  const tipoRecColor = recActive ? '#7fd9a6' : '#8aa3bf'
  const tipoDespBorder = !recActive ? '#7e3b3b' : '#2a3e58'
  const tipoDespBg = !recActive ? 'rgba(224,122,122,0.13)' : 'transparent'
  const tipoDespColor = !recActive ? '#f0a0a0' : '#8aa3bf'
  const pagoBorder = isPago ? '#3f7d5c' : '#2a3e58'
  const pagoBg = isPago ? 'rgba(92,201,142,0.13)' : 'transparent'
  const pagoColor = isPago ? '#7fd9a6' : '#8aa3bf'
  const pendBorder = !isPago ? '#8a6a2e' : '#2a3e58'
  const pendBg = !isPago ? 'rgba(224,182,106,0.13)' : 'transparent'
  const pendColor = !isPago ? '#e6c98a' : '#8aa3bf'

  return createPortal(
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(8,13,22,0.6)', animation: 'elo-overlay-in .18s ease' }} />
      <div
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9999, width: 440, background: '#16243a', borderLeft: '1px solid #2a3e58', display: 'flex', flexDirection: 'column', fontFamily: "'Manrope', sans-serif", color: '#eef4fa', animation: 'elo-drawer-in .22s ease' }}>
        {/* Header */}
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid #22354e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
            {isEdit ? 'Editar lançamento' : 'Novo lançamento'}
          </div>
          <XBtn onClick={onClose} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <TipoBtn border={tipoRecBorder} bg={tipoRecBg} color={tipoRecColor} onClick={() => handleTipoChange('RECEITA')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={recActive ? '#5cc98e' : '#5f7896'} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Receita
              </TipoBtn>
              <TipoBtn border={tipoDespBorder} bg={tipoDespBg} color={tipoDespColor} onClick={() => handleTipoChange('DESPESA')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={!recActive ? '#e07a7a' : '#5f7896'} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Despesa
              </TipoBtn>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição</label>
            <DInput value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={tipo === 'RECEITA' ? 'Ex.: Sessão de terapia' : 'Ex.: Aluguel da sala'} />
          </div>

          {/* Valor */}
          <div>
            <label style={labelStyle}>Valor</label>
            <ValorInput valor={valor} onChange={setValor} />
          </div>

          {/* Paciente (only for Receita) */}
          {tipo === 'RECEITA' && (
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Paciente <span style={{ color: '#5f7896', textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(opcional)</span></label>
              {patientId ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f1726', border: '1.5px solid #2a3e58', borderRadius: 9, padding: '10px 13px' }}>
                  <span style={{ fontSize: 14 }}>{patientName}</span>
                  <button onClick={() => { setPatientId(null); setPatientName(''); setQuery('') }} style={{ background: 'transparent', border: 'none', color: '#5f7896', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <>
                  <DInput value={query} onChange={e => { setQuery(e.target.value); setShowSuggestions(true); setPatientId(null) }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} placeholder="Buscar paciente…" />
                  {showSuggestions && suggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#16243a', border: '1px solid #2a3e58', borderRadius: 9, boxShadow: '0 10px 28px rgba(0,0,0,0.5)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                      {(suggestions as Patient[]).map(p => (
                        <SuggestionItem key={p.id} name={p.fullName} onClick={() => selectPatient(p.id, p.fullName)} />
                      ))}
                    </div>
                  )}
                  {showSuggestions && debouncedQuery.length >= 1 && suggestions.length === 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#16243a', border: '1px solid #2a3e58', borderRadius: 9, padding: '12px 14px', fontSize: 13, color: '#5f7896', zIndex: 10 }}>
                      Nenhum paciente encontrado.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Vencimento */}
          <div>
            <label style={labelStyle}>Vencimento</label>
            <DInput type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <StatusBtn border={pagoBorder} bg={pagoBg} color={pagoColor} onClick={() => setStatusEntry('PAGO')}>Pago</StatusBtn>
              <StatusBtn border={pendBorder} bg={pendBg} color={pendColor} onClick={() => setStatusEntry('PENDENTE')}>Pendente</StatusBtn>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 26px', background: '#0f1726', borderTop: '1px solid #22354e', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isEdit && (
            <button onClick={handleDelete} disabled={isPending}
              style={{ background: 'transparent', border: '1.5px solid #6e3838', color: '#f0a0a0', borderRadius: 10, padding: '10px 15px', fontSize: 13, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Excluir
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose}
            style={{ background: 'transparent', border: '1.5px solid #355075', color: '#cfe0ef', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1c2c42')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!canSave()}
            style={{ background: canSave() ? '#7fb0d8' : '#22354e', color: canSave() ? '#16243a' : '#566f8c', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: canSave() ? 'pointer' : 'not-allowed', fontFamily: "'Manrope', sans-serif", whiteSpace: 'nowrap' }}>
            {isPending ? 'Salvando…' : 'Salvar lançamento'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────

function XBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ background: 'transparent', border: 'none', color: '#5f7896', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#cfe0ef'; e.currentTarget.style.background = '#1c2c42' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#5f7896'; e.currentTarget.style.background = 'transparent' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  )
}

function TipoBtn({ border, bg, color, onClick, children }: { border: string; bg: string; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: `1.5px solid ${border}`, borderRadius: 11, padding: '12px 0', background: bg, color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'all .15s ease' }}>
      {children}
    </button>
  )
}

function StatusBtn({ border, bg, color, onClick, children }: { border: string; bg: string; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ flex: 1, border: `1.5px solid ${border}`, borderRadius: 9, padding: '10px 0', background: bg, color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'all .15s ease' }}>
      {children}
    </button>
  )
}

function ValorInput({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${focused ? '#7fb0d8' : '#2a3e58'}`, borderRadius: 9, background: '#0f1726', overflow: 'hidden', transition: 'border-color .15s ease' }}>
      <span style={{ padding: '10px 0 10px 13px', color: '#5f7896', fontSize: 14, flexShrink: 0 }}>R$</span>
      <input value={valor} onChange={e => onChange(maskValor(e.target.value))} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="0,00" inputMode="numeric"
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '10px 13px', color: '#eef4fa', fontFamily: "'Manrope', sans-serif", fontSize: 14, colorScheme: 'dark' }} />
    </div>
  )
}

function SuggestionItem({ name, onClick }: { name: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: '10px 14px', cursor: 'pointer', background: hov ? '#1c2c42' : 'transparent', fontSize: 14, transition: 'background .12s ease' }}>
      {name}
    </div>
  )
}
