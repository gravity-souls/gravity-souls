import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { grantDailyLoginXP } from "@/lib/grantXP";
import { resolveUserPlanetConfig } from "@/lib/user-planet-config";
import { readJson, safeApiError } from "@/lib/api-input";
import { deleteAccountSchema } from "@/lib/input-schemas";

// Fixed tombstone identity for a self-deleted account (approved: immediate
// deletion, anonymize authorship, keep content — see DELETE below).
const DELETED_NAME = "Deleted Planet";

// Get full user data bundle for current authenticated user
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;

  const [profile, questionnaire, planet, communities, currentUser] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.questionnaireResult.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.planet.findFirst({
      where: { userId, active: true },
    }),
    prisma.communityMembership.findMany({
      where: { userId },
      include: { community: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        language: true,
        planetTexture: true,
        planetTint: true,
        planetAtmoColor: true,
        planetAtmoDensity: true,
        planetHasRing: true,
        planetRingColor: true,
        planetRotationSpeed: true,
        planetCloudOpacity: true,
        planetCustomTexture: true,
        xp: true,
        userLevel: true,
      },
    }),
  ]);

  const dailyXP = await grantDailyLoginXP(userId);

  if (currentUser && dailyXP) {
    currentUser.xp = dailyXP.newXP;
    currentUser.userLevel = dailyXP.newLevel;
  }

  const planetConfig = resolveUserPlanetConfig(currentUser, planet);

  return NextResponse.json({
    user: { ...session.user, ...currentUser, planetConfig },
    profile,
    questionnaire,
    planet,
    communities: communities.map((m: { community: unknown }) => m.community),
    xpEvent: dailyXP,
    leveledUp: dailyXP?.leveledUp ?? false,
  });
}

// DELETE /api/me - self-delete (tombstone) the current account.
//
// Approved shape (founder decisions, immediate/no grace period):
//   - The `user` row is kept but scrubbed (tombstoned), never
//     `prisma.user.delete()`'d — required FKs like DirectMessage.senderId
//     and CommunityPost.authorId would otherwise make this impossible
//     without destroying content that belongs to OTHER people's view of it.
//   - Content visible to others (DirectMessage, Post/PostComment,
//     CommunityPost/Reply/Discussion/DiscussionReply, Event) is left in
//     place and now displays under the tombstone identity.
//   - The user's own private data (sessions, credentials, profile, planets,
//     questionnaires, saved list, follow graph, blocks, memberships, XP
//     history, notification inbox, and their own likes/RSVPs) is actually
//     deleted. Deleting Session/Account is what makes the account
//     unusable — no credential survives to sign back in as this identity.
export async function DELETE(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const input = await readJson(request, deleteAccountSchema);
  if (!input.ok) return input.response;

  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      // --- Own low-value interaction records: delete, and correctly
      // decrement the denormalized counters they contributed to (matching
      // the like/unlike endpoints' pattern in app/api/posts/[id]/like and
      // app/api/posts/[id]/comments/[commentId]/like). CommunityPostLike
      // has no denormalized counter — its "likes" are always a live count().
      const [postLikes, commentLikes] = await Promise.all([
        tx.postLike.findMany({ where: { userId }, select: { postId: true } }),
        tx.postCommentLike.findMany({ where: { userId }, select: { commentId: true } }),
      ]);

      await Promise.all([
        tx.postLike.deleteMany({ where: { userId } }),
        tx.postCommentLike.deleteMany({ where: { userId } }),
        tx.communityPostLike.deleteMany({ where: { userId } }),
        tx.eventRSVP.deleteMany({ where: { userId } }),
      ]);

      await Promise.all(
        postLikes.map((l) =>
          tx.post.update({ where: { id: l.postId }, data: { likeCount: { decrement: 1 } } }),
        ),
      );
      await Promise.all(
        commentLikes.map((l) =>
          tx.postComment.update({ where: { id: l.commentId }, data: { likeCount: { decrement: 1 } } }),
        ),
      );

      // --- Own private data: genuinely deleted, not anonymized.
      await Promise.all([
        tx.session.deleteMany({ where: { userId } }),
        tx.account.deleteMany({ where: { userId } }),
        tx.profile.deleteMany({ where: { userId } }),
        tx.questionnaireResult.deleteMany({ where: { userId } }),
        tx.savedPlanet.deleteMany({ where: { userId } }),
        tx.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
        tx.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
        tx.communityMembership.deleteMany({ where: { userId } }),
        tx.xPEvent.deleteMany({ where: { userId } }),
        tx.notification.deleteMany({ where: { userId } }),
        // A Match pairing is computed data between two people, not content
        // authored by/for the other party — delete like the rest of "my
        // own data" (also cascades automatically once Planet[] is deleted
        // below, since Match.planetAId/planetBId onDelete: Cascade; kept
        // explicit here to match the approved shape precisely).
        tx.match.deleteMany({ where: { OR: [{ userAId: userId }, { userBId: userId }] } }),
      ]);

      // Planet[] deleted last among these: SavedPlanet/Match rows that
      // reference a planet are removed first above (own rows) or cascade
      // automatically (onDelete: Cascade) for any remaining references
      // (e.g. another user's SavedPlanet bookmark of this user's planet —
      // it cannot survive the planet it points to ceasing to exist).
      await tx.planet.deleteMany({ where: { userId } });

      // --- Anonymize authorship on content left in place for others.
      // CommunityDiscussionReply additionally caches a point-in-time
      // `authorName` snapshot that the read path falls back to once the
      // author's active planet is gone (see
      // app/api/communities/[id]/discussions/route.ts's serializeReply) —
      // without scrubbing it too, a deleted user's original display name
      // would leak back in as soon as their Planet[] rows are deleted
      // above. DirectMessage/Post/PostComment/CommunityPost/CommunityPostReply/
      // CommunityDiscussion/Event all resolve authorship live via the
      // `user` relation, so scrubbing `user.name` below is sufficient for
      // them — no other snapshot fields exist on those models.
      await tx.communityDiscussionReply.updateMany({
        where: { authorId: userId },
        data: { authorName: DELETED_NAME },
      });

      // --- Tombstone the user row itself.
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          name: DELETED_NAME,
          image: null,
          planetTexture: "jupiter.jpg",
          planetTint: "#7c4dbf",
          planetAtmoColor: "#b39ddb",
          planetAtmoDensity: 0.12,
          planetHasRing: false,
          planetRingColor: "#9b7de0",
          planetRotationSpeed: 0.018,
          planetCloudOpacity: 0.0,
          planetCustomTexture: null,
          xp: 0,
          userLevel: 1,
          deletedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return safeApiError(error);
  }
}
