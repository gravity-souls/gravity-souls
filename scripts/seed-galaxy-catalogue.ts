// Populates the v1 galaxy catalogue as real Community rows.
//
// These 8 communities (previously hardcoded in the now-deleted
// lib/mock-galaxies.ts) are the intended launch content for the "galaxy"
// product surface (see docs/adr/0001-galaxy-content-model.md) — NOT
// disposable dev/test sample data. That is why this script deliberately does
// NOT go through lib/database-safety.ts's ALLOW_SAMPLE_DATA-gated
// seedDatabaseUrl()/prisma/seed.ts path: that path is reserved for throwaway
// dev/test fixtures and is unsuitable for real launch content.
//
// Idempotent / safe to re-run: upserts by the unique Community.slug and NEVER
// overwrites an existing community's fields on re-run (`update: {}`),
// mirroring the guard already used in prisma/seed.ts's own community upsert.
//
// This script reads DATABASE_URL directly — the same variable the app itself
// connects with (see lib/prisma.ts) — rather than one of the loopback-only
// dev helpers in lib/database-safety.ts, because a real population run is
// meant to target whatever database the person running it has deliberately
// chosen (a local loopback dev/test database for verification, or the real
// production database, only with founder approval — see the backend-data-
// engineer report for the exact command). It never falls back to a default
// connection string.
//
// Usage (verification, against your own loopback dev database):
//   DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/your_dev_db" \
//     npm run db:seed-galaxy-catalogue
//
// Usage (real population — requires explicit founder approval, see the
// backend-data-engineer report for this task):
//   DATABASE_URL="<production DATABASE_URL>" npm run db:seed-galaxy-catalogue

import 'dotenv/config'
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. This script never falls back to a default connection.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Same 8 galaxies previously hardcoded in lib/mock-galaxies.ts (now deleted).
// This is the intended v1 community catalogue for launch, per
// docs/adr/0001-galaxy-content-model.md — keep in sync with product decisions
// recorded there, not with ad hoc edits.
const GALAXY_CATALOGUE = [
  {
    slug: "slow-thinkers",
    name: "Slow Thinkers",
    symbol: "◎",
    tagline: "Where ideas arrive late, and linger longer.",
    description: "A quiet cluster for people who process the world slowly and deeply. Philosophy, introspection, long essays, and the courage to sit with uncertainty.",
    keywords: ["philosophy", "introspection", "writing", "slow living", "deep thought"],
    mood: "contemplative",
    accentColor: "#a78bfa",
    maturity: "active",
  },
  {
    slug: "signal-noise",
    name: "Signal & Noise",
    symbol: "◍",
    tagline: "Technology as lived experience, not just tool.",
    description: "For builders, tinkerers, and those who feel the texture of software. Code aesthetics, systems thinking, indie making, and digital craft.",
    keywords: ["technology", "software", "building", "systems", "craft", "indie"],
    mood: "technical",
    accentColor: "#60a5fa",
    maturity: "established",
  },
  {
    slug: "dusk-archives",
    name: "Dusk Archives",
    symbol: "◉",
    tagline: "Books, ruins, and the dust of remembered things.",
    description: "Literature, poetry, obscure cinema, forgotten music. For those who keep receipts from every emotional experience and call it a library.",
    keywords: ["books", "literature", "poetry", "film", "music", "memory", "art"],
    mood: "contemplative",
    accentColor: "#fbbf24",
    maturity: "active",
  },
  {
    slug: "warm-frequency",
    name: "Warm Frequency",
    symbol: "◌",
    tagline: "Conversations that feel like coming home.",
    description: "Emotionally open, socially warm. For people who think care is a practice. Vulnerability, mutual aid, small kindnesses at scale.",
    keywords: ["community", "care", "warmth", "connection", "vulnerability", "support"],
    mood: "intimate",
    accentColor: "#fb923c",
    maturity: "active",
  },
  {
    slug: "image-makers",
    name: "Image Makers",
    symbol: "◐",
    tagline: "Visual language for things words leave blurry.",
    description: "Photography, illustration, graphic design, video, spatial aesthetics. For people who see the composition in everything.",
    keywords: ["photography", "design", "illustration", "visual", "aesthetics", "film"],
    mood: "creative",
    accentColor: "#34d399",
    maturity: "established",
  },
  {
    slug: "threshold-states",
    name: "Threshold States",
    symbol: "⊗",
    tagline: "Liminal, between, in-transit. Always becoming.",
    description: "For nomads, third-culture people, those who belong to multiple places and none. Migration, identity, home as feeling not location.",
    keywords: ["travel", "nomad", "culture", "identity", "diaspora", "belonging"],
    mood: "contemplative",
    accentColor: "#a78bfa",
    maturity: "active",
  },
  {
    slug: "body-clocks",
    name: "Body Clocks",
    symbol: "⊕",
    tagline: "Movement, stillness, and the intelligence of the physical.",
    description: "Sport, training, somatic practice, dance, sleep. For people who treat the body as a second mind and listen when it speaks.",
    keywords: ["sport", "movement", "health", "dance", "body", "somatic", "nature"],
    mood: "vibrant",
    accentColor: "#34d399",
    maturity: "active",
  },
  {
    slug: "late-night-economics",
    name: "Late Night Economics",
    symbol: "⊘",
    tagline: "Money, power, and the systems beneath everything.",
    description: "Political economy, finance, startups, labour, urban planning. For people who want to understand the engine room of the world they live in.",
    keywords: ["economics", "politics", "startups", "finance", "systems", "cities", "work"],
    mood: "technical",
    accentColor: "#60a5fa",
    maturity: "active",
  },
];

async function main() {
  let created = 0;
  let alreadyExisted = 0;

  for (const galaxy of GALAXY_CATALOGUE) {
    const before = await prisma.community.findUnique({
      where: { slug: galaxy.slug },
      select: { id: true },
    });

    await prisma.community.upsert({
      where: { slug: galaxy.slug },
      // Never overwrite an existing real community's fields on re-run —
      // mirrors the guard already used in prisma/seed.ts.
      update: {},
      create: galaxy,
    });

    if (before) alreadyExisted++;
    else created++;
  }

  console.log(
    `Galaxy catalogue: ${created} created, ${alreadyExisted} already existed (left untouched).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
