# Warmup account generation log

## Scope

Eight independent Better Auth credential accounts, eight public member-visible
profiles and active planets, one membership in each of the eight launch
galaxies, four authored Stream posts, and eight original surface maps.
The launch accounts have ordinary user/credential/profile/planet records and
no demo flag in the product UI. Their names and biographies are authored
characters; the script does not manufacture likes, followers or online status.

## Implementation and verification

- Source content: `scripts/warmup-planets.json`.
- Registration credentials: private CSV outside the Git repository, with
  `seedKey,name,email,password` columns. Do not commit this file.
- `npm run db:seed-warmup -- --check` validated eight distinct planets and four
  posts without database access.
- `npm run typecheck` and targeted ESLint passed after `prisma generate`.
- All eight generated passwords passed Better Auth's `hashPassword` /
  `verifyPassword` round trip without printing credential values.
- The eight 1024×512 PNG maps in `public/textures/warmup/` passed PNG integrity
  checks and were inspected together in a contact sheet.
- `--apply` needs `WARMUP_DATABASE_URL` and an absolute
  `WARMUP_CREDENTIALS_FILE`. It checks for all eight galaxy rows before any
  account write and uses one transaction per account. Reruns leave existing
  passwords and edited profile/planet/post records untouched.

## Errors and unusual behavior observed

1. The first typecheck failed because `npm ci --ignore-scripts` left Prisma
   Client ungenerated. `prisma generate` initially could not download its
   official engine inside the network sandbox; retrying with authorized
   network access succeeded. Typecheck then passed.
2. During texture generation, an inspection glob also picked up incomplete
   hidden temporary PNG files left by earlier writes. The generator now writes
   to a temporary path and atomically replaces each final asset. The stray
   temporary files were removed, and all eight final PNGs verified.
3. `Profile` has no `tagline`, and `Community.name` is not unique. The script
   stores the headline in `Planet.tagline` and resolves galaxies by unique slug.
4. The ordinary signup UI records policy acceptance after a human ticks the
   checkbox. This founder-run data import **does not invent policy acceptance
   records** for authored characters. This distinction remains visible in
   the database.
5. Production import has not run: this checkout has no production database
   connection. Code, assets and credentials are prepared, but live account
   counts must not be reported as increased until `--apply` completes and a
   readback confirms it.
6. The generated addresses under `gravitysouls.com` currently have no
   verified inbox routing. Login with their passwords works once imported;
   password reset by email will require mail routing later.

## Production run and readback

Use a deliberately selected database URL and the private credentials CSV:

```bash
WARMUP_DATABASE_URL='<selected database URL>' \
WARMUP_CREDENTIALS_FILE='/absolute/path/gravity-souls-warmup-credentials.csv' \
npm run db:seed-warmup -- --apply
```

The command prints only counts, never passwords. If it stops partway through,
the failing account's transaction rolls back; preceding accounts remain.
After the command succeeds, check eight distinct credential accounts, eight
active planets, eight community memberships, four Stream posts and the
rendered custom maps on the live site.
