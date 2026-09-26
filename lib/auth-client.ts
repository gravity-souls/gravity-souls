import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

// WebKit can resolve a sign-in response before its Set-Cookie has actually
// committed to the cookie jar, so a fetch fired immediately after can still
// read as unauthenticated. Confirming the session directly (and retrying
// briefly) waits on the real condition instead of assuming they're synchronous.
export async function waitForSession(maxAttempts = 3, delayMs = 100): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data } = await authClient.getSession();
    if (data) return true;
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}
