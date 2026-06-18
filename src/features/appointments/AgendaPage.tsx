import { useMemo, useState } from 'react'
import { useAppointments } from './hooks'
import { AppointmentFormDialog } from './AppointmentFormDialog'
import { isoToLocalInput } from '@/lib/datetime'
import type { Appointment, AppointmentStatus } from './types'

// ─── helpers ───────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
const HOUR_PX = 56
const START_HOUR = 8
const END_HOUR = 20
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function mondayOf(d: Date): Date {
  const x = new Date(d)
  const off = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - off)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isoToDateKey(iso: string): string {
  return isoToLocalInput(iso).slice(0, 10)
}

export function isoToHHMM(iso: string): string {
  return isoToLocalInput(iso).slice(11, 16)
}

export const STATUS_STYLE: Record<AppointmentStatus, { accent: string; bg: string; text: string; subText: string; dot: string; label: string }> = {
  SCHEDULED:              { accent: '#7fb0d8', bg: 'rgba(127,176,216,0.18)', text: '#dbe9f5', subText: 'rgba(219,233,245,0.7)',  dot: '#7fb0d8', label: 'Agendada'   },
  CONFIRMED:              { accent: '#7fcfa0', bg: 'rgba(127,207,160,0.16)', text: '#d6f0e0', subText: 'rgba(214,240,224,0.7)',  dot: '#7fcfa0', label: 'Confirmada' },
  DONE:                   { accent: '#8aa3bf', bg: 'rgba(138,163,191,0.14)', text: '#cdd9e6', subText: 'rgba(205,217,230,0.65)', dot: '#8aa3bf', label: 'Realizada'  },
  CANCELED_BY_PATIENT:    { accent: '#e89090', bg: 'rgba(232,144,144,0.13)', text: '#f2d4d4', subText: 'rgba(242,212,212,0.65)', dot: '#e89090', label: 'Cancelada'  },
  CANCELED_BY_PROFESSIONAL: { accent: '#e89090', bg: 'rgba(232,144,144,0.13)', text: '#f2d4d4', subText: 'rgba(242,212,212,0.65)', dot: '#e89090', label: 'Cancelada' },
}

export interface DrawerPreset {
  dateKey: string
  startHour: number
}

// ─── AgendaPage ─────────────────────────────────────────────────────────────

export function AgendaPage() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()))
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)
  const [drawerPreset, setDrawerPreset] = useState<DrawerPreset | null>(null)

  const todayKey = useMemo(() => keyOf(new Date()), [])

  const range = useMemo(() => {
    if (viewMode === 'week') {
      return { start: weekStart.toISOString(), end: addDays(weekStart, 7).toISOString() }
    }
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
    const last = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0)
    const gridStart = mondayOf(first)
    const gridEnd = addDays(mondayOf(last), 7)
    return { start: gridStart.toISOString(), end: gridEnd.toISOString() }
  }, [viewMode, weekStart, monthAnchor])

  const { data: appointments = [] } = useAppointments(range)

  const rangeLabel = useMemo(() => {
    if (viewMode === 'week') {
      const last = addDays(weekStart, 6)
      return `${weekStart.getDate()}–${last.getDate()} ${MONTHS_SHORT[last.getMonth()]} · ${last.getFullYear()}`
    }
    return `${MONTHS_FULL[monthAnchor.getMonth()]} · ${monthAnchor.getFullYear()}`
  }, [viewMode, weekStart, monthAnchor])

  function openCreate(preset?: DrawerPreset) {
    setEditingAppt(null)
    setDrawerPreset(preset ?? null)
    setDrawerOpen(true)
  }

  function openEdit(appt: Appointment) {
    setEditingAppt(appt)
    setDrawerPreset(null)
    setDrawerOpen(true)
  }

  function goPrev() {
    if (viewMode === 'week') setWeekStart(prev => addDays(prev, -7))
    else setMonthAnchor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function goNext() {
    if (viewMode === 'week') setWeekStart(prev => addDays(prev, 7))
    else setMonthAnchor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  function goToday() {
    setWeekStart(mondayOf(new Date()))
    const n = new Date()
    setMonthAnchor(new Date(n.getFullYear(), n.getMonth(), 1))
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', padding: '26px 32px 32px', boxSizing: 'border-box', overflow: 'hidden', fontFamily: "'Manrope', sans-serif", color: '#eef4fa' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Agenda</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NavBtn onClick={goPrev}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </NavBtn>
            <NavBtn onClick={goToday} wide>Hoje</NavBtn>
            <NavBtn onClick={goNext}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </NavBtn>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#cfe0ef' }}>{rangeLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#0f1726', border: '1px solid #22354e', borderRadius: 10, padding: 3 }}>
            <ViewTab active={viewMode === 'week'} onClick={() => setViewMode('week')}>Semana</ViewTab>
            <ViewTab active={viewMode === 'month'} onClick={() => setViewMode('month')}>Mês</ViewTab>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#8aa3bf' }}>
            {[['#7fb0d8', 'Agendada'], ['#7fcfa0', 'Confirmada'], ['#8aa3bf', 'Realizada']].map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>
          {/* Create button */}
          <Btn onClick={() => openCreate()}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16243a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#16243a' }}>Agendar Sessão</span>
          </Btn>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {viewMode === 'week'
          ? <WeekView weekStart={weekStart} appointments={appointments} todayKey={todayKey} onSlot={(dk, h) => openCreate({ dateKey: dk, startHour: h })} onEdit={openEdit} />
          : <MonthView monthAnchor={monthAnchor} appointments={appointments} todayKey={todayKey} onDay={(dk) => openCreate({ dateKey: dk, startHour: START_HOUR })} onEdit={openEdit} />
        }
      </div>

      <AppointmentFormDialog
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        appointment={editingAppt}
        preset={drawerPreset}
        appointments={appointments}
      />
    </div>
  )
}

// ─── Nav buttons ────────────────────────────────────────────────────────────

function NavBtn({ onClick, children, wide }: { onClick: () => void; children: React.ReactNode; wide?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: wide ? 'auto' : 34, height: 34, padding: wide ? '0 14px' : 0, borderRadius: 9, border: '1px solid #22354e', background: hov ? '#1c2c42' : '#16243a', color: hov ? '#eef4fa' : '#9bb0c6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, transition: 'background .15s ease, color .15s ease' }}>
      {children}
    </button>
  )
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ height: 30, padding: '0 15px', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 700, background: active ? '#7fb0d8' : 'transparent', color: active ? '#16243a' : '#8aa3bf', transition: 'background .15s ease, color .15s ease' }}>
      {children}
    </button>
  )
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: hov ? '#9ec9ec' : '#7fb0d8', border: 'none', borderRadius: 10, padding: '11px 18px', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", boxShadow: hov ? '0 8px 22px rgba(127,176,216,0.34)' : '0 6px 16px rgba(127,176,216,0.22)', transition: 'background .15s ease, box-shadow .15s ease' }}>
      {children}
    </button>
  )
}

// ─── Week view ───────────────────────────────────────────────────────────────

function WeekView({ weekStart, appointments, todayKey, onSlot, onEdit }: {
  weekStart: Date; appointments: Appointment[]; todayKey: string
  onSlot: (dateKey: string, hour: number) => void
  onEdit: (a: Appointment) => void
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    const key = keyOf(d)
    const isToday = key === todayKey
    const sessions = appointments
      .filter(a => isoToDateKey(a.startTime) === key)
      .map(a => {
        const sh = isoToHHMM(a.startTime)
        const eh = isoToHHMM(a.endTime)
        const sm = parseInt(sh) * 60 + parseInt(sh.slice(3))
        const em = parseInt(eh) * 60 + parseInt(eh.slice(3))
        const topPx = Math.max(0, (sm - START_HOUR * 60) / 60 * HOUR_PX)
        const heightPx = Math.max((em - sm) / 60 * HOUR_PX, 24)
        return { ...a, ...STATUS_STYLE[a.status], topPx, heightPx, startHHMM: sh, endHHMM: eh }
      })
    return { d, key, isToday, sessions, dayName: DAY_NAMES[i] }
  }), [weekStart, appointments, todayKey])

  return (
    <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Day headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid #22354e', flexShrink: 0, paddingRight: 10 }}>
        <div style={{ width: 62, flexShrink: 0 }} />
        {days.map(({ d, key, isToday, dayName }) => (
          <div key={key} style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '12px 4px', borderLeft: '1px solid #1b2c43' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: isToday ? '#7fb0d8' : '#5f7896' }}>{dayName}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 5, width: 30, height: 30, borderRadius: '50%', fontSize: 15, fontWeight: 800, color: isToday ? '#0f1726' : '#eef4fa', background: isToday ? '#7fb0d8' : 'transparent' }}>{d.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div className="elo-cal" style={{ display: 'flex', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Hours gutter */}
        <div style={{ width: 62, flexShrink: 0 }}>
          {HOURS.map(h => (
            <div key={h} style={{ height: HOUR_PX, position: 'relative', borderBottom: '1px solid #1a2e46' }}>
              <span style={{ position: 'absolute', top: -8, right: 9, fontSize: 11, color: '#5f7896', fontVariantNumeric: 'tabular-nums' }}>{pad(h)}:00</span>
            </div>
          ))}
        </div>
        {/* Day columns */}
        {days.map(({ key, isToday, sessions }) => (
          <div key={key} style={{ flex: 1, minWidth: 100, position: 'relative', borderLeft: '1px solid #1b2c43', background: isToday ? 'rgba(127,176,216,0.04)' : 'transparent' }}>
            {HOURS.map(h => <HourCell key={h} onClick={() => onSlot(key, h)} />)}
            {sessions.map(s => <SessionBlock key={s.id} session={s} onClick={() => onEdit(s)} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

function HourCell({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ height: HOUR_PX, borderBottom: '1px solid #1b2c43', cursor: 'pointer', background: hov ? 'rgba(127,176,216,0.08)' : 'transparent', transition: 'background .15s ease' }} />
  )
}

function SessionBlock({ session, onClick }: {
  session: Appointment & { topPx: number; heightPx: number; accent: string; bg: string; text: string; subText: string; startHHMM: string; endHHMM: string }
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={e => { e.stopPropagation(); onClick() }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: 'absolute', left: 4, right: 4, top: session.topPx, height: session.heightPx, background: session.bg, borderLeft: `3px solid ${session.accent}`, borderRadius: 7, padding: '5px 7px', cursor: 'pointer', overflow: 'hidden', filter: hov ? 'brightness(1.12)' : 'none', transition: 'filter .15s ease', zIndex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: session.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.patientName}</div>
      {session.heightPx > 30 && (
        <div style={{ fontSize: 10.5, color: session.subText, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{session.startHHMM}–{session.endHHMM}</div>
      )}
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({ monthAnchor, appointments, todayKey, onDay, onEdit }: {
  monthAnchor: Date; appointments: Appointment[]; todayKey: string
  onDay: (dateKey: string) => void
  onEdit: (a: Appointment) => void
}) {
  const cells = useMemo(() => {
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
    const last = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0)
    const gridStart = mondayOf(first)
    const totalSpan = Math.round((mondayOf(last).getTime() - gridStart.getTime()) / 86400000) + 7
    const rowCount = Math.max(5, Math.ceil(totalSpan / 7))
    return Array.from({ length: rowCount * 7 }, (_, i) => {
      const d = addDays(gridStart, i)
      const key = keyOf(d)
      const inMonth = d.getMonth() === monthAnchor.getMonth()
      const isToday = key === todayKey
      const daySessions = appointments
        .filter(a => isoToDateKey(a.startTime) === key)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
      const chips = daySessions.slice(0, 3).map(a => ({
        ...a, ...STATUS_STYLE[a.status], startHHMM: isoToHHMM(a.startTime),
      }))
      return { d, key, inMonth, isToday, chips, moreCount: Math.max(0, daySessions.length - 3) }
    })
  }, [monthAnchor, appointments, todayKey])

  return (
    <div style={{ background: '#16243a', border: '1px solid #22354e', borderRadius: 16, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #22354e', flexShrink: 0 }}>
        {DAY_NAMES.map(n => (
          <div key={n} style={{ textAlign: 'center', padding: '11px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#5f7896', borderLeft: '1px solid #1b2c43' }}>{n}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="elo-cal" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(96px, 1fr)' }}>
        {cells.map(({ d, key, inMonth, isToday, chips, moreCount }) => (
          <MonthCell key={key} d={d} isToday={isToday} inMonth={inMonth} chips={chips} moreCount={moreCount} onDay={() => onDay(key)} onChip={(a) => onEdit(a)} />
        ))}
      </div>
    </div>
  )
}

function MonthCell({ d, isToday, inMonth, chips, moreCount, onDay, onChip }: {
  d: Date; isToday: boolean; inMonth: boolean
  chips: Array<Appointment & { accent: string; bg: string; text: string; subText: string; startHHMM: string }>
  moreCount: number; onDay: () => void; onChip: (a: Appointment) => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onDay} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderLeft: '1px solid #1b2c43', borderTop: '1px solid #1b2c43', padding: '6px 7px', cursor: 'pointer', background: inMonth ? (isToday ? 'rgba(127,176,216,0.05)' : hov ? 'rgba(127,176,216,0.04)' : 'transparent') : 'rgba(8,13,22,0.35)', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, overflow: 'hidden', transition: 'background .15s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', fontSize: 12.5, fontWeight: 700, color: isToday ? '#0f1726' : (inMonth ? '#eef4fa' : '#46586f'), background: isToday ? '#7fb0d8' : 'transparent' }}>{d.getDate()}</span>
      </div>
      {chips.map(chip => (
        <MonthChip key={chip.id} chip={chip} onClick={e => { e.stopPropagation(); onChip(chip) }} />
      ))}
      {moreCount > 0 && <div style={{ fontSize: 10.5, fontWeight: 700, color: '#7fb0d8', paddingLeft: 2 }}>+{moreCount} mais</div>}
    </div>
  )
}

function MonthChip({ chip, onClick }: {
  chip: { patientName: string; accent: string; bg: string; text: string; subText: string; startHHMM: string }
  onClick: (e: React.MouseEvent) => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 5, background: chip.bg, borderLeft: `2.5px solid ${chip.accent}`, borderRadius: 5, padding: '2px 6px', cursor: 'pointer', minWidth: 0, filter: hov ? 'brightness(1.14)' : 'none', transition: 'filter .15s ease' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: chip.subText, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{chip.startHHMM}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: chip.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chip.patientName}</span>
    </div>
  )
}
