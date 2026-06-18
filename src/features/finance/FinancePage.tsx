import { useMemo, useState } from 'react'
import { useDashboard, useFinanceEntries } from './hooks'
import { FinanceEntryFormDialog } from './FinanceEntryFormDialog'
import type { EntryStatus, EntryType, FinancialEntry } from './types'

// ─── helpers ───────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function monthRange(m: string): { from: string; to: string } {
  const [y, mo] = m.split('-').map(Number)
  const lastDay = new Date(y, mo, 0).getDate()
  return { from: `${m}-01`, to: `${m}-${pad(lastDay)}` }
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, mo, d] = iso.split('-')
  return `${d}/${mo}/${y.slice(2)}`
}

// ─── FinancePage ─────────────────────────────────────────────────────────────

export function FinancePage() {
  const [month, setMonth] = useState(currentMonth)
  const [typeFilter, setTypeFilter] = useState<'' | EntryType>('')
  const [statusFilter, setStatusFilter] = useState<'' | EntryStatus>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialEntry | null>(null)

  const range = useMemo(() => monthRange(month), [month])
  const { data: dashboard } = useDashboard(month)
  const { data: entries = [], isLoading } = useFinanceEntries({
    from: range.from,
    to: range.to,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  })

  const monthIdx = Number(month.slice(5, 7)) - 1
  const year = month.slice(0, 4)
  const monthLabel = `${MONTHS_FULL[monthIdx]} de ${year} · visão geral`
  const monthShort = `${MONTHS_ABBR[monthIdx]} ${year}`

  const totalReceitas = dashboard?.totalReceitas ?? 0
  const totalDespesas = dashboard?.totalDespesas ?? 0
  const saldo = dashboard?.saldoLiquido ?? 0
  const receitaCount = entries.filter(e => e.type === 'RECEITA').length
  const despesaCount = entries.filter(e => e.type === 'DESPESA').length
  const saldoPos = saldo >= 0

  function openCreate() { setEditing(null); setDrawerOpen(true) }
  function openEdit(entry: FinancialEntry) { setEditing(entry); setDrawerOpen(true) }

  return (
    <div style={{ padding: '30px 38px 48px', fontFamily: "'Manrope', sans-serif", color: '#eef4fa', minHeight: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Financeiro</h1>
          <div style={{ fontSize: 14, color: '#8aa3bf', marginTop: 6 }}>{monthLabel}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MonthNav monthShort={monthShort} onPrev={() => setMonth(m => shiftMonth(m, -1))} onNext={() => setMonth(m => shiftMonth(m, 1))} />
          <CreateBtn onClick={openCreate}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16243a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#16243a' }}>Novo Lançamento</span>
          </CreateBtn>
        </div>
      </div>

      {/* ── 3 cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 26 }}>
        <DashCard accent="#5cc98e" iconBg="rgba(92,201,142,0.13)" label="Faturamento" value={currency.format(totalReceitas)} sub={`${receitaCount} ${receitaCount === 1 ? 'lançamento' : 'lançamentos'} de receita`} valueColor="#7fd9a6">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5cc98e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
        </DashCard>
        <DashCard accent="#e07a7a" iconBg="rgba(224,122,122,0.13)" label="Despesas" value={currency.format(totalDespesas)} sub={`${despesaCount} ${despesaCount === 1 ? 'lançamento' : 'lançamentos'} de despesa`} valueColor="#f0a0a0">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e07a7a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></svg>
        </DashCard>
        <DashCard accent={saldoPos ? '#7fb0d8' : '#f0a0a0'} iconBg={saldoPos ? 'rgba(127,176,216,0.13)' : 'rgba(224,122,122,0.13)'} border={saldoPos ? '#22354e' : '#6e3838'} label="Saldo Líquido" value={currency.format(saldo)} sub={saldoPos ? 'Resultado positivo no mês' : 'Atenção: resultado negativo'} valueColor={saldoPos ? '#7fb0d8' : '#f0a0a0'}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={saldoPos ? '#7fb0d8' : '#f0a0a0'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </DashCard>
      </div>

      {/* ── List ── */}
      <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, overflow: 'hidden' }}>
        {/* List header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #22354e', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Lançamentos</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Type filter tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {([['', 'Todos'], ['RECEITA', 'Receitas'], ['DESPESA', 'Despesas']] as [string, string][]).map(([v, l]) => (
                <FilterTab key={v} label={l} active={typeFilter === v} onClick={() => setTypeFilter(v as '' | EntryType)} />
              ))}
            </div>
            {/* Status filter tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {([['', 'Tudo'], ['PAGO', 'Pago'], ['PENDENTE', 'Pendente']] as [string, string][]).map(([v, l]) => (
                <FilterTab key={v} label={l} active={statusFilter === v} onClick={() => setStatusFilter(v as '' | EntryStatus)} />
              ))}
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.1fr 1.1fr 1fr', gap: 16, padding: '13px 22px', borderBottom: '1px solid #22354e', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#5f7896' }}>
          <div>Descrição</div><div>Categoria</div><div>Vencimento</div><div>Status</div><div style={{ textAlign: 'right' }}>Valor</div>
        </div>

        {isLoading && (
          <div style={{ padding: '46px', textAlign: 'center', color: '#5f7896', fontSize: 14 }}>Carregando…</div>
        )}
        {!isLoading && entries.length === 0 && (
          <div style={{ padding: '46px', textAlign: 'center', color: '#5f7896', fontSize: 14 }}>Nenhum lançamento neste filtro.</div>
        )}
        {entries.map(entry => (
          <EntryRow key={entry.id} entry={entry} onClick={() => openEdit(entry)} />
        ))}
      </div>

      <FinanceEntryFormDialog open={drawerOpen} onClose={() => setDrawerOpen(false)} entry={editing} />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MonthNav({ monthShort, onPrev, onNext }: { monthShort: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <NavBtn onClick={onPrev}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></NavBtn>
      <div style={{ minWidth: 128, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#cfe0ef' }}>{monthShort}</div>
      <NavBtn onClick={onNext}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></NavBtn>
    </div>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #22354e', background: hov ? '#1c2c42' : '#16243a', color: hov ? '#eef4fa' : '#9bb0c6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s ease, color .15s ease' }}>
      {children}
    </button>
  )
}

function CreateBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: hov ? '#9ec9ec' : '#7fb0d8', border: 'none', borderRadius: 10, padding: '11px 18px', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", boxShadow: hov ? '0 8px 22px rgba(127,176,216,0.34)' : '0 6px 16px rgba(127,176,216,0.22)', transition: 'background .15s ease, box-shadow .15s ease' }}>
      {children}
    </button>
  )
}

function DashCard({ accent, iconBg, border, label, value, sub, valueColor, children }: {
  accent: string; iconBg: string; border?: string; label: string; value: string; sub: string; valueColor: string; children: React.ReactNode
}) {
  return (
    <div style={{ background: '#16243a', border: `1px solid ${border ?? '#22354e'}`, borderRadius: 16, padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: accent }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#8aa3bf' }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: valueColor, marginTop: 14, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#5f7896', marginTop: 6 }}>{sub}</div>
    </div>
  )
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ height: 30, padding: '0 13px', border: `1px solid ${active ? '#7fb0d8' : '#22354e'}`, borderRadius: 8, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: 12.5, fontWeight: 700, background: active ? 'rgba(127,176,216,0.13)' : 'transparent', color: active ? '#cfe0ef' : '#8aa3bf', transition: 'all .15s ease' }}>
      {label}
    </button>
  )
}

function EntryRow({ entry, onClick }: { entry: FinancialEntry; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const isRec = entry.type === 'RECEITA'
  const isPago = entry.status === 'PAGO'
  const iconBg = isRec ? 'rgba(92,201,142,0.13)' : 'rgba(224,122,122,0.13)'
  const iconColor = isRec ? '#5cc98e' : '#e07a7a'
  const statusColor = isPago ? '#7fd9a6' : '#e0b66a'
  const statusBg = isPago ? 'rgba(92,201,142,0.13)' : 'rgba(224,182,106,0.13)'
  const valorColor = isRec ? '#7fd9a6' : '#f0a0a0'
  const categoria = isRec ? 'Atendimento' : 'Despesa'

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.1fr 1.1fr 1fr', gap: 16, padding: '15px 22px', borderBottom: '1px solid #1b2c43', alignItems: 'center', cursor: 'pointer', background: hov ? '#1a2c44' : 'transparent', transition: 'background .15s ease' }}>
      {/* Descrição */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: iconColor, fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{isRec ? '+' : '–'}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.description}</div>
          {entry.patientName && (
            <div style={{ fontSize: 12, color: '#5f7896', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.patientName}</div>
          )}
        </div>
      </div>
      {/* Categoria */}
      <div style={{ fontSize: 13, color: '#9bb0c6' }}>{categoria}</div>
      {/* Vencimento */}
      <div style={{ fontSize: 13, color: '#9bb0c6', fontVariantNumeric: 'tabular-nums' }}>{formatDate(entry.competenceDate)}</div>
      {/* Status */}
      <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: statusColor, background: statusBg, padding: '4px 11px', borderRadius: 999 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          {isPago ? 'Pago' : 'Pendente'}
        </span>
      </div>
      {/* Valor */}
      <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 800, color: valorColor, fontVariantNumeric: 'tabular-nums' }}>
        {isRec ? '+ ' : '– '}{currency.format(entry.amount)}
      </div>
    </div>
  )
}
