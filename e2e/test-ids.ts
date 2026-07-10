import path from 'node:path'

// Fixed identifiers for Phase 3 E2E test users.
// These IDs are deterministic so setup/teardown are idempotent.

export const E2E = {
  // Signed-in user WITH an active planet. Used for:
  //   - /resonance renders from DB (test 5)
  //   - /discover renders from DB (test 6)
  //   - no window.location.reload (test 8)
  //   - sign-in ?next redirect (test 3) — uses password to log in via form
  withPlanet: {
    userId:     'gs_e2e_user_wp',
    email:      'gs_e2e_wp@test.local',
    password:   'TestPassword123!',
    sessionId:  'gs_e2e_session_wp',
    token:      'gs_e2e_tok_with_planet_phase3_abc',
    planetName: 'Velith Prime',
  },

  // Signed-in user with NO active planet. Used for:
  //   - /resonance redirects to /onboarding (test 4)
  noPlanet: {
    userId:     'gs_e2e_user_np',
    email:      'gs_e2e_np@test.local',
    password:   'TestPassword123!',
    sessionId:  'gs_e2e_session_np',
    token:      'gs_e2e_tok_no_planet_phase3_abc',
  },

  // User used for the onboarding sign-in handoff test (test 7).
  // Has no planet so /api/onboarding/complete creates one fresh.
  handoff: {
    userId:    'gs_e2e_user_ho',
    email:     'gs_e2e_ho@test.local',
    password:  'TestPassword123!',
    accountId: 'gs_e2e_account_ho',
  },

  // Dedicated user for Journey 4 (sign-out / sign-back-in).
  // Has a planet so /resonance renders correctly before sign-out.
  // Signing out deletes only this session — no other test is affected.
  signOut: {
    userId:     'gs_e2e_user_so',
    email:      'gs_e2e_so@test.local',
    password:   'TestPassword123!',
    accountId:  'gs_e2e_account_so',
    sessionId:  'gs_e2e_session_so',
    token:      'gs_e2e_tok_sign_out_journey4_abc',
    planetName: 'Signout Planet',
  },
} as const

// Journey 1 new-user: no pre-existing account.
// global-setup deletes any leftover record so each run starts clean.
export const JOURNEY = {
  signUp: {
    name:     'E2E Journey New User',
    email:    'gs_journey_signup@journey.test.local',
    password: 'JourneyPass123!',
  },
} as const

export const AUTH_DIR = path.join(__dirname, '.auth')
export const AUTH_WP  = path.join(AUTH_DIR, 'with-planet.json')
export const AUTH_NP  = path.join(AUTH_DIR, 'no-planet.json')
export const AUTH_SO  = path.join(AUTH_DIR, 'sign-out.json')

export const ALL_TEST_USER_IDS = [
  E2E.withPlanet.userId,
  E2E.noPlanet.userId,
  E2E.handoff.userId,
  E2E.signOut.userId,
]
