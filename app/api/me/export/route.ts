import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { safeApiError } from "@/lib/api-input";

// GET /api/me/export - instant self-serve data export (approved: on-demand
// generation, no manual fulfillment step). Returns everything about the
// current user as a downloadable JSON file.
//
// Explicitly excluded (credential material, not "their data" in the export
// sense): Account.password/accessToken/refreshToken/idToken, Session.token.
// Explicitly minimized (never resolved to another person's name/email, to
// avoid leaking a non-consenting user's PII into this export): Follows,
// and Blocks — which, per the Block model's governing invariant in
// prisma/schema.prisma ("never disclosed to the blocked user"), includes
// only blocks THIS user made, never who blocked them (mirrors GET
// /api/blocks's "never discloses who blocked me" convention).
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;

  try {
    const [
      user,
      sessions,
      accounts,
      profile,
      planets,
      questionnaireResults,
      savedPlanets,
      following,
      followers,
      blocksMade,
      notifications,
      xpEvents,
      posts,
      postComments,
      postLikes,
      postCommentLikes,
      communityPosts,
      communityPostReplies,
      communityPostLikes,
      communityDiscussions,
      communityDiscussionReplies,
      communityMemberships,
      matchesA,
      matchesB,
      reportsFiled,
      proposedEvents,
      eventRSVPs,
      conversations,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, emailVerified: true, image: true, language: true,
          planetTexture: true, planetTint: true, planetAtmoColor: true, planetAtmoDensity: true,
          planetHasRing: true, planetRingColor: true, planetRotationSpeed: true, planetCloudOpacity: true,
          planetCustomTexture: true, xp: true, userLevel: true, lastActiveAt: true, createdAt: true,
          updatedAt: true, deletedAt: true,
        },
      }),
      prisma.session.findMany({
        where: { userId },
        select: { id: true, createdAt: true, updatedAt: true, expiresAt: true, ipAddress: true, userAgent: true },
      }),
      prisma.account.findMany({
        where: { userId },
        select: { id: true, providerId: true, accountId: true, createdAt: true, updatedAt: true },
      }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.planet.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.questionnaireResult.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.savedPlanet.findMany({ where: { userId }, orderBy: { savedAt: "asc" } }),
      prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
      prisma.follow.findMany({ where: { followingId: userId }, select: { followerId: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
      prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.xPEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.post.findMany({ where: { authorId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.postComment.findMany({ where: { authorId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.postLike.findMany({ where: { userId }, select: { postId: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
      prisma.postCommentLike.findMany({ where: { userId }, select: { commentId: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
      prisma.communityPost.findMany({ where: { authorId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.communityPostReply.findMany({ where: { authorId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.communityPostLike.findMany({ where: { userId }, select: { postId: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
      prisma.communityDiscussion.findMany({ where: { authorId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.communityDiscussionReply.findMany({ where: { authorId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.communityMembership.findMany({ where: { userId }, select: { communityId: true, role: true, joinedAt: true }, orderBy: { joinedAt: "asc" } }),
      prisma.match.findMany({ where: { userAId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.match.findMany({ where: { userBId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.report.findMany({ where: { reporterId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.event.findMany({ where: { proposerId: userId }, orderBy: { createdAt: "asc" } }),
      prisma.eventRSVP.findMany({ where: { userId }, select: { eventId: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
      prisma.conversationThread.findMany({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
        orderBy: { createdAt: "asc" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      }),
    ]);

    if (!user) return Response.json({ error: "Not found" }, { status: 404 });

    // Minimal — id only, per prisma/schema.prisma's Match comment ("a follow
    // never overrides visibility" / matches are not the other party's profile).
    const matches = [
      ...matchesA.map((m) => ({
        id: m.id, myPlanetId: m.planetAId, otherUserId: m.userBId, otherPlanetId: m.planetBId,
        score: m.score, primaryReason: m.primaryReason, dimensions: m.dimensions,
        similarities: m.similarities, differences: m.differences, resonanceNote: m.resonanceNote,
        createdAt: m.createdAt,
      })),
      ...matchesB.map((m) => ({
        id: m.id, myPlanetId: m.planetBId, otherUserId: m.userAId, otherPlanetId: m.planetAId,
        score: m.score, primaryReason: m.primaryReason, dimensions: m.dimensions,
        similarities: m.similarities, differences: m.differences, resonanceNote: m.resonanceNote,
        createdAt: m.createdAt,
      })),
    ];

    const directMessages = conversations.map((c) => ({
      conversationId: c.id,
      otherUserId: c.userAId === userId ? c.userBId : c.userAId,
      createdAt: c.createdAt,
      lastMessageAt: c.lastMessageAt,
      messages: c.messages.map((m) => ({
        id: m.id, senderId: m.senderId, content: m.content, type: m.type,
        readAt: m.readAt, createdAt: m.createdAt,
      })),
    }));

    const payload = {
      exportedAt: new Date().toISOString(),
      account: user,
      sessions,
      linkedAccounts: accounts,
      profile,
      planets,
      questionnaireResults,
      savedPlanets,
      follows: {
        following: following.map((f) => ({ userId: f.followingId, since: f.createdAt })),
        followers: followers.map((f) => ({ userId: f.followerId, since: f.createdAt })),
      },
      blocks: blocksMade.map((b) => ({ userId: b.blockedId, since: b.createdAt })),
      notifications,
      xpEvents,
      posts,
      postComments,
      postLikes,
      postCommentLikes,
      communityPosts,
      communityPostReplies,
      communityPostLikes,
      communityDiscussions,
      communityDiscussionReplies,
      communityMemberships,
      matches,
      reportsFiled,
      proposedEvents,
      eventRSVPs,
      directMessages,
    };

    const filename = `gravitysouls-data-export-${userId}.json`;
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return safeApiError(error);
  }
}
