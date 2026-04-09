export type EmotionTone = 'warm' | 'cool' | 'melancholic' | 'playful' | 'neutral'

export type ExpressionStyle = 'fragmented' | 'narrative' | 'analytical' | 'visual'

export type MatchType = 'similar' | 'complementary' | 'distant'

export interface Universe {
  id: string
  name: string
  avatarSymbol: string
  coreThemes: string[]
  emotionTone: EmotionTone
  expressionStyle: ExpressionStyle
  driftDirection: string
  resonanceReason: string
  matchType?: MatchType
  // Optional display fields used by profile and card pages
  tagline?: string
  summary?: string
  resonanceScore?: number
}
