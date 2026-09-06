# Gravity-Souls — Where souls find their gravity

Domain: gravitysouls.com

A [Next.js](https://nextjs.org) 16 App Router project using Prisma 7, Better Auth, and next-intl.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Production Uploads

Custom planet textures are stored on local disk only during development. In production, configure Vercel Blob and add `BLOB_READ_WRITE_TOKEN` to the deployment environment so uploaded textures persist across serverless runs and deploys.

## Cosmic Globe introduction

`/demo/cosmic-globe` is a public, translated three-step introduction. Its language
selector only updates the browser locale cookie. It does not load account data or
write to the database. The globe supports pause, reset, reduced motion, and a CSS
fallback when WebGL is unavailable. Reset returns to the first step and preserves
an explicit pause. Reduced motion is respected on arrival; selecting Play explicitly
enables animation for this visit. Ambient morphing never advances the story steps.

### Local verification

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

The default browser suite uses `playwright.demo.config.ts`, starts a **production**
server on port 3100, and runs desktop and mobile Chromium checks without database
fixtures. Stop any other server on port 3100 before running it. Use
`npm run test:e2e:ui` for the same suite in the Playwright UI.

`npm run test:e2e:db` explicitly runs the existing database-dependent suite. Its
setup and teardown create/delete test records using `DIRECT_URL`; run it only with
a dedicated test database and a matching test application environment. The public
demo suite never invokes that setup or teardown.
