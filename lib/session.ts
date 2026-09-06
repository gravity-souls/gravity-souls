import { headers } from "next/headers";
import { auth } from "./auth";
import { touchUserActivity } from "./user-activity";
import { safeApiError } from './api-input';

async function readSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    throw safeApiError(error);
  }
}

async function touchActivity(userId: string) {
  try { await touchUserActivity(userId); }
  catch { console.warn('Activity update unavailable'); }
}

export async function requireUser() {
  const session = await readSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  await touchActivity(session.user.id);
  return session;
}

export async function getOptionalUserSession() {
  const session = await readSession();

  if (session) await touchActivity(session.user.id);
  return session;
}
