'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  CalendarDays,
  Video,
  MapPin,
  Phone,
  FileText,
  ChevronDown,
} from 'lucide-react'
import { format } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string
  name: string
  company_name?: string
  designation?: string
}

interface CalendarSettings {
  is_enabled: boolean
  default_meeting_duration_mins: number
  booking_window_days: number
  min_notice_hours: number
  allow_same_day_booking: boolean
  working_hours_start: string
  working_hours_end: string
  timezone: string
}

interface ConflictError {
  type: 'conflict' | 'availability' | 'notice'
  message: string
  conflicting_member?: string
  conflicting_time?: string
}

interface ScheduleMeetingModalProps {
  onClose: () => void
  onSuccess: (meeting: any) => void
  defaultDate?: Date
  calendarSettings: CalendarSettings | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const MEETING_TYPES = [
  { value: 'virtual',   label: 'Virtual',   icon: Video  },
  { value: 'in_person', label: 'In Person', icon: MapPin },
  { value: 'phone',     label: 'Phone',     icon: Phone  },
]

const DURATIONS = [15, 30, 45, 60, 90]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleMeetingModal({
  onClose,
  onSuccess,
  defaultDate,
  calendarSettings,
}: ScheduleMeetingModalProps) {
  const [members, setMembers]           = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberAId, setMemberAId]       = useState('')
  const [memberBId, setMemberBId]       = useState('')
  const [memberASearch, setMemberASearch] = useState('')
  const [memberBSearch, setMemberBSearch] = useState('')
  const [showDropdownA, setShowDropdownA] = useState(false)
  const [showDropdownB, setShowDropdownB] = useState(false)
  const [meetingDate, setMeetingDate]   = useState(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime]       = useState('10:00')
  const [duration, setDuration]         = useState(calendarSettings?.default_meeting_duration_mins ?? 30)
  const [meetingType, setMeetingType]   = useState<'virtual' | 'in_person' | 'phone'>('virtual')
  const [location, setLocation]         = useState('')
  const [agendaNotes, setAgendaNotes]   = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [conflicts, setConflicts]       = useState<ConflictError[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // ── Load members ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingMembers(true)
      try {
        const res = await fetch('/api/community-roi/members')
        if (res.ok) {
          const data = await res.json()
          setMembers(Array.isArray(data) ? data : (data.members ?? []))
        }
      } catch { /* ignore */ }
      finally { setLoadingMembers(false) }
    }
    load()
  }, [])

  // ── Compute end time ───────────────────────────────────────────────────────
  const endTime = (() => {
    const [h, m] = startTime.split(':').map(Number)
    const total  = h * 60 + m + duration
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  })()

  // ── Conflict check ─────────────────────────────────────────────────────────
  const checkConflicts = async () => {
    if (!memberAId || !memberBId || !meetingDate || !startTime) return
    setCheckingConflicts(true)
    setConflicts([])
    try {
      const res = await fetch('/api/community-roi/meetings/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_a_id: memberAId,
          member_b_id: memberBId,
          meeting_date: meetingDate,
          start_time: startTime,
          end_time: endTime,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setConflicts(data.conflicts ?? [])
      }
    } catch { /* ignore */ }
    finally { setCheckingConflicts(false) }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (memberAId && memberBId && meetingDate && startTime) checkConflicts()
    }, 500)
    return () => clearTimeout(t)
  }, [memberAId, memberBId, meetingDate, startTime, duration])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!memberAId || !memberBId || !meetingDate || !startTime) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/community-roi/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_a_id:  memberAId,
          member_b_id:  memberBId,
          meeting_date: meetingDate,
          start_time:   startTime,
          end_time:     endTime,
          duration_mins: duration,
          meeting_type: meetingType,
          location:     location || null,
          agenda_notes: agendaNotes || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onSuccess(data.meeting ?? data)
      } else {
        const err = await res.json()
        if (err.conflicts) setConflicts(err.conflicts)
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false) }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const memberA = members.find(m => m.id === memberAId)
  const memberB = members.find(m => m.id === memberBId)
  const filteredA = members.filter(m =>
    m.id !== memberBId &&
    (m.name.toLowerCase().includes(memberASearch.toLowerCase()) ||
     (m.company_name || '').toLowerCase().includes(memberASearch.toLowerCase()))
  )
  const filteredB = members.filter(m =>
    m.id !== memberAId &&
    (m.name.toLowerCase().includes(memberBSearch.toLowerCase()) ||
     (m.company_name || '').toLowerCase().includes(memberBSearch.toLowerCase()))
  )

  const canSubmit = memberAId && memberBId && meetingDate && startTime && conflicts.length === 0 && !checkingConflicts

  // ── Member Selector ────────────────────────────────────────────────────────
  const MemberSelector = ({
    label, value, search, setSearch, setId, showDropdown, setShowDropdown, filtered,
  }: {
    label: string
    value: Member | undefined
    search: string
    setSearch: (v: string) => void
    setId: (v: string) => void
    showDropdown: boolean
    setShowDropdown: (v: boolean) => void
    filtered: Member[]
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {value ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              {initials(value.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{value.name}</p>
              {value.company_name && <p className="text-xs text-slate-500 truncate">{value.company_name}</p>}
            </div>
            <button onClick={() => { setId(''); setSearch('') }} className="text-slate-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              className="pl-9"
            />
            <Users className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        )}

        {showDropdown && !value && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {loadingMembers ? (
              <div className="p-3 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center text-sm text-slate-400">No members found</div>
            ) : (
              filtered.map(m => (
                <button
                  key={m.id}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => { setId(m.id); setSearch(''); setShowDropdown(false) }}
                >
                  <div className="w-7 h-7 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                    {m.company_name && <p className="text-xs text-slate-400 truncate">{m.company_name}</p>}
                  </div>
                  {m.designation && (
                    <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">{m.designation}</Badge>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Schedule 1-2-1</h2>
              <p className="text-xs text-slate-400">Conflicts are checked automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Member selectors */}
          <div
            className="grid grid-cols-1 gap-4"
            onClick={e => {
              if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
                setShowDropdownA(false)
                setShowDropdownB(false)
              }
            }}
          >
            <div data-dropdown>
              <MemberSelector
                label="Member A"
                value={memberA}
                search={memberASearch}
                setSearch={setMemberASearch}
                setId={setMemberAId}
                showDropdown={showDropdownA}
                setShowDropdown={setShowDropdownA}
                filtered={filteredA}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-semibold">×</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div data-dropdown>
              <MemberSelector
                label="Member B"
                value={memberB}
                search={memberBSearch}
                setSearch={setMemberBSearch}
                setId={setMemberBId}
                showDropdown={showDropdownB}
                setShowDropdown={setShowDropdownB}
                filtered={filteredB}
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  className="pl-9"
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
                <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Start Time</label>
              <div className="relative">
                <Input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="pl-9"
                />
                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Duration</label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${duration === d
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}
                  `}
                >
                  {d}min
                </button>
              ))}
            </div>
            {startTime && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {startTime} – {endTime}
              </p>
            )}
          </div>

          {/* Meeting type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Meeting Type</label>
            <div className="flex gap-2">
              {MEETING_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setMeetingType(value as any)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all
                    ${meetingType === value
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location (only for non-phone) */}
          {meetingType !== 'phone' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {meetingType === 'virtual' ? 'Meeting Link' : 'Venue / Location'}
              </label>
              <div className="relative">
                <Input
                  placeholder={meetingType === 'virtual' ? 'https://meet.google.com/...' : 'Café, office name, etc.'}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="pl-9"
                />
                {meetingType === 'virtual' ? (
                  <Video className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                ) : (
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
          )}

          {/* Agenda notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Agenda / Notes
              <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              placeholder="What topics will you discuss? Goals for this 1-2-1..."
              value={agendaNotes}
              onChange={e => setAgendaNotes(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Conflict status */}
          {(checkingConflicts || conflicts.length > 0) && (
            <div className={`rounded-xl p-4 border ${conflicts.length > 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
              {checkingConflicts ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Checking for conflicts...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected
                    </span>
                  </div>
                  {conflicts.map((c, i) => (
                    <p key={i} className="text-xs text-red-600 pl-6">{c.message}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clear state */}
          {memberAId && memberBId && !checkingConflicts && conflicts.length === 0 && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-700 font-medium">No conflicts — ready to schedule</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
            ) : (
              <><CalendarDays className="w-4 h-4" /> Schedule Meeting</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
