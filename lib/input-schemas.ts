import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max)
const list = z.array(text(100).min(1)).max(30)
const axis = z.number().finite().min(0).max(100)
const mood = z.enum(['calm', 'melancholic', 'intense', 'cold', 'mixed'])
const style = z.enum(['minimal', 'dense', 'fractured', 'fluid'])
const lifestyle = z.enum(['solitary', 'communal', 'nomadic', 'rooted'])
const communicationStyle = z.enum(['direct', 'poetic', 'playful', 'reflective', 'analytical'])
const matchPreference = z.enum(['similar', 'complementary', 'mixed'])
const texture = z.string().max(80).regex(/^[a-z0-9_-]+\.jpg$/i)
const color = z.string().regex(/^#[0-9a-f]{6}$/i)
export const resourceId = text(128).min(1)
export const joinSchema = z.object({ communityId: resourceId }).strict()
export const conversationSchema = z.object({ recipientId: resourceId, message: text(2000).min(1) }).strict()
export const messageSchema = z.object({ content: text(2000).min(1) }).strict()

export const followSchema = z.object({ userId: resourceId }).strict()
export const blockSchema = z.object({ userId: resourceId }).strict()
export const reportTargetType = z.enum(['USER', 'PLANET', 'POST', 'POST_COMMENT', 'COMMUNITY_POST', 'COMMUNITY_DISCUSSION_REPLY', 'DIRECT_MESSAGE'])
export const reportSchema = z.object({
  targetType: reportTargetType,
  targetId: resourceId,
  targetUserId: resourceId.optional(),
  reason: text(200).min(1),
  details: text(2000).optional(),
}).strict()
export const visibilitySchema = z.object({ visibility: z.enum(['MEMBERS', 'PRIVATE']) }).strict()

const planetFields = {
  name: text(80).min(1),
  tagline: text(300).nullable().optional(),
  avatarSymbol: text(32).min(1).optional(),
  role: z.enum(['explorer', 'resonator']).optional(),
  mood: mood.optional(), style: style.optional(), lifestyle: lifestyle.optional(),
  coreThemes: list.optional(),
  contentFragments: z.array(text(2000)).max(20).optional(),
  visual: z.object({
    coreColor: color.optional(), accentColor: color.optional(), textureFile: texture.optional(),
    ringStyle: z.enum(['single', 'double', 'broken', 'none']).optional(),
    surfaceStyle: z.enum(['smooth', 'cracked', 'nebulous', 'crystalline']).optional(),
    satelliteCount: z.number().int().min(0).max(4).optional(),
    size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  }).strict().optional(),
  abstractAxis: axis.optional(), introspectiveAxis: axis.optional(),
}
export const planetCreateSchema = z.object(planetFields).strict()
export const planetUpdateSchema = z.object({
  ...planetFields,
  location: text(200).nullable().optional(),
  languages: list.optional(), culturalTags: list.optional(), travelCities: list.optional(),
  musicTaste: list.optional(), bookTaste: list.optional(), filmTaste: list.optional(),
  communicationStyle: communicationStyle.nullable().optional(),
  matchPreference: matchPreference.nullable().optional(),
  visibility: z.enum(['MEMBERS', 'PRIVATE']).optional(),
}).partial().strict()

const resonanceAnswers = z.object({
  emotionalProcessing: z.enum(['alone', 'together', 'creating', 'moving']).optional(),
  leadWith: z.enum(['curiosity', 'warmth', 'ideas', 'silence']).optional(),
  connectionSeeking: z.enum(['deep-slow', 'playful', 'intellectual', 'soulful']).optional(),
  solitudeNeed: z.enum(['daily', 'weekly', 'rarely', 'social']).optional(),
  lifeChapter: z.enum(['building', 'exploring', 'healing', 'waiting']).optional(),
}).strict()
export const onboardingSchema = z.object({ draft: z.object({
  climateKey: z.enum(['calm', 'melancholic', 'introspective', 'electric', 'turbulent', 'expansive']).optional(),
  selectedThemes: list, lifestyle: lifestyle.optional(), textureFile: texture.optional(),
  communicationStyle: communicationStyle.optional(), abstractAxis: axis, introspectiveAxis: axis,
  location: text(200).optional(), languages: list.optional(), travelCities: list.optional(), culturalTags: list.optional(),
  matchPreference: matchPreference.optional(), connectionTypes: list.optional(), resonanceAnswers: resonanceAnswers.optional(),
}).strict() }).strict()
export const questionnaireSchema = z.object({
  answers: z.record(text(100), z.union([text(2000), z.number().finite(), z.boolean(), z.array(text(200)).max(30)])).optional(),
  mood: mood.optional(), style: style.optional(), lifestyle: lifestyle.optional(),
  abstractAxis: axis.optional(), introspectiveAxis: axis.optional(),
}).strict()

const optionalUrl = z.union([z.literal(''), z.url().max(2048).refine((value) => {
  const url = new URL(value)
  return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
})]).nullable().optional()
export const eventSchema = z.object({
  title: text(80).min(1), description: text(500).min(1), date: text(100).min(1),
  category: z.enum(['MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER']),
  location: text(200).nullable().optional(), onlineUrl: optionalUrl,
  coverImage: z.union([z.literal(''), z.string().max(2048).regex(/^\/uploads\/event-covers\/[a-z0-9-]+\.(jpg|png|webp)$/i), z.url().max(2048).refine((value) => {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com') && !url.username && !url.password
  })]).nullable().optional(),
  maxAttendees: z.number().int().min(2).max(10000).nullable().optional(),
}).strict()
export const eventStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']), rejectionReason: text(500).nullable().optional(),
}).strict()
