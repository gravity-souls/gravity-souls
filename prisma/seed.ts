import { EventCategory, EventStatus, PrismaClient, Prisma } from "@prisma/client";
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

const seededEvents = [
  {
    id: "seed-event-deep-thinkers-reading-circle",
    galaxySlug: "deep-thinkers",
    title: "Slow Reading Circle: Notes from the Underground",
    description: "A quiet discussion for readers who enjoy difficult questions, marginal notes, and generous pauses.",
    dayOffset: 6,
    hour: 20,
    minute: 0,
    location: "Librairie Tropismes, Brussels",
    maxAttendees: 18,
    category: EventCategory.DISCUSSION,
    status: EventStatus.APPROVED,
  },
  {
    id: "seed-event-creative-nebula-showcase",
    galaxySlug: "creative-nebula",
    title: "Tiny Works Showcase",
    description: "Bring one unfinished sketch, song loop, poem, photo set, or strange little experiment for a gentle peer showcase.",
    dayOffset: 13,
    hour: 18,
    minute: 30,
    location: "Atelier Volta, Paris",
    maxAttendees: 28,
    category: EventCategory.MEETUP,
    status: EventStatus.APPROVED,
  },
  {
    id: "seed-event-tech-forge-open-source-night",
    galaxySlug: "tech-forge",
    title: "Open Source Night Shift",
    description: "A focused build session for maintainers, first-time contributors, and anyone who wants to ship a small useful patch.",
    dayOffset: 21,
    hour: 19,
    minute: 0,
    onlineUrl: "https://meet.gravitysouls.dev/open-source-night",
    maxAttendees: 40,
    category: EventCategory.ONLINE,
    status: EventStatus.APPROVED,
  },
  {
    id: "seed-event-nomadic-stars-coffee-walk",
    galaxySlug: "nomadic-stars",
    title: "Lisbon Coffee Walk",
    description: "A relaxed route through three small cafes, with map swaps, language tips, and stories from recent arrivals.",
    dayOffset: 31,
    hour: 10,
    minute: 30,
    location: "Praca das Flores, Lisbon",
    maxAttendees: 16,
    category: EventCategory.MEETUP,
    status: EventStatus.APPROVED,
  },
  {
    id: "seed-event-quiet-orbits-night-sky",
    galaxySlug: "quiet-orbits",
    title: "Night Sky Listening Session",
    description: "A low-pressure evening outside the city with warm drinks, ambient playlists, and room for comfortable silence.",
    dayOffset: -9,
    hour: 22,
    minute: 0,
    location: "Foret de Soignes, Brussels",
    maxAttendees: 14,
    category: EventCategory.STARGAZING,
    status: EventStatus.PASSED,
  },
  {
    id: "seed-event-creative-nebula-zine-table",
    galaxySlug: "creative-nebula",
    title: "Zine Table and Print Swap",
    description: "A hands-on afternoon of folding, cutting, trading prints, and turning half-formed ideas into pocket-sized artifacts.",
    dayOffset: -18,
    hour: 15,
    minute: 0,
    location: "Le Signe, Paris",
    maxAttendees: 22,
    category: EventCategory.WORKSHOP,
    status: EventStatus.PASSED,
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

function makeSeedEventDate(dayOffset: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

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
  // Seed user for mock planets and community ownership
  console.log("Seeding seed user...");

  await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    update: { name: SEED_USER.name, email: SEED_USER.email },
    create: SEED_USER,
  });

  console.log("Seeding communities...");

  const communityBySlug = new Map<string, { id: string; name: string }>();

  for (const communitySeed of communities) {
    const community = await prisma.community.upsert({
      where: { slug: communitySeed.slug },
      update: { ...communitySeed, creatorId: SEED_USER_ID },
      create: { ...communitySeed, creatorId: SEED_USER_ID },
    });

    communityBySlug.set(community.slug, { id: community.id, name: community.name });

    await prisma.communityMembership.upsert({
      where: { userId_communityId: { userId: SEED_USER_ID, communityId: community.id } },
      update: { role: "ADMIN" },
      create: { userId: SEED_USER_ID, communityId: community.id, role: "ADMIN" },
    });
  }

  console.log(`Seeded ${communities.length} communities.`);

  console.log("Seeding galaxy events...");

  for (const eventSeed of seededEvents) {
    const community = communityBySlug.get(eventSeed.galaxySlug);

    if (!community) {
      throw new Error(`Missing community for event seed: ${eventSeed.galaxySlug}`);
    }

    const eventDate = makeSeedEventDate(eventSeed.dayOffset, eventSeed.hour, eventSeed.minute);
    const event = await prisma.event.upsert({
      where: { id: eventSeed.id },
      update: {
        galaxyId: community.id,
        proposerId: SEED_USER_ID,
        title: eventSeed.title,
        description: eventSeed.description,
        date: eventDate,
        location: eventSeed.location ?? null,
        onlineUrl: eventSeed.onlineUrl ?? null,
        maxAttendees: eventSeed.maxAttendees,
        category: eventSeed.category,
        status: eventSeed.status,
      },
      create: {
        id: eventSeed.id,
        galaxyId: community.id,
        proposerId: SEED_USER_ID,
        title: eventSeed.title,
        description: eventSeed.description,
        date: eventDate,
        location: eventSeed.location ?? null,
        onlineUrl: eventSeed.onlineUrl ?? null,
        maxAttendees: eventSeed.maxAttendees,
        category: eventSeed.category,
        status: eventSeed.status,
      },
    });

    await prisma.eventRSVP.upsert({
      where: { eventId_userId: { eventId: event.id, userId: SEED_USER_ID } },
      update: {},
      create: { eventId: event.id, userId: SEED_USER_ID },
    });
  }

  console.log(`Seeded ${seededEvents.length} galaxy events.`);

  // Seed user for mock planets
  console.log("Seeding seed user + planets...");

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
