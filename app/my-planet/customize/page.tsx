import { redirect } from 'next/navigation'

// Opens the real customizer embedded on /my-planet (components/planet/PlanetCustomizer)
// rather than duplicating a second, disconnected one here.
export default function MyPlanetCustomizeRedirect() {
  redirect('/my-planet?customize=1')
}