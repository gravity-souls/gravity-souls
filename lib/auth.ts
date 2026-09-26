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
  // Better Auth's default /sign-in* and /sign-up* rule (3 req/10s per IP) is
  // exactly right for real users, but test:e2e:db runs ~90 sequential
  // Playwright tests against one shared production server from one loopback
  // IP, exhausting it long before the suite ends. Loosen only in CI
  // (GitHub Actions sets CI=true) — production keeps the real limit.
  rateLimit: process.env.CI
    ? {
        customRules: {
          "/sign-in/*": { window: 1, max: 1000 },
          "/sign-up/*": { window: 1, max: 1000 },
        },
      }
    : undefined,
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
