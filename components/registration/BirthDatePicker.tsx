'use client'
import { useLocale, useTranslations } from 'next-intl'

/** Identical three-select interaction on desktop and mobile; no persisted date. */
export default function BirthDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations('onboardingRefinements'), locale = useLocale()
  const [year = '', month = '', day = ''] = value.split('-')
  const currentYear = new Date().getFullYear()
  const days = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31
  function change(index: number, next: string) {
    const parts = [year, month, day]; parts[index] = next
    if (parts[0] && parts[1] && parts[2]) parts[2] = String(Math.min(Number(parts[2]), new Date(Number(parts[0]), Number(parts[1]), 0).getDate())).padStart(2, '0')
    onChange(parts.join('-'))
  }
  const style = 'min-h-12 min-w-0 rounded-xl border border-white/15 bg-slate-950 px-3 text-base'
  return <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-2" data-testid="birth-date-picker">
    <select aria-label={t('year')} value={year} onChange={e => change(0, e.target.value)} className={style}><option value="">{t('year')}</option>{Array.from({ length: 121 }, (_, i) => currentYear-i).map(y => <option key={y} value={y}>{y}</option>)}</select>
    <select aria-label={t('month')} value={month} onChange={e => change(1, e.target.value)} className={style}><option value="">{t('month')}</option>{Array.from({ length: 12 }, (_, i) => i+1).map(m => <option key={m} value={String(m).padStart(2,'0')}>{new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000,m-1,1)))}</option>)}</select>
    <select aria-label={t('day')} value={day} onChange={e => change(2, e.target.value)} className={style}><option value="">{t('day')}</option>{Array.from({ length: days }, (_, i) => i+1).map(d => <option key={d} value={String(d).padStart(2,'0')}>{d}</option>)}</select>
  </div>
}
