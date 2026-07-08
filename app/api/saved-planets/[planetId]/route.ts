import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// DELETE /api/saved-planets/[planetId] — remove a saved planet (idempotent, always 204)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ planetId: string }> },
) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const { planetId } = await params;

  await prisma.savedPlanet.deleteMany({
    where: { userId: session.user.id, planetId },
  });

  return new Response(null, { status: 204 });
}
