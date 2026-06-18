import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { DateSelectArg, DatesSetArg, EventClickArg } from '@fullcalendar/core'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppointmentFormDialog } from './AppointmentFormDialog'
import { useAppointments } from './hooks'
import { APPOINTMENT_STATUS_COLORS, type Appointment } from './types'

export function AgendaPage() {
  const [range, setRange] = useState<{ start: string; end: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [preset, setPreset] = useState<{ start: string; end: string } | null>(null)

  const { data: appointments } = useAppointments(range)

  const events = useMemo(
    () =>
      (appointments ?? []).map((appointment) => ({
        id: String(appointment.id),
        title: appointment.patientName,
        start: appointment.startTime,
        end: appointment.endTime,
        backgroundColor: APPOINTMENT_STATUS_COLORS[appointment.status],
        borderColor: APPOINTMENT_STATUS_COLORS[appointment.status],
      })),
    [appointments],
  )

  function handleSelect(arg: DateSelectArg) {
    setEditing(null)
    setPreset({ start: arg.startStr, end: arg.endStr })
    setDialogOpen(true)
  }

  function handleEventClick(arg: EventClickArg) {
    const found = appointments?.find((a) => String(a.id) === arg.event.id) ?? null
    if (found) {
      setEditing(found)
      setPreset(null)
      setDialogOpen(true)
    }
  }

  function handleDatesSet(arg: DatesSetArg) {
    setRange({ start: arg.startStr, end: arg.endStr })
  }

  function openCreate() {
    setEditing(null)
    setPreset(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Sessões por mês, semana e dia</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nova sessão
        </Button>
      </div>

      <div className="rounded-md border bg-background p-3">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          locale={ptBrLocale}
          selectable
          selectMirror
          nowIndicator
          events={events}
          select={handleSelect}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          height="auto"
        />
      </div>

      <AppointmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editing}
        preset={preset}
      />
    </div>
  )
}
