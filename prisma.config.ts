import "dotenv/config";
import { defineConfig } from "prisma/config";

// DIRECT_URL is what every local/CI/test environment sets explicitly (see
// lib/database-safety.ts, e2e/environment.ts, .github/workflows/ci.yml) — kept
// as the primary name. DATABASE_URL_UNPOOLED is Neon's own Vercel-integration
// name for the same (non-pooled) connection: falling back to it means
// production doesn't need a manually-duplicated DIRECT_URL copy kept in sync
// by hand whenever the integration rotates credentials, once that integration
// is connected with a blank variable prefix.
const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED;
if (!directUrl) {
  throw new Error("Cannot resolve environment variable: DIRECT_URL or DATABASE_URL_UNPOOLED.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    // Use direct (non-pooled) URL for CLI operations (migrations, seed)
    url: directUrl,
  },
});
