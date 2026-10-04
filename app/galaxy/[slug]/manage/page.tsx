'use client'
import { use } from 'react'
import AppShell from '@/components/layout/AppShell'
import GalaxyManagement from '@/components/galaxy/GalaxyManagement'
export default function ManageGalaxyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  return (
    <AppShell>
      <GalaxyManagement slug={slug} />
    </AppShell>
  )
}
