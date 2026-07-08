# Phase 3 Manual Smoke Checklist

> **Note — Playwright auth setup (2026-07-08)**
> The E2E tests inject session cookies by replicating Better Auth's signed cookie format
> (`HMAC-SHA-256(token, AUTH_SECRET)`, base64-encoded, URL-encoded). This works today but
> couples the test infrastructure to an internal implementation detail of `better-call`.
> Short-term this is acceptable. When Better Auth ships official test utilities (or if the
> signing scheme changes), replace `signCookieToken()` in `e2e/global-setup.ts` with a
> real sign-in flow (POST to `/api/auth/sign-in/email` and capture the resulting cookie)
> or whatever Better Auth provides for test session creation.

Run with the dev server running (`npm run dev`). Use a browser with DevTools open.

---

## Setup

Before testing, you need two browser states:

**State A — Signed out**  
Open a private/incognito window. No cookies.

**State B — Signed in with active planet**  
Sign in with an account that has an active planet (`POST /api/my-planet` returns 200).

**State C — Signed in, no active planet**  
Sign in with an account that has no active planet (`GET /api/my-planet` returns 404).

To quickly reach State C: sign in, then open DevTools → Application → Cookies, delete `better-auth.session_token`, then sign back in as a new/empty account.

---

## 1. Middleware gate (State A)

| # | Action | Expected |
|---|--------|----------|
| 1.1 | Navigate to `/resonance` | **Redirect** to `/sign-in?next=%2Fresonance` — no page flash |
| 1.2 | Navigate to `/discover` | Redirect to `/sign-in?next=%2Fdiscover` |
| 1.3 | Navigate to `/my-planet` | Redirect to `/sign-in?next=%2Fmy-planet` |
| 1.4 | Navigate to `/stream` | Redirect to `/sign-in?next=%2Fstream` |
| 1.5 | Navigate to `/settings/planet` | Redirect to `/sign-in?next=%2Fsettings%2Fplanet` |
| 1.6 | Navigate to `/onboarding` | **No redirect** — page loads normally |
| 1.7 | Navigate to `/sign-in` | No redirect |
| 1.8 | Navigate to `/` (landing) | No redirect |
| 1.9 | Navigate to `/api/my-planet` | **Not** a 302 — arrives at route handler, returns `{"error":"Unauthorized"}` (401 in Network tab) |

**Verify in Network tab**: `/resonance` response is a 302 (or 307), NOT a 200 followed by client-side redirect. The redirect must be server-side.

---

## 2. sign-in ?next redirect (State A)

| # | Action | Expected |
|---|--------|----------|
| 2.1 | Navigate to `/sign-in?next=/resonance` | URL shows `?next=/resonance` |
| 2.2 | Sign in with a valid account that has a planet | After submit, lands on `/resonance` — NOT on `/stream` |
| 2.3 | Navigate to `/sign-in?next=/discover` → sign in | Lands on `/discover` |
| 2.4 | Navigate to `/sign-in?next=https://evil.com` → sign in | Falls back to `/stream` (open-redirect blocked) |
| 2.5 | Navigate to `/sign-in?next=//evil.com` → sign in | Falls back to `/stream` |

---

## 3. Signed-in, no planet → redirects (State C)

| # | Action | Expected |
|---|--------|----------|
| 3.1 | Navigate to `/resonance` | Middleware passes (cookie present). Page loads, calls `GET /api/my-planet` → 404. Client-side redirect to `/onboarding` |
| 3.2 | Navigate to `/discover` | Same pattern → `/onboarding` |

**Verify**: open Network tab, confirm `GET /api/my-planet` returns **404**, not 200. The redirect is client-side (no 302 in Network tab for `/resonance`).

---

## 4. Signed-in with planet → pages render from DB (State B)

| # | Action | Expected |
|---|--------|----------|
| 4.1 | Navigate to `/resonance` | Page renders (no redirect). Network tab shows `GET /api/my-planet` → **200**. No `gravitysoul_planet_*` localStorage read (check Application tab) |
| 4.2 | Navigate to `/discover` | Page renders. No `gravitysoul_user_id` written in localStorage |
| 4.3 | Check Application → Local Storage | `gravitysoul_planet_*` key may be written by AuthSync (download path), but it should NOT have been read before that |

---

## 5. AuthSync — no reload (State B)

| # | Action | Expected |
|---|--------|----------|
| 5.1 | Open DevTools → Performance tab. Record. Navigate to `/resonance`. Stop recording. | Only **one** full page load event — no second navigation (no reload) |
| 5.2 | Paste in Console: `window.__gsReloadTest = 0; const orig = window.location.reload.bind(window.location); window.location.reload = () => window.__gsReloadTest++; setTimeout(() => console.log('Reloads:', window.__gsReloadTest), 3000)` then navigate to `/resonance` | Console prints `Reloads: 0` after 3 seconds |

---

## 6. Onboarding handoff sign-in (State A)

| # | Action | Expected |
|---|--------|----------|
| 6.1 | Navigate to `/onboarding` | Calibration flow loads |
| 6.2 | Complete steps 1–4 (climate, themes, atmosphere, resonance) | Draft saved in sessionStorage |
| 6.3 | Click "See my planet" → "Save My Planet" → "Sign up" | URL: `/sign-up?from=onboarding` |
| 6.4 | Fill sign-up form → submit | Network tab shows `POST /api/onboarding/complete` → 200. Redirect to `/resonance` |
| 6.5 | Navigate to `/resonance` | Planet renders (name matches what was generated in the calibration preview) |
| 6.6 | In Application → Session Storage | All three `gs_onboarding_*` keys are gone |

---

## 7. Existing sign-in/sign-up flows not broken (State A)

| # | Action | Expected |
|---|--------|----------|
| 7.1 | Sign up without `?from=onboarding` | Redirects to `/onboarding` (sign-up's default `next` fallback) |
| 7.2 | Sign in without `?next` or `?from` | Redirects to `/stream` |

---

## 8. Settings page (State B)

| # | Action | Expected |
|---|--------|----------|
| 8.1 | Navigate to `/settings/planet` | Page loads. Planet preview renders. Check console — no `getOrCreateUserId` called |
| 8.2 | Change emotional climate → Save | Toast "Updated" appears. Navigate to `/resonance` — planet reflects change |
