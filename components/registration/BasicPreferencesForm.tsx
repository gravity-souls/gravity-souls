'use client'

import { requestSocialRefresh } from '@/lib/social-refresh'
import PublicTagPicker from '@/components/registration/PublicTagPicker'
import BirthDatePicker from '@/components/registration/BirthDatePicker'
import RegionSearch from '@/components/registration/RegionSearch'
import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { BASIC_OPTIONS, EMPTY_BASICS, isAdultBirthDate, type BasicPreferences } from '@/lib/registration-basics'
import OnboardingShell from '@/components/onboarding/OnboardingShell'

type Props = { initial?: BasicPreferences; adultAlreadyConfirmed?: boolean; editing?: boolean; onSaved: (basics: BasicPreferences) => void }
const steps = ['adult', 'gender', 'languages', 'region', 'interests', 'connectionGoals', 'peoplePreferences', 'gatheringPreferences'] as const
export default function BasicPreferencesForm({ initial = EMPTY_BASICS, adultAlreadyConfirmed = false, editing = false, onSaved }: Props) {
  const t = useTranslations('registrationBasics')
  const [values, setValues] = useState<BasicPreferences>(initial)
  const [step, setStep] = useState(adultAlreadyConfirmed ? 1 : 0)
  // The date stays in component memory only; never saved in browser storage.
  const [birthDate, setBirthDate] = useState('')
  const [adultConfirmed, setAdultConfirmed] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const field = steps[step]
  const options = field !== 'adult' && field !== 'region' ? BASIC_OPTIONS[field] : []

  function advance(skip = false) {
    if (field === 'adult' && ((birthDate && !isAdultBirthDate(birthDate)) || (!birthDate && !adultConfirmed))) { setError(t('adultError')); return }
    if (skip && field !== 'adult') setValues(v => ({ ...v, [field]: field === 'gender' ? 'undisclosed' : field === 'region' ? '' : [] }))
    setError(''); setSearch(''); setStep(v => v + 1)
  }
  async function save(skip = false) {
    setSaving(true); setError('')
    const final = skip ? { ...values, gatheringPreferences: [] } : values
    try {
      const res = await fetch('/api/registration', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...final, ...(birthDate ? { birthDate } : { adultConfirmed }) }) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(t(data.error === 'ADULT_REQUIRED' ? 'adultError' : 'saveError'))
        if (data.error === 'ADULT_REQUIRED') setStep(0)
        return
      }
      setBirthDate('')
      requestSocialRefresh()
      onSaved(final)
    } catch { setError(t('saveError')) } finally { setSaving(false) }
  }
  const inputClass = 'w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-base'
  return <OnboardingShell><section className="flex flex-col gap-6 pb-12" aria-labelledby="basics-title" data-testid="registration-basics">
    <div className="flex items-center justify-between gap-4">
      <button type="button" disabled={saving || step <= (adultAlreadyConfirmed ? 1 : 0)} onClick={() => { setStep(v => v - 1); setError(''); setSearch('') }} className="min-h-11 px-3 disabled:opacity-30">{t('back')}</button>
      <span className="text-xs tabular-nums">{step + 1} / {steps.length}</span>
      {field !== 'adult' && <button type="button" disabled={saving} onClick={() => step === 7 ? void save(true) : advance(true)} className="min-h-11 px-3">{t('skip')}</button>}
    </div>
    <progress className="w-full accent-violet-400" value={step + 1} max={steps.length} aria-label={t('progress')} />
    <p className="text-xs uppercase tracking-widest text-violet-300">{t(editing ? 'editTitle' : 'intro')}</p>
    <h1 id="basics-title" className="text-3xl font-semibold leading-tight">{t(`titles.${field}`)}</h1>
    <p className="text-sm leading-relaxed opacity-70">{t(field === 'adult' ? 'adultPrivacy' : 'optionalPrivacy')}</p>
    {field === 'adult' && <div className="flex flex-col gap-5">
      <fieldset className="grid gap-2"><legend className="mb-2">{t('birthday')}</legend><BirthDatePicker value={birthDate} onChange={date => { setBirthDate(date); setAdultConfirmed(false) }} /></fieldset>
      <label className="flex items-start gap-3"><input type="checkbox" checked={adultConfirmed} onChange={e => { setAdultConfirmed(e.target.checked); if (e.target.checked) setBirthDate('') }} className="mt-1 h-5 w-5" />{t('adultDeclaration')}</label>
    </div>}
    {field === 'region' && <RegionSearch label={t('regionLabel')} value={values.region} onChange={region => setValues(v => ({ ...v, region }))} />}
    {field === 'interests' && <input type="search" aria-label={t('search')} placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className={inputClass} />}
    <div className="flex flex-wrap gap-3">{options.filter(o => t(`options.${o}`).toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(option => {
      const selected = field === 'gender' ? values.gender === option : field !== 'adult' && field !== 'region' && values[field].includes(option as never)
      return <button key={option} type="button" aria-pressed={!!selected} disabled={saving} onClick={() => {
        if (field === 'adult' || field === 'region') return
        setValues(v => {
          if (field === 'gender') return { ...v, gender: option as BasicPreferences['gender'] }
          const current = v[field] as string[]
          const next = current.includes(option) ? current.filter(o => o !== option) : option === 'noPreference' ? ['noPreference'] : [...current.filter(o => o !== 'noPreference'), option]
          return { ...v, [field]: next }
        })
      }} className={`inline-flex min-h-12 items-center gap-3 rounded-2xl border px-5 py-3 text-left transition ${selected ? 'border-violet-300 bg-gradient-to-br from-violet-400/25 to-cyan-400/10 shadow-[0_0_16px_#a78bfa18]' : 'border-white/15 bg-white/5 hover:border-violet-300/50'}`}>{selected ? <Check size={16} aria-hidden="true" className="text-violet-200" /> : <Plus size={16} aria-hidden="true" className="opacity-40" />}{t(`options.${option}`)}</button>
    })}</div>
    {step === 7 && <PublicTagPicker value={values} onChange={tokens => setValues(v => ({ ...v, publicTags: tokens }))} />}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button type="button" disabled={saving || (field === 'adult' && !birthDate && !adultConfirmed)} onClick={() => step === 7 ? void save() : advance()} className="mt-4 min-h-12 rounded-2xl bg-violet-400 px-6 py-4 font-semibold text-slate-950 disabled:opacity-40">{saving ? t('saving') : step === 7 ? t(editing ? 'save' : 'startCalibration') : t('continue')}</button>
    <p className="text-xs opacity-50">{t('editHint')}</p>
  </section></OnboardingShell>
}
