import { PrismaClient } from "@prisma/client";
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
