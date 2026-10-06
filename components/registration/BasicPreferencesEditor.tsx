'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Plus } from 'lucide-react'
import PublicTagPicker, { type EditableBasicField } from './PublicTagPicker'
import RegionSearch from './RegionSearch'
import BirthDatePicker from './BirthDatePicker'
import { BASIC_OPTIONS, isAdultBirthDate, type BasicPreferences } from '@/lib/registration-basics'
import { normalizedPublicTags } from '@/lib/public-planet-tags'
import { requestSocialRefresh } from '@/lib/social-refresh'

export default function BasicPreferencesEditor({ initial, confirmed, onSaved }: { initial: BasicPreferences; confirmed: boolean; onSaved: (values: BasicPreferences) => void }) {
  const t = useTranslations('registrationBasics'), copy = useTranslations('onboardingRefinements')
  const [values, setValues] = useState(initial), [field, setField] = useState<EditableBasicField | null>(null)
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false), [adult, setAdult] = useState(false)
  const [search, setSearch] = useState('')
  function update(next: BasicPreferences) {
    setValues({ ...next, publicTags: normalizedPublicTags(next) }); setSaved(false)
  }
  async function save() {
    if (typeof values.birthDate === 'string' && !isAdultBirthDate(values.birthDate)) { setError(t('birthDateError')); return }
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/registration', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, ...(!confirmed ? { adultConfirmed: adult } : {}) }) })
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(t(data.error === 'ADULT_REQUIRED' ? 'adultError' : 'saveError')); return }
      requestSocialRefresh(); onSaved(values); setSaved(true); setField(null)
    } catch { setError(t('saveError')) } finally { setSaving(false) }
  }
  const editor = field && <div className="mb-4 space-y-3 rounded-xl bg-white/5 p-3" data-testid={`edit-${field}`}>
    {field === 'birthDate' ? <fieldset className="space-y-3">
      <legend>{t('birthday')}</legend>
      <p className="text-sm text-slate-400">{t('birthDatePrivacy')}</p>
      <BirthDatePicker value={values.birthDate ?? ''} onChange={birthDate => update({ ...values, birthDate })} />
      <button type="button" onClick={() => update({ ...values, birthDate: null })} className="min-h-11 text-sm text-violet-200 underline">{t('clearBirthDate')}</button>
    </fieldset> : field === 'region' ? <RegionSearch label={t('regionLabel')} value={values.region} onChange={region => update({ ...values, region })} /> : <>
      {field === 'interests' && <input type="search" aria-label={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3" />}
      <div className="flex flex-wrap gap-2">{BASIC_OPTIONS[field].filter(option => t(`options.${option}`).toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(option => {
        const selected = field === 'gender' ? values.gender === option : values[field].includes(option as never)
        return <button key={option} type="button" aria-pressed={selected} disabled={saving} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${selected ? 'border-violet-300 bg-violet-400/20' : 'border-white/15'}`} onClick={() => {
          if (field === 'gender') update({ ...values, gender: option as BasicPreferences['gender'] })
          else { const current = values[field] as string[]; update({ ...values, [field]: current.includes(option) ? current.filter(v => v !== option) : option === 'noPreference' ? ['noPreference'] : [...current.filter(v => v !== 'noPreference'), option] }) }
        }}>{selected ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}{t(`options.${option}`)}</button>
      })}</div>
    </>}
    <button type="button" onClick={() => setField(null)} className="min-h-11 text-xs text-violet-200">{copy('doneEditing')}</button>
  </div>
  return <section className="mx-auto max-w-3xl px-4 pb-20 pt-6" data-testid="basics-editor">
    <h1 className="text-2xl font-semibold">{t('editTitle')}</h1><p className="mt-3 text-sm text-slate-400">{copy('directEditHint')}</p>
    {!confirmed && <label className="mt-4 flex items-center gap-3"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} />{t('adultDeclaration')}</label>}
    <fieldset disabled={saving} className="min-w-0"><PublicTagPicker value={values} onChange={publicTags => update({ ...values, publicTags })} onEdit={next => { setField(field === next ? null : next); setSearch('') }} activeField={field} editor={editor} /></fieldset>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}{saved && <p role="status" className="mt-4 text-sm text-emerald-300">{t('saved')}</p>}
    <button type="button" disabled={saving || (!confirmed && !adult && !isAdultBirthDate(values.birthDate))} onClick={() => void save()} className="mt-5 min-h-12 w-full rounded-2xl bg-violet-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-40">{t(saving ? 'saving' : 'save')}</button>
  </section>
}
