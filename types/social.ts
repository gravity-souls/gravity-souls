// ─── Social layer types ─────────────────────────────────────────────────────
//
// Covers: direct messaging, relationship states, and saved planets.
// These types model the "Communication Beam" and "Star Chart" metaphors.

import type { OrbitColor, OrbitMatch } from './match'

// ─── Messaging ──────────────────────────────────────────────────────────────

export type MessageType =
  | 'text'    // standard message
  | 'beam'    // connection-forming first signal (styled differently)
  | 'signal'  // short reaction / acknowledgment

export interface Message {
  id:        string
  fromId:    string    // planet / user ID
  toId:      string
  content:   string
  type:      MessageType
  sentAt:    string    // ISO timestamp
  readAt?:   string    // undefined = unread
}

export interface Conversation {
  id:              string
  participantIds:  string[]    // exactly 2 for DMs

  /** Most recent message for preview */
  lastMessage?:    Message

  /** How many unread messages the current user has in this thread */
  unreadCount:     number

  /** Visual accent for the conversation beam line */
  orbitColor:      OrbitColor

  /** Connection strength 0–100 — grows as messages are exchanged */
  connectionStrength: number

  startedAt:       string
  updatedAt:       string
}

// ─── Relationship state ──────────────────────────────────────────────────────
//
// Relationship status describes how far two planets have drifted toward each other.
//
//   signal       → one planet sent a first beam (like a "ping")
//   orbit        → both planets are mutually aware (like "following")
//   resonant     → active, regular connection (friends)
//   aligned      → deep, enduring connection (close bond)

export type RelationshipStatus =
  | 'signal'    // unilateral first contact
  | 'orbit'     // mutual awareness
  | 'resonant'  // active connection
  | 'aligned'   // deep bond

export interface Relationship {
  id:                 string
  planetAId:          string
  planetBId:          string

  status:             RelationshipStatus

  /** The resonance data that brought these planets together, if any */
  orbitMatch?:        OrbitMatch

  /** When the first signal was sent */
  initiatedAt:        string

  /** When status last changed */
  updatedAt:          string

  /** Last message/interaction timestamp */
  lastInteractionAt?: string
}

// ─── Saved planets (Star Chart) ─────────────────────────────────────────────
//
// Explorers and Resonators can bookmark planets they want to revisit.
// This constitutes the user's personal "star chart".

export interface SavedPlanet {
  /** ID of the saved planet */
  planetId:    string

  /** When the user saved it */
  savedAt:     string

  /** Optional personal annotation / note */
  label?:      string
}
