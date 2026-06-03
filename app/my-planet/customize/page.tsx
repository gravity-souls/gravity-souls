import { redirect } from 'next/navigation'

export default function MyPlanetCustomizeRedirect() {
  redirect('/settings/planet')
}