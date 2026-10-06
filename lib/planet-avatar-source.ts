import type { PlanetConfig } from '@/types/planet'

/** Planet identity takes priority over the sign-in provider's portrait. */
export function planetAvatarSource(config?: PlanetConfig | null, fallback?: string | null): string {
  return config?.customTextureUrl || (config?.baseTexture ? `/textures/${config.baseTexture}` : fallback || '/textures/jupiter.jpg')
}
