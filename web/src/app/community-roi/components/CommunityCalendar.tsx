'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
  Handshake,
  ArrowLeft,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMonths,
  subMonths,
} from 'date-fns'
import ScheduleMeetingModal from './ScheduleMeetingModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Meeting {
  id: string
  member_a_id: string
  member_b_id: string
  member_a_name: string
  member_b_name: string
  member_a_company?: string
  member_b_company?: string
  meeting_date: string        // ISO date "YYYY-MM-DD"
  start_time: string          // "HH:MM"
  end_time: string            // "HH:MM"
  duration_mins: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  meeting_type: 'virtual' | 'in_person' | 'phone'
  location?: string
  agenda_notes?: string
  member_a_confirmed: boolean
  member_b_confirmed: boolean
}

interface CalendarSettings {
  is_enabled: boolean
  default_meeting_duration_mins: number
  booking_window_days: number
  min_notice_hours: number
  reminder_hours_before: number
  allow_same_day_booking: boolean
  working_hours_start: string
  working_hours_end: string
  timezone: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-400',   icon: AlertCircle  },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-200',      dot: 'bg-blue-500',    icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500',   icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500 border-slate-200',   dot: 'bg-slate-400',   icon: XCircle      },
  no_show:   { label: 'No Show',   color: 'bg-red-100 text-red-600 border-red-200',         dot: 'bg-red-400',     icon: XCircle      },
}

const TYPE_ICON = {
  virtual:   Video,
  in_person: MapPin,
  phone:     Phone,
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function avatarColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
    'bg-pink-500',  'bg-teal-500',  'bg-indigo-500','bg-rose-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CommunityCalendarProps {
  tenantId?: string
  onBack?: () => void
}

export default function CommunityCalendar({ tenantId, onBack }: CommunityCalendarProps) {
  const [currentMonth, setCurrentMonth]       = useState(new Date())
  const [selectedDay, setSelectedDay]         = useState<Date>(new Date())
  const [meetings, setMeetings]               = useState<Meeting[]>([])
  const [settings, setSettings]               = useState<CalendarSettings | null>(null)
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [togglingEnabled, setTogglingEnabled] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [updatingMeetingId, setUpdatingMeetingId] = useState<string | null>(null)

  // ── Fetch calendar settings ──────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true)
    try {
      const res = await fetch('/api/community-roi/calendar-settings')
      if (res.ok) setSettings(await res.json())
    } catch { /* ignore */ }
    finally { setLoadingSettings(false) }
  }, [])

  // ── Fetch meetings for current month ────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true)
    try {
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const to   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')
      const res  = await fetch(`/api/community-roi/meetings?from=${from}&to=${to}`)
      if (res.ok) {
        const data = await res.json()
        setMeetings(Array.isArray(data) ? data : (data.meetings ?? []))
      }
    } catch { /* ignore */ }
    finally { setLoadingMeetings(false) }
  }, [currentMonth])

  useEffect(() => { fetchSettings() }, [fetchSettings])
  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  // ── Toggle calendar enabled/disabled ────────────────────────────────────
  const toggleEnabled = async () => {
    if (!settings) return
    setTogglingEnabled(true)
    try {
      const res = await fetch('/api/community-roi/calendar-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !settings.is_enabled }),
      })
      if (res.ok) setSettings(prev => prev ? { ...prev, is_enabled: !prev.is_enabled } : prev)
    } catch { /* ignore */ }
    finally { setTogglingEnabled(false) }
  }

  // ── Update meeting status ────────────────────────────────────────────────
  const updateMeetingStatus = async (id: string, status: Meeting['status']) => {
    setUpdatingMeetingId(id)
    try {
      const res = await fetch(`/api/community-roi/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setMeetings(prev => prev.map(m => m.id === id ? { ...m, status } : m))
      }
    } catch { /* ignore */ }
    finally { setUpdatingMeetingId(null) }
  }

  // ── Calendar grid construction ───────────────────────────────────────────
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 1 }),
  })

  const meetingsOnDay = (day: Date) =>
    meetings.filter(m => isSameDay(parseISO(m.meeting_date), day))

  const selectedDayMeetings = meetings
    .filter(m => isSameDay(parseISO(m.meeting_date), selectedDay))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const upcomingMeetings = meetings
    .filter(m => {
      const d = parseISO(m.meeting_date)
      return d >= new Date() && m.status !== 'cancelled' && m.status !== 'no_show'
    })
    .sort((a, b) => {
      const da = parseISO(a.meeting_date).getTime()
      const db = parseISO(b.meeting_date).getTime()
      return da !== db ? da - db : a.start_time.localeCompare(b.start_time)
    })
    .slice(0, 10)

  const activeMeetingsThisMonth = meetings.filter(
    m => m.status !== 'cancelled' && m.status !== 'no_show'
  ).length
  const confirmedCount = meetings.filter(m => m.status === 'confirmed').length
  const pendingCount   = meetings.filter(m => m.status === 'pending').length

  // ── Day cell ─────────────────────────────────────────────────────────────
  const DayCell = ({ day }: { day: Date }) => {
    const dayMeetings  = meetingsOnDay(day)
    const isSelected   = isSameDay(day, selectedDay)
    const isCurrentDay = isToday(day)
    const inMonth      = isSameMonth(day, currentMonth)
    const statusCounts = dayMeetings.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return (
      <button
        onClick={() => setSelectedDay(day)}
        className={`
          relative min-h-[72px] p-2 rounded-xl text-left transition-all border
          ${isSelected
            ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100'
            : isCurrentDay
              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              : inMonth
                ? 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                : 'bg-slate-50/50 border-transparent'
          }
        `}
      >
        <span className={`
          text-sm font-semibold block mb-1
          ${isSelected ? 'text-white' : isCurrentDay ? 'text-blue-600' : inMonth ? 'text-slate-800' : 'text-slate-300'}
        `}>
          {format(day, 'd')}
          {isCurrentDay && !isSelected && (
            <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-blue-500">Today</span>
          )}
        </span>

        {/* Meeting dots */}
        {dayMeetings.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(statusCounts).slice(0, 3).map(([status]) => (
              <span
                key={status}
                className={`
                  w-2 h-2 rounded-full
                  ${isSelected ? 'bg-white/70' : STATUS_CONFIG[status as Meeting['status']]?.dot ?? 'bg-slate-300'}
                `}
              />
            ))}
            {dayMeetings.length > 3 && (
              <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                +{dayMeetings.length - 3}
              </span>
            )}
          </div>
        )}

        {dayMeetings.length > 0 && (
          <span className={`
            absolute top-2 right-2 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center
            ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}
          `}>
            {dayMeetings.length}
          </span>
        )}
      </button>
    )
  }

  // ── Meeting card ──────────────────────────────────────────────────────────
  const MeetingCard = ({ meeting, compact = false }: { meeting: Meeting; compact?: boolean }) => {
    const cfg     = STATUS_CONFIG[meeting.status]
    const TypeIcon = TYPE_ICON[meeting.meeting_type] ?? Video
    const isUpdating = updatingMeetingId === meeting.id

    return (
      <div className={`rounded-2xl border bg-white p-4 space-y-3 transition-all hover:shadow-md ${compact ? '' : ''}`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TypeIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-500 capitalize">{meeting.meeting_type.replace('_', ' ')}</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-500">
              {meeting.start_time} – {meeting.end_time}
            </span>
          </div>
          <Badge className={`text-[10px] font-semibold border shrink-0 ${cfg.color}`}>
            {cfg.label}
          </Badge>
        </div>

        {/* Members */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white ${avatarColor(meeting.member_a_name)}`}>
              {initials(meeting.member_a_name)}
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white ${avatarColor(meeting.member_b_name)}`}>
              {initials(meeting.member_b_name)}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {meeting.member_a_name} <span className="text-slate-400 font-normal">×</span> {meeting.member_b_name}
            </p>
            {(meeting.member_a_company || meeting.member_b_company) && (
              <p className="text-xs text-slate-400 truncate">
                {meeting.member_a_company} · {meeting.member_b_company}
              </p>
            )}
          </div>
        </div>

        {/* Confirmation badges */}
        {meeting.status === 'confirmed' && (
          <div className="flex gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meeting.member_a_confirmed ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
              {meeting.member_a_name.split(' ')[0]} {meeting.member_a_confirmed ? '✓' : '...'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meeting.member_b_confirmed ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
              {meeting.member_b_name.split(' ')[0]} {meeting.member_b_confirmed ? '✓' : '...'}
            </span>
          </div>
        )}

        {/* Agenda notes */}
        {meeting.agenda_notes && !compact && (
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 line-clamp-2">
            {meeting.agenda_notes}
          </p>
        )}

        {/* Actions */}
        {!compact && meeting.status === 'pending' && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 flex-1"
              disabled={isUpdating}
              onClick={() => updateMeetingStatus(meeting.id, 'confirmed')}
            >
              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5 text-slate-400 hover:text-red-500"
              disabled={isUpdating}
              onClick={() => updateMeetingStatus(meeting.id, 'cancelled')}
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </Button>
          </div>
        )}
        {!compact && meeting.status === 'confirmed' && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 flex-1"
              disabled={isUpdating}
              onClick={() => updateMeetingStatus(meeting.id, 'completed')}
            >
              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5 text-slate-400 hover:text-red-500"
              disabled={isUpdating}
              onClick={() => updateMeetingStatus(meeting.id, 'cancelled')}
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-slate-600 hover:text-slate-900 group md:hidden">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </Button>
          )}
          <div className="p-3 bg-blue-50 rounded-xl">
            <CalendarDays className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">1-2-1 Calendar</h2>
            <p className="text-sm text-slate-500">Schedule and manage member meetings · Conflict-aware booking</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats pills */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-full">
              {activeMeetingsThisMonth} this month
            </span>
            {confirmedCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded-full">
                {confirmedCount} confirmed
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 font-medium px-3 py-1.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>

          {/* Enable / Disable toggle */}
          <button
            onClick={toggleEnabled}
            disabled={loadingSettings || togglingEnabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${settings?.is_enabled
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }
            `}
            title={settings?.is_enabled ? 'Click to disable calendar' : 'Click to enable calendar'}
          >
            {togglingEnabled
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : settings?.is_enabled
                ? <ToggleRight className="w-5 h-5 text-green-600" />
                : <ToggleLeft  className="w-5 h-5 text-slate-400" />
            }
            {settings?.is_enabled ? 'Calendar On' : 'Calendar Off'}
          </button>

          <Button
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl h-9"
            onClick={() => setShowScheduleModal(true)}
            disabled={!settings?.is_enabled}
          >
            <Plus className="w-4 h-4" />
            Schedule 1-2-1
          </Button>
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-2 rounded-xl hidden md:flex text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* ── Calendar + Right Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

        {/* Left: Calendar Grid */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold rounded-lg"
                  onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mt-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide py-1">
                  {d}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {loadingMeetings ? (
              <div className="h-64 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading meetings...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => (
                  <DayCell key={i} day={day} />
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
              {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG['pending']][]).map(([key, cfg]) => (
                key !== 'no_show' && (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-[11px] text-slate-500 font-medium">{cfg.label}</span>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Day Detail + Upcoming */}
        <div className="space-y-4">

          {/* Selected Day Meetings */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE, MMM d')}
                </CardTitle>
                <Badge variant="secondary" className="text-xs font-mono">
                  {selectedDayMeetings.length} meetings
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {selectedDayMeetings.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">No meetings scheduled</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => setShowScheduleModal(true)}
                    disabled={!settings?.is_enabled}
                  >
                    <Plus className="w-3 h-3" /> Schedule one
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayMeetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Handshake className="w-4 h-4 text-amber-500" />
                Upcoming 1-2-1s
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400">No upcoming meetings</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {upcomingMeetings.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedDay(parseISO(m.meeting_date)) }}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        {/* Date badge */}
                        <div className={`
                          w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-white
                          ${isToday(parseISO(m.meeting_date)) ? 'bg-blue-600' : 'bg-slate-800'}
                        `}>
                          <span className="text-[10px] font-bold uppercase leading-none">
                            {format(parseISO(m.meeting_date), 'MMM')}
                          </span>
                          <span className="text-sm font-bold leading-none">
                            {format(parseISO(m.meeting_date), 'd')}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 truncate">
                            {m.member_a_name} × {m.member_b_name}
                          </p>
                          <p className="text-[11px] text-slate-400">{m.start_time} · {m.duration_mins}min</p>
                        </div>

                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CONFIG[m.status]?.dot}`} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings card */}
          {settings && (
            <Card className="rounded-2xl border-slate-100 bg-slate-50 shadow-none">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Calendar Settings
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
                  <span className="text-slate-400">Duration</span>
                  <span className="font-medium">{settings.default_meeting_duration_mins} min</span>
                  <span className="text-slate-400">Booking window</span>
                  <span className="font-medium">{settings.booking_window_days} days ahead</span>
                  <span className="text-slate-400">Min notice</span>
                  <span className="font-medium">{settings.min_notice_hours}h before</span>
                  <span className="text-slate-400">Working hours</span>
                  <span className="font-medium">{settings.working_hours_start} – {settings.working_hours_end}</span>
                  <span className="text-slate-400">Timezone</span>
                  <span className="font-medium">{settings.timezone}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <ScheduleMeetingModal
          onClose={() => setShowScheduleModal(false)}
          onSuccess={(newMeeting) => {
            setMeetings(prev => [...prev, newMeeting])
            setSelectedDay(parseISO(newMeeting.meeting_date))
            setShowScheduleModal(false)
          }}
          defaultDate={selectedDay}
          calendarSettings={settings}
        />
      )}
    </div>
  )
}
