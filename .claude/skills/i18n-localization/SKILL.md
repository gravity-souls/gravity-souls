---
name: i18n-localization
description: GravitySouls ships en/fr/zh. Any new or changed user-facing text - UI copy, server-generated notification title/body, anything a user reads - must land in all three locales in the same change, via messages/*.json (client) or lib/notification-i18n.ts (server, outside a React tree). Covers the key-parity check, the t.has()-guarded label-lookup pattern in lib/planet-labels.ts, and the trap where a stored enum isn't the same key space as the picker UI that produced it. Use whenever a task adds/edits any string a user sees, or displays a value that was stored by an earlier, different version of a picker/form. Do not use for routing/auth/data-model questions unrelated to copy or display text.
---

# i18n / localization discipline

GravitySouls is France/EU-facing and ships three locales: `en`, `fr`, `zh`. A string that
only exists in English is a bug, not a follow-up - treat it the same severity as a broken
link. This was learned the hard way this session: several real production bugs (a
confusing "resonance accepted" notification that was actually a new message, raw English
mood/lifestyle tags on saved planets, hardcoded sentence templates in resonance-matching
UI) were really localization gaps that read as functional bugs to users.

## Where translated text lives

- **Client components**: `messages/en.json`, `messages/fr.json`, `messages/zh.json` +
  `useTranslations(namespace)` from `next-intl`. Namespaces are flat `"key": "value"` maps
  by convention (see `planetPage`, `creationSteps`) - don't nest further than the project
  already does unless there's a real reason to group.
- **Server-side text with no React tree** (notification title/body created in an API
  route, background job, etc.): `lib/notification-i18n.ts`'s `tNotification(locale, key,
  params)` reads from the same `messages/*.json` files under a `notifications` namespace,
  dynamically imported the same way `i18n.ts` does for the client. `getUserLocale(userId)`
  resolves the *recipient's* stored `user.language` - never the actor's/admin's locale for
  text the recipient will read. Only the notification templates touched so far
  (`newMessage`, `galaxyNewEvent` + the two inline galaxy-event notifications in
  `app/api/galaxies/[id]/events/[eventId]/status/route.ts`) go through this. The rest of
  `lib/createNotification.ts`'s `NotificationTemplates` (resonanceReceived,
  resonanceAccepted, galaxyNewPost, eventReminder, levelUp, newMatch, commentReceived,
  commentReplyReceived, newFollower) are still hardcoded English - a known, not-yet-fixed
  gap. Don't assume a template is localized just because the file imports `tNotification`.

## The stored-value-isn't-the-picker-key trap

A value saved to the database by one version of a creation/picker flow can be a *different,
smaller* key space than the options array that flow's UI currently renders from.
Concretely: `Planet.mood` is a 5-value `Mood` enum (`calm/melancholic/intense/cold/mixed`)
derived via a lossy 6-to-5 mapping (`lib/planet-builder.ts`'s `CLIMATE_TO_MOOD` /
`MOOD_TO_CLIMATE`) from the onboarding step's 6-value `CLIMATE_OPTIONS` key space
(`calm/melancholic/introspective/electric/turbulent/expansive`). Calling
`t(\`climateOptions.${planet.mood}.label\`)` directly on the *stored* value will silently
render next-intl's missing-key placeholder (the literal dotted key path, e.g.
`creationSteps.climateOptions.intense.label`) for `intense`/`cold`/`mixed` - this was
caught live mid-session, not by typecheck or lint, because both are valid strings as far
as TypeScript is concerned.

Before writing `t(\`namespace.${someStoredValue}.label\`)`, ask: does `someStoredValue`
come from the exact options array this translation key was built from, or could it be an
older/derived/remapped value? If there's any doubt, route it through a label helper (see
below) instead of interpolating the raw value into the key path.

## `lib/planet-labels.ts` - the safe label pattern

`moodLabel(t, mood)`, `lifestyleLabel(t, lifestyle)`, `commStyleLabel(t, style)`,
`themeLabel(t, theme)`, `galaxyMoodLabel(t, mood)` all do two things a raw `t()` call
doesn't:

1. Translate through the correct key-space mapping when the stored value and the picker's
   options array differ (see above) - `moodLabel` runs the value through
   `MOOD_TO_CLIMATE` before building the key.
2. Guard with `t.has(key)` and fall back to a title-cased version of the raw stored value
   if the key doesn't resolve - so a stale/legacy/malformed value (seed data, an old slug
   format, a manually-edited row) degrades to something readable instead of leaking a
   dotted key path onto the screen. This was also caught live: a seed-data planet had a
   theme value (`night-silence`) that didn't match the expected slug format
   (`night & silence`), and without the `t.has()` guard it rendered the full broken key
   string.

Reuse these helpers (or add a new one in the same file, same pattern) anywhere a *stored*
planet/galaxy trait is displayed. Don't call `t()` directly on a DB value outside this
file unless you've confirmed the value space matches exactly.

## Workflow for any new/changed user-facing string

1. Add the key to `messages/en.json` first, write the real copy (not a placeholder).
2. Add the same key to `fr.json` and `zh.json` with real translations in the same change
   - never leave a locale file out "to do later."
3. Run a key-parity check before calling the work done:
   ```
   python3 -c "
   import json
   def keys(d, p=''):
       s = set()
       for k, v in d.items():
           q = f'{p}.{k}' if p else k
           s |= keys(v, q) if isinstance(v, dict) else {q}
       return s
   en, fr, zh = (json.load(open(f'messages/{l}.json')) for l in ('en','fr','zh'))
   print('en-fr diff:', keys(en) - keys(fr))
   print('en-zh diff:', keys(zh) and keys(en) - keys(zh))
   "
   ```
   Both diffs must print `set()`.
4. If the string is server-generated (notification, email), confirm which locale it should
   render in - almost always the *recipient's*, fetched via `getUserLocale`, not the
   actor's session locale.
5. If the string embeds a stored trait value (mood, lifestyle, theme, communication
   style), use a `lib/planet-labels.ts` helper, not a raw `t()` call.
6. Verify live in at least French and Chinese, not just English - a key-parity pass alone
   doesn't catch wrong key routing (the mood/climate trap above has correct parity across
   all three files and still renders broken without the right helper).

## Reads first

`messages/en.json` (shape/conventions), `lib/planet-labels.ts`, `lib/notification-i18n.ts`,
`i18n.ts` (how the client-side locale/messages are resolved).
