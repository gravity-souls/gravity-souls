// Single source of truth for the real-world legal/entity facts referenced
// across app/legal/{terms,privacy,guidelines}/page.tsx. Fill in a field once
// its real, founder-approved value exists and every page that references it
// updates automatically — no more hunting through three separate page files.
//
// Leave a field `null` until the real value exists. Each legal page renders
// its own "Pending — <description>" badge for any null field here; never put
// a placeholder or invented value in this file just to make a badge
// disappear — see docs/beta-execution.md's "Remaining launch gates".
//
// None of this constitutes legal advice or compliance sign-off on its own;
// it's a data source the legal pages read from, nothing more.

/**
 * Registered legal entity name, e.g. "Gravity Souls SAS". Still null: the
 * founder is operating as an individual, not a registered company, but has
 * not yet given a real full legal name to publish as the GDPR Article 13
 * data controller identity — a name (or registered business name) is
 * required here before this can stop being a launch gate, an address alone
 * won't satisfy it. Do not fill this with "an individual" or similar — that
 * is not a controller identity, it is a description of one's absence.
 */
export const LEGAL_ENTITY_NAME: string | null = null

/** Registered legal entity address (used alongside LEGAL_ENTITY_NAME). */
export const LEGAL_ENTITY_ADDRESS: string | null = null

/** Governing law / jurisdiction, e.g. "the laws of France". */
export const JURISDICTION: string | null = "the laws of France"

/**
 * General support / privacy / community-guidelines contact email. Used as
 * the contact point across all three legal pages. If a distinct Data
 * Protection Officer contact is ever required, add a separate
 * `DPO_EMAIL` field rather than overloading this one.
 */
export const SUPPORT_EMAIL: string | null = "gravitysouls2026@gmail.com"

/**
 * The specific GDPR legal basis (or bases) relied on for each processing
 * purpose. Reflects what the app actually does today (checked against the
 * codebase, not assumed): account/profile/matching/messaging data is
 * processed to perform the contract the user enters into by signing up
 * (Art. 6(1)(b)); rate limiting and abuse/safety enforcement (block lists,
 * report handling) relies on legitimate interest (Art. 6(1)(f)); no
 * analytics, tracking, or marketing processing exists in the app today, so
 * no consent-based (Art. 6(1)(a)) processing currently applies. Worth a
 * real lawyer's sanity check before treating this as final — this is a
 * good-faith reading of the codebase, not legal certification.
 */
export const GDPR_LEGAL_BASIS: string | null =
  "Account, profile, matching, and messaging data is processed to perform the contract formed when you sign up (GDPR Art. 6(1)(b)). Rate limiting and safety enforcement (blocking, report handling) relies on legitimate interest in keeping the service usable and safe (Art. 6(1)(f)). The app does not currently run analytics, tracking, or marketing processing, so no consent-based processing applies today."

/**
 * How long each category of personal data is retained, and why. Reflects
 * the actual behavior of DELETE /api/me (app/api/me/route.ts): there is no
 * automatic deletion for inactivity — data is retained for as long as the
 * account exists. On self-deletion, private data (sessions, credentials,
 * profile, planets, calibration answers, saved list, follow/block graph,
 * memberships, XP history, notifications) is deleted immediately; content
 * visible to other people (messages, posts, comments, replies, discussions)
 * is kept so it doesn't break the record for the other party, but is
 * re-attributed to an anonymized "Deleted Planet" identity.
 */
export const DATA_RETENTION_PERIODS: string | null =
  "Your data is retained for as long as your account exists — there is no automatic deletion for inactivity. If you delete your account, your private data (session credentials, profile, planets, calibration answers, saved planets, follows/blocks, community memberships, XP history, and notifications) is deleted immediately. Content you sent to other people (messages, posts, comments, replies, and discussion threads) is kept so it doesn't disappear from their side of the conversation, but is reattributed to an anonymized \"Deleted Planet\" identity rather than your account."

/**
 * Third-party processors (hosting, email delivery, etc.) that touch
 * personal data. Reflects the actual services wired into the app today.
 */
export const DATA_PROCESSORS: string | null =
  "Neon (PostgreSQL database hosting), Vercel (application hosting and deployment), and Resend (transactional email delivery, e.g. password resets)."

/**
 * Details of any international personal-data transfer (destination,
 * safeguard mechanism). Reflects actually-observed hosting regions: Neon's
 * database runs in the EU (eu-central-1, Frankfurt); Vercel's serverless
 * functions have been observed executing in the US (iad1, Washington D.C.)
 * even for requests received at its Paris edge. Resend's processing region
 * is not confirmed here — check Resend's own subprocessor list before
 * treating this as complete.
 */
export const INTERNATIONAL_TRANSFERS: string | null =
  "Your database data is stored in the EU (Frankfurt, Germany). Application processing (via our hosting provider, Vercel) may occur in the United States. Where this happens, it is covered by our processors' Standard Contractual Clauses and other GDPR-compliant safeguards for transfers outside the EU."

/**
 * Any cookie/analytics disclosure beyond the essential session cookie
 * already documented inline. Reflects the app's actual state: no analytics
 * or tracking library exists in the codebase, and Vercel's own Analytics/
 * Speed Insights add-ons are not enabled on this project.
 */
export const COOKIE_ANALYTICS_DISCLOSURE: string | null =
  "We only use one cookie: the session cookie that keeps you signed in, which is strictly necessary for the service to function and does not require consent under EU cookie rules. We do not currently run any analytics, tracking, or advertising cookies or scripts."
