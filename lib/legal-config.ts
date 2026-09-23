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

/** Registered legal entity name, e.g. "Gravity Souls SAS". */
export const LEGAL_ENTITY_NAME: string | null = null

/** Registered legal entity address (used alongside LEGAL_ENTITY_NAME). */
export const LEGAL_ENTITY_ADDRESS: string | null = null

/** Governing law / jurisdiction, e.g. "the laws of France". */
export const JURISDICTION: string | null = null

/**
 * General support / privacy / community-guidelines contact email. Used as
 * the contact point across all three legal pages. If a distinct Data
 * Protection Officer contact is ever required, add a separate
 * `DPO_EMAIL` field rather than overloading this one.
 */
export const SUPPORT_EMAIL: string | null = null

/** The specific GDPR legal basis (or bases) relied on for each processing purpose. */
export const GDPR_LEGAL_BASIS: string | null = null

/** How long each category of personal data is retained, and why. */
export const DATA_RETENTION_PERIODS: string | null = null

/** Third-party processors (hosting, email delivery, etc.) that touch personal data. */
export const DATA_PROCESSORS: string | null = null

/** Details of any international personal-data transfer (destination, safeguard mechanism). */
export const INTERNATIONAL_TRANSFERS: string | null = null

/** Any cookie/analytics disclosure beyond the essential session cookie already documented inline. */
export const COOKIE_ANALYTICS_DISCLOSURE: string | null = null
