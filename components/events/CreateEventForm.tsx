'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { EventCategory, GalaxyEventSummary } from '@/types/event'

const CATEGORIES: EventCategory[] = ['MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER']
const HOURS = Array.from({ length: 24 }, (_, hour) => hour.toString().padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDateTime(dateValue: string, hour: string, minute: string) {
  if (!dateValue || !hour || !minute) return ''
  return `${dateValue}T${hour}:${minute}`
}

function getMonthStart(date: Date) {
  const monthStart = new Date(date)
  monthStart.setDate(1)
  monthStart.setHours(12, 0, 0, 0)
  return monthStart
}

function parseDateValue(value: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date
}

function formatDateLabel(value: string) {
  const date = parseDateValue(value)
  if (!date) return 'Choose a day'

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getCalendarDays(monthDate: Date) {
  const monthStart = getMonthStart(monthDate)
  const firstDayIndex = (monthStart.getDay() + 6) % 7
  const firstVisibleDay = new Date(monthStart)
  firstVisibleDay.setDate(monthStart.getDate() - firstDayIndex)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay)
    date.setDate(firstVisibleDay.getDate() + index)
    date.setHours(12, 0, 0, 0)
    return date
  })
}

function isSameDate(firstDate: Date, secondDate: Date) {
  return toDateValue(firstDate) === toDateValue(secondDate)
}

function isPastDate(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const candidate = new Date(date)
  candidate.setHours(0, 0, 0, 0)
  return candidate < today
}

interface CreateEventFormProps {
  galaxyId: string
  onCreated?: (event: GalaxyEventSummary) => void
}

export default function CreateEventForm({ galaxyId, onCreated }: CreateEventFormProps) {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<EventCategory>('MEETUP')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [dateValue, setDateValue] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(new Date()))
  const [hour, setHour] = useState('19')
  const [minute, setMinute] = useState('00')
  const [location, setLocation] = useState('')
  const [onlineUrl, setOnlineUrl] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth])
  const coverPreview = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : null, [coverFile])
  const dateTime = buildDateTime(dateValue, hour, minute)
  const selectedDate = parseDateValue(dateValue)

  function validateStepOne() {
    if (!title.trim() || title.trim().length > 80) return 'Title is required and must be 80 characters or fewer.'
    if (!description.trim() || description.trim().length > 500) return 'Description is required and must be 500 characters or fewer.'
    if (coverFile && coverFile.size > 3 * 1024 * 1024) return 'Cover image must be 3MB or smaller.'
    return ''
  }

  function validateStepTwo() {
    const date = new Date(dateTime)
    if (!dateTime || Number.isNaN(date.getTime()) || date <= new Date()) return 'Choose a future date and time.'
    if (maxAttendees && Number(maxAttendees) < 2) return 'Max attendees must be at least 2.'
    return ''
  }

  async function uploadCover() {
    if (!coverFile) return null
    const formData = new FormData()
    formData.append('file', coverFile)
    const res = await fetch('/api/events/cover-image', { method: 'POST', body: formData })
    const data = await res.json() as { url?: string; error?: string }
    if (!res.ok || !data.url) throw new Error(data.error ?? 'Cover image upload failed')
    return data.url
  }

  async function submit() {
    const validation = validateStepOne() || validateStepTwo()
    if (validation) {
      setError(validation)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const coverImage = await uploadCover()
      const res = await fetch(`/api/galaxies/${galaxyId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          date: new Date(dateTime).toISOString(),
          location: location.trim() || undefined,
          onlineUrl: category === 'ONLINE' ? onlineUrl.trim() || undefined : undefined,
          maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
          coverImage,
        }),
      })
      const data = await res.json() as { event?: GalaxyEventSummary; error?: string }
      if (!res.ok || !data.event) throw new Error(data.error ?? 'Event could not be proposed')
      setSuccess(true)
      onCreated?.(data.event)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Event could not be proposed')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
        <p className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>✦ Your event has been proposed!</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--ghost)' }}>The galaxy admin will review it shortly.</p>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={(submitEvent) => { submitEvent.preventDefault(); void submit() }}>
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <label className="grid gap-2 text-xs font-medium" style={{ color: 'var(--ghost)' }}>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 80))} maxLength={80} className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
          </label>
          <label className="grid gap-2 text-xs font-medium" style={{ color: 'var(--ghost)' }}>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 500))} maxLength={500} rows={5} className="resize-none rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
          </label>
          <label className="grid gap-2 text-xs font-medium" style={{ color: 'var(--ghost)' }}>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value as EventCategory)} className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(12,14,34,0.96)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-medium" style={{ color: 'var(--ghost)' }}>
            Cover image
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} className="text-xs" />
          </label>
          {coverPreview && <div className="h-28 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${coverPreview})`, border: '1px solid rgba(255,255,255,0.08)' }} />}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="grid gap-2 text-xs font-medium" style={{ color: 'var(--ghost)' }}>
            Date + time
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_86px_86px]">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCalendarOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: dateValue ? 'var(--foreground)' : 'var(--ghost)' }}
                  aria-expanded={calendarOpen}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <CalendarDays size={15} />
                    <span className="truncate">{formatDateLabel(dateValue)}</span>
                  </span>
                </button>
                {calendarOpen && (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-80 w-[min(320px,calc(100vw-48px))] rounded-2xl p-4 shadow-2xl" style={{ background: 'rgba(8,10,28,0.98)', border: '1px solid var(--border-mid)', boxShadow: '0 24px 70px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <button type="button" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ghost)' }} aria-label="Previous month">
                        <ChevronLeft size={15} />
                      </button>
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{getMonthLabel(visibleMonth)}</p>
                      <button type="button" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ghost)' }} aria-label="Next month">
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--ghost)' }}>
                      {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((date) => {
                        const disabled = isPastDate(date)
                        const outsideMonth = date.getMonth() !== visibleMonth.getMonth()
                        const selected = selectedDate ? isSameDate(date, selectedDate) : false

                        return (
                          <button
                            key={date.toISOString()}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setDateValue(toDateValue(date))
                              setVisibleMonth(getMonthStart(date))
                              setCalendarOpen(false)
                            }}
                            className="grid h-9 place-items-center rounded-xl text-xs font-semibold transition-all duration-150"
                            style={{
                              color: disabled ? 'var(--dim)' : outsideMonth ? 'var(--ghost)' : selected ? '#fff' : 'var(--foreground)',
                              background: selected ? 'linear-gradient(135deg, rgba(124,58,237,0.92), rgba(99,102,241,0.86))' : 'transparent',
                              border: selected ? '1px solid rgba(167,139,250,0.58)' : '1px solid transparent',
                              opacity: disabled ? 0.45 : 1,
                              cursor: disabled ? 'default' : 'pointer',
                            }}
                          >
                            {date.getDate()}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                      <button type="button" onClick={() => { setDateValue(''); setCalendarOpen(false) }} className="text-xs font-semibold" style={{ color: 'var(--ghost)' }}>Clear</button>
                      <button type="button" onClick={() => { const today = new Date(); setDateValue(toDateValue(today)); setVisibleMonth(getMonthStart(today)); setCalendarOpen(false) }} className="text-xs font-semibold" style={{ color: 'var(--star)' }}>Today</button>
                    </div>
                  </div>
                )}
              </div>
              <select value={hour} onChange={(event) => setHour(event.target.value)} className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(12,14,34,0.96)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} aria-label="Hour">
                {HOURS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={minute} onChange={(event) => setMinute(event.target.value)} className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(12,14,34,0.96)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} aria-label="Minute">
                {MINUTES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </label>
          <label className="grid gap-2 text-xs font-medium" style={{ color: 'var(--ghost)' }}>
            Where on Earth — or beyond?
            <input value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
          </label>
          {category === 'ONLINE' && (
            <label className="grid gap-2 text-xs font-medium" style={{ color: 'var(--ghost)' }}>
              Online URL
              <input type="url" value={onlineUrl} onChange={(event) => setOnlineUrl(event.target.value)} className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
            </label>
          )}
          <label className="grid gap-2 text-xs font-medium" style={{ color: 'var(--ghost)' }}>
            Max attendees
            <input type="number" min={2} value={maxAttendees} onChange={(event) => setMaxAttendees(event.target.value)} className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
          </label>
        </div>
      )}

      {error && <p className="text-xs" style={{ color: '#fca5a5' }}>{error}</p>}

      <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs" style={{ color: 'var(--ghost)' }}>{step} of 2</span>
        <div className="flex gap-2">
          {step === 2 && <button type="button" onClick={() => setStep(1)} className="rounded-xl px-4 py-2 text-xs font-semibold" style={{ color: 'var(--ghost)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>Back</button>}
          {step === 1 ? (
            <button
              type="button"
              onClick={() => {
                const validation = validateStepOne()
                if (validation) {
                  setError(validation)
                  return
                }
                setError('')
                setStep(2)
              }}
              className="rounded-xl px-4 py-2 text-xs font-semibold"
              style={{ color: '#fff', background: 'rgba(124,58,237,0.78)', border: '1px solid rgba(167,139,250,0.42)' }}
            >
              Next
            </button>
          ) : (
            <button type="submit" disabled={submitting} className="rounded-xl px-4 py-2 text-xs font-semibold" style={{ color: '#fff', background: 'rgba(124,58,237,0.78)', border: '1px solid rgba(167,139,250,0.42)', opacity: submitting ? 0.65 : 1 }}>{submitting ? 'Submitting...' : 'Submit'}</button>
          )}
        </div>
      </div>
    </form>
  )
}