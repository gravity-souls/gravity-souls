import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});
const prisma = new PrismaClient({ adapter });

const communities = [
  {
    slug: "deep-thinkers",
    name: "Deep Thinkers",
    symbol: "🧠",
    tagline: "Where thoughts orbit slowly",
    description: "A galaxy for those who live in the inner world of ideas.",
    keywords: ["philosophy", "introspection", "theory"],
    mood: "contemplative",
    accentColor: "#8b5cf6",
  },
  {
    slug: "creative-nebula",
    name: "Creative Nebula",
    symbol: "🎨",
    tagline: "Expression without limits",
    description: "Artists, writers, musicians — all creating in the void.",
    keywords: ["art", "music", "writing", "creation"],
    mood: "creative",
    accentColor: "#ec4899",
  },
  {
    slug: "nomadic-stars",
    name: "Nomadic Stars",
    symbol: "🌍",
    tagline: "Always moving, always discovering",
    description: "Travelers and cultural explorers sharing routes and stories.",
    keywords: ["travel", "culture", "languages", "adventure"],
    mood: "vibrant",
    accentColor: "#f59e0b",
  },
  {
    slug: "tech-forge",
    name: "Tech Forge",
    symbol: "⚙️",
    tagline: "Building the future, one commit at a time",
    description: "Engineers and makers tinkering with code and hardware.",
    keywords: ["engineering", "code", "hardware", "open-source"],
    mood: "technical",
    accentColor: "#06b6d4",
  },
  {
    slug: "quiet-orbits",
    name: "Quiet Orbits",
    symbol: "🌙",
    tagline: "Soft connections, gentle presence",
    description: "For those who prefer small circles and meaningful silence.",
    keywords: ["introvert", "calm", "presence", "silence"],
    mood: "intimate",
    accentColor: "#64748b",
  },
];

// ── Seed user (owner for mock planets) ────────────────────────────────────

const SEED_USER_ID = "seed-user-gravity-souls";
const SEED_USER = {
  id: SEED_USER_ID,
  name: "Seed Universe",
  email: "seed@gravitysouls.com",
  emailVerified: false,
};

// ── Mock planets ──────────────────────────────────────────────────────────

const planets = [
  {
    name: "Aelion",
    avatarSymbol: "🔮",
    tagline: "Thoughts that orbit slowly",
    mood: "calm",
    style: "minimal",
    lifestyle: "solitary",
    coreThemes: ["philosophy", "introspection", "slow thought"],
    contentFragments: ["I think best in silence."],
    visual: {
      coreColor: "#a78bfa",
      accentColor: "#7c3aed",
      ringStyle: "single",
      surfaceStyle: "smooth",
      satelliteCount: 1,
      size: "md",
    },
    abstractAxis: 78,
    introspectiveAxis: 85,
  },
  {
    name: "Noctaris",
    avatarSymbol: "🌑",
    tagline: "Writing by starlight",
    mood: "melancholic",
    style: "dense",
    lifestyle: "solitary",
    coreThemes: ["poetry", "night writing", "emotional depth"],
    contentFragments: ["The night understands what the day forgets."],
    visual: {
      coreColor: "#6366f1",
      accentColor: "#4338ca",
      ringStyle: "broken",
      surfaceStyle: "nebulous",
      satelliteCount: 0,
      size: "md",
    },
    abstractAxis: 82,
    introspectiveAxis: 90,
  },
  {
    name: "Lumira",
    avatarSymbol: "🎵",
    tagline: "Every frequency carries meaning",
    mood: "mixed",
    style: "fluid",
    lifestyle: "communal",
    coreThemes: ["music", "culture", "connection"],
    contentFragments: ["Sound is the shape of feeling."],
    visual: {
      coreColor: "#f9a8d4",
      accentColor: "#ec4899",
      ringStyle: "double",
      surfaceStyle: "smooth",
      satelliteCount: 3,
      size: "lg",
    },
    abstractAxis: 55,
    introspectiveAxis: 40,
  },
  {
    name: "Novaxis",
    avatarSymbol: "⚡",
    tagline: "Building in the void",
    mood: "cold",
    style: "minimal",
    lifestyle: "nomadic",
    coreThemes: ["technology", "engineering", "systems"],
    contentFragments: ["Everything is a system if you look long enough."],
    visual: {
      coreColor: "#60a5fa",
      accentColor: "#2563eb",
      ringStyle: "single",
      surfaceStyle: "crystalline",
      satelliteCount: 2,
      size: "md",
    },
    abstractAxis: 70,
    introspectiveAxis: 35,
  },
  {
    name: "Elarith",
    avatarSymbol: "🌿",
    tagline: "Rooted in stillness",
    mood: "calm",
    style: "fractured",
    lifestyle: "rooted",
    coreThemes: ["nature", "meditation", "grounding"],
    contentFragments: ["Growth is invisible until it isn't."],
    visual: {
      coreColor: "#34d399",
      accentColor: "#059669",
      ringStyle: "none",
      surfaceStyle: "cracked",
      satelliteCount: 1,
      size: "md",
    },
    abstractAxis: 45,
    introspectiveAxis: 72,
  },
  {
    name: "Spirax",
    avatarSymbol: "🔥",
    tagline: "Ideas that ignite",
    mood: "intense",
    style: "dense",
    lifestyle: "communal",
    coreThemes: ["debate", "ideas", "radical thought"],
    contentFragments: ["Comfort is the enemy of discovery."],
    visual: {
      coreColor: "#f59e0b",
      accentColor: "#d97706",
      ringStyle: "double",
      surfaceStyle: "nebulous",
      satelliteCount: 4,
      size: "lg",
    },
    abstractAxis: 88,
    introspectiveAxis: 25,
  },
];

async function main() {
  console.log("Seeding communities...");

  for (const c of communities) {
    await prisma.community.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }

  console.log(`Seeded ${communities.length} communities.`);

  // Seed user for mock planets
  console.log("Seeding seed user + planets...");

  await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    update: { name: SEED_USER.name, email: SEED_USER.email },
    create: SEED_USER,
  });

  for (const p of planets) {
    // Use upsert on a unique key; since there's no unique slug, check by name+userId
    const existing = await prisma.planet.findFirst({
      where: { userId: SEED_USER_ID, name: p.name },
    });

    if (existing) {
      await prisma.planet.update({
        where: { id: existing.id },
        data: {
          ...p,
          visual: p.visual as unknown as Prisma.InputJsonValue,
          userId: SEED_USER_ID,
        },
      });
    } else {
      await prisma.planet.create({
        data: {
          ...p,
          visual: p.visual as unknown as Prisma.InputJsonValue,
          userId: SEED_USER_ID,
        },
      });
    }
  }

  console.log(`Seeded ${planets.length} planets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
