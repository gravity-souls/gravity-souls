# Registration basics and quieter Planet Live

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
`POST /api/onboarding/complete`. A valid birth date may establish this personal
declaration; alternatively the user can withhold their birthday and explicitly
confirm they are 18+. Invalid calendar dates and underage dates are rejected
by both client and server, even if a request also checks the adult declaration.
The full birthday is never persisted in the database or browser storage.
This is a self-declaration, **not identity or documentary age verification**.

`RegistrationBasics` is separate from public `Profile` data. Gender, interests,
region, spoken languages and connection preferences remain private; this
release does not use them to change matching scores. Existing public profile
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
light and reveal animation remain. Actual universe and star-map pages are
unchanged.

## Deployment and verification

No new environment variables. Deploy using the existing `npm run build:deploy`
command, which applies `20261005220000_registration_basics` before building.
This adds a private table and a new-account gate; no account data is removed.

- `npm run test:registration`: actual migrations, legacy/new account behavior,
  exact age boundaries, invalid/leap dates, skip/save/edit, private-owner scope,
  export, deletion, and declaration preservation.
- `npm run test:galaxy`, lint, typecheck and production build.
- Demo browser checks cover all three languages, retry, 18+ declaration,
  registration-to-calibration, settings save/reload and mobile overflow.
- The real database sign-up journey now exercises the required declaration
  and preservation of the anonymous draft before the Planet Live reveal.
