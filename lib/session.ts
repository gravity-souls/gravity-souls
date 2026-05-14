import { headers } from "next/headers";
import { auth } from "./auth";
import { touchUserActivity } from "./user-activity";

export async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  await touchUserActivity(session.user.id);
  return session;
}

export async function getOptionalUserSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) await touchUserActivity(session.user.id);
  return session;
}
