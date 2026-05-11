export type EventStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PASSED'

export type EventCategory = 'MEETUP' | 'ONLINE' | 'WORKSHOP' | 'STARGAZING' | 'DISCUSSION' | 'OTHER'

export interface EventProposer {
  id: string
  name: string
  planetTexture: string | null
  userLevel?: number
}

export interface EventAttendee {
  id: string
  name: string
  planetTexture: string | null
  userLevel: number
}

export interface GalaxyEventSummary {
  id: string
  galaxyId: string
  title: string
  description: string
  date: string
  location: string | null
  onlineUrl: string | null
  maxAttendees: number | null
  category: EventCategory
  status: EventStatus
  coverImage: string | null
  createdAt: string
  updatedAt: string
  rsvpCount: number
  userHasRSVPed: boolean
  proposer: EventProposer
  galaxy?: {
    id: string
    name: string
    slug: string
    accentColor: string
  }
}

export interface GalaxyEventDetail extends GalaxyEventSummary {
  rsvps: EventAttendee[]
  spotsRemaining: number | null
}