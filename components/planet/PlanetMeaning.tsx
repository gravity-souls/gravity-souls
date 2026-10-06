'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown, Sparkles } from 'lucide-react'
import { planetClimateKey } from '@/lib/planet-meaning'
import { lifestyleLabel, commStyleLabel, themeLabel, themeDescription } from '@/lib/planet-labels'
import type { PlanetProfile } from '@/types/planet'
import type { PlanetDraft } from '@/types/creation'

/** Explains the current choices, never presents them as a personality diagnosis. */
export default function PlanetMeaning({ planet, draft, expanded = false }: { planet: PlanetProfile; draft?: PlanetDraft; expanded?: boolean }) {
  const t = useTranslations('planetMeaning'), choices = useTranslations('creationSteps')
  const climate = draft ? draft.climateKey : planetClimateKey(planet)
  const lifestyle = draft ? draft.lifestyle : planet.lifestyle
  const communication = draft ? draft.communicationStyle : planet.communicationStyle
  const themes = (draft ? draft.selectedThemes : planet.coreThemes).filter(theme => theme !== 'inner drift')
  const known = (path: string) => choices.has(path) ? choices(path) : ''
  return <details open={expanded || undefined} className="w-full min-w-0 rounded-2xl border border-violet-300/20 bg-violet-300/5 text-left" data-testid="planet-meaning">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-violet-100 [&::-webkit-details-marker]:hidden"><Sparkles size={16} aria-hidden="true" /><span className="flex-1">{t('title')}</span><ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="space-y-5 border-t border-violet-300/10 px-4 py-5 text-sm leading-relaxed">
      {climate && lifestyle && communication && themes.length > 0 && <p className="text-base text-violet-100">{t('summary', { climate: known(`climateOptions.${climate}.label`), lifestyle: lifestyleLabel(choices,lifestyle), communication: commStyleLabel(choices,communication), themes: themes.map(theme => themeLabel(choices,theme)).join(t('separator')) })}</p>}
      <p className="text-slate-300">{t('intro')}</p>
      <section><h3 className="font-semibold text-violet-100">{t('nameTitle')}</h3><p className="mt-1 text-slate-300">{t('nameExplanation')}</p></section>
      {climate && <section><h3 className="font-semibold text-violet-100">{t('climateTitle')}: {known(`climateOptions.${climate}.label`)}</h3><p className="mt-1 text-slate-300">{known(`climateOptions.${climate}.description`)}</p></section>}
      {lifestyle && <section><h3 className="font-semibold text-violet-100">{t('habitatTitle')}: {lifestyleLabel(choices,lifestyle)}</h3><p className="mt-1 text-slate-300">{known(`lifestyleOptions.${lifestyle}.description`)}</p></section>}
      {communication && <section><h3 className="font-semibold text-violet-100">{t('communicationTitle')}: {commStyleLabel(choices,communication)}</h3><p className="mt-1 text-slate-300">{known(`commStyleOptions.${communication}.description`)}</p></section>}
      {themes.length > 0 && <section><h3 className="font-semibold text-violet-100">{t('themesTitle')}</h3><ul className="mt-2 space-y-2">{themes.map(theme => <li key={theme}><strong>{themeLabel(choices,theme)}</strong> · {themeDescription(choices,theme)}</li>)}</ul></section>}
      {(!draft || communication) && <section><h3 className="font-semibold text-violet-100">{t('axesTitle')}</h3><p className="mt-1 text-slate-300">{choices('abstract')}: {planet.cognitiveAxes.abstract}/100 · {choices('introspective')}: {planet.cognitiveAxes.introspective}/100</p><p className="mt-1 text-slate-300">{t('axesExplanation')}</p></section>}
      <section><h3 className="font-semibold text-violet-100">{t('appearanceTitle')}</h3><p className="mt-1 text-slate-300">{t('appearanceExplanation')}</p></section>
      <p className="text-xs text-slate-400">{t('editHint')}</p>
    </div>
  </details>
}
