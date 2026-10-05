# Registration, preference discovery and unified star maps

New email and OAuth accounts complete a private, mobile-friendly basics wizard
on `/onboarding` before the planet calibration. Questions cover gender, spoken
languages, city/region, interests, connection goals, people preferences and
preferred gatherings. Optional steps can be skipped or cleared. An anonymous
calibration draft survives account creation and the registration wizard.

Settings → Basic details & connection preferences (`/settings/basics`) reloads
and edits the same server record. Links are available in planet settings and
account settings. Saving updates all preference fields, including clearing an
answer; errors preserve edits and offer retry. There is no location lookup,
GPS request, or automatic public disclosure.

## Adult declaration and privacy

New registrations must declare they are at least 18 before the server allows
`POST /api/onboarding/complete` or `POST /api/my-planet`. A valid birth date may establish this personal
declaration; alternatively the user can withhold their birthday and explicitly
confirm they are 18+. Invalid calendar dates and underage dates are rejected
by both client and server, even if a request also checks the adult declaration.
The full birthday is never persisted in the database or browser storage.
This is a self-declaration, **not identity or documentary age verification**.

`RegistrationBasics` is separate from public `Profile` data. Gender, interests,
region, spoken languages and connection preferences remain private by default.
Users may select up to twelve individual tags in settings; only those tags are
returned on public planets and map nodes. Birthday and adult evidence are never
public tags. Clearing consent removes a tag on the next read.

Server-side matching computes a weighted preference fit and returns only the
aggregate fit, coverage and source planet identity. It never sends another
user's private answers. Available preferences contribute at most 15% of the
planet score, with unanswered fields unscored. Levels do not improve scores.
A large enough eligible batch uses four primary recommendations and at most
one reproducible daily exploration choice, without randomizing score values. Existing public profile
language/location controls keep their established role. Own-data export
includes the private preferences and declaration evidence. Account deletion
removes them, and a locked-owner check prevents recreation after deletion.
Subsequent preference edits preserve the original adult declaration.

Accounts that existed before the migration remain compatible and can opt in
through settings. New user rows require registration by default. Existing
anonymous visitors can still explore calibration, but cannot save a new
account's planet before completing registration.

## Planet Live

Planet awakening no longer mounts `UniverseGlimpse` or fetches nearby planets
for a decorative backdrop. The central CosmicGlobe particle galaxy, breathing
light and reveal animation remain. The global map now scatters visible planets directly, with stronger matching
usually closer and bounded level-based size/gravity. Load more appends eligible
planets; it does not claim to load the entire database at once. Climate remains
a color/filter rather than a fixed set of clusters.

Personal maps use small avatars and names for people, retaining explicit saved,
follow, mutual, galaxy and activity edges. Duplicate profile mini-maps and owner
list cards are removed; saved planets remain a collection in the personal map.
Galaxy cluster size and particle density use actual living membership counts,
with compressed growth to keep both small and large communities readable.

Activity and galaxy creation/settings can provide public region/location,
language, interest, connection-goal and gathering metadata. Listings support
these filters and preference sorting. Activity recommendations first apply
membership, visibility, blocking, status and user filters, then rank the next
200 eligible activities; the UI explains this bounded pool. Normal date sorting
keeps database pagination. Settings saves and focus refresh matching/map data.

## Deployment and verification

No new environment variables. Deploy using the existing `npm run build:deploy`
command, which applies the registration, discovery metadata and public-tag
migrations before building.
This adds a private table and a new-account gate; no account data is removed.

- `npm run test:registration`: actual migrations, legacy/new account behavior,
  exact age boundaries, invalid/leap dates, skip/save/edit, private-owner scope,
  export, deletion, declaration preservation, tag consent/revocation, private
  preference boundaries, filtered activity permissions, bounded scoring,
  exploration determinism and atlas magnitude.
- `npm run test:galaxy`, lint, typecheck and production build.
- Demo browser checks cover all three languages, retry, 18+ declaration,
  registration-to-calibration, settings save/reload and mobile overflow.
- The real database sign-up journey now exercises the required declaration
  and preservation of the anonymous draft before the Planet Live reveal.
