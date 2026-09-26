import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";
import { sendPasswordResetEmail } from "./email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    ...(process.env.SERVER_URL ? [process.env.SERVER_URL] : []),
    'https://appleid.apple.com',
  ],
  emailAndPassword: {
    enabled: true,
    // `url` already points at Better Auth's own /reset-password/:token
    // callback route, which verifies the token then redirects to whatever
    // path was passed as `redirectTo` (app/api/user/password-reset-request
    // sets it to '/reset-password') with `?token=...` appended.
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url)
    },
  },
  // Better Auth's default rate limits (a strict 3 req/10s special rule on
  // /sign-in* and /sign-up*, plus a global 100 req/10s default that covers
  // every other endpoint including /get-session) are exactly right for real
  // users, but test:e2e:db runs ~90 sequential Playwright tests against one
  // shared production server from one loopback IP — both limits get
  // exhausted long before the suite ends (customRules alone only patches the
  // special rule, not the global one, so this disables rate limiting
  // outright rather than raising individual limits). CI only (GitHub Actions
  // sets CI=true) — production keeps the real limits.
  rateLimit: process.env.CI ? { enabled: false } : undefined,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    },
  },
  plugins: [nextCookies()],
});
