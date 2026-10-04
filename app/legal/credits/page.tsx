import { getTranslations } from 'next-intl/server'

export default async function AssetCreditsPage() {
  const t = await getTranslations('common')
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-slate-300">
      <h1 className="mb-6 text-3xl text-white">{t('assetCredits')}</h1>
      <p>
        {t('planetTexturesBy')}{' '}
        <a
          className="underline"
          href="https://www.solarsystemscope.com/textures/"
        >
          Solar System Scope
        </a>
        .
      </p>
      <p className="mt-3">
        <a
          className="underline"
          href="https://creativecommons.org/licenses/by/4.0/"
        >
          Creative Commons Attribution 4.0 International (CC BY 4.0)
        </a>
      </p>
      <p className="mt-3">{t('textureAdaptations')}</p>
    </main>
  )
}
