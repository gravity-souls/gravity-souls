-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."community" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT '🌌',
    "tagline" TEXT,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mood" TEXT NOT NULL DEFAULT 'vibrant',
    "accentColor" TEXT NOT NULL DEFAULT '#6366f1',
    "maturity" TEXT NOT NULL DEFAULT 'forming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."community_discussion" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "heat" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."community_discussion_reply" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Unknown',
    "content" TEXT NOT NULL,
    "seedKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_discussion_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."community_membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."community_post" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."community_post_like" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."community_post_reply" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_post_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversation_thread" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."direct_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."match" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "planetAId" TEXT NOT NULL,
    "planetBId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orbitColor" TEXT NOT NULL DEFAULT 'blue',
    "primaryReason" TEXT NOT NULL DEFAULT 'shared-interest',
    "dimensions" JSONB NOT NULL DEFAULT '{}',
    "similarities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "differences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resonanceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."planet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "avatarSymbol" TEXT NOT NULL DEFAULT '🪐',
    "tagline" TEXT,
    "role" TEXT NOT NULL DEFAULT 'explorer',
    "mood" TEXT NOT NULL DEFAULT 'calm',
    "style" TEXT NOT NULL DEFAULT 'minimal',
    "lifestyle" TEXT NOT NULL DEFAULT 'solitary',
    "coreThemes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentFragments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visual" JSONB NOT NULL DEFAULT '{}',
    "abstractAxis" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "introspectiveAxis" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "avatarSymbol" TEXT NOT NULL DEFAULT '🪐',
    "tagline" TEXT,
    "location" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "culturalTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "travelCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "musicTaste" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bookTaste" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filmTaste" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "communicationStyle" TEXT,
    "matchPreference" TEXT DEFAULT 'mixed',
    "activeStatus" TEXT NOT NULL DEFAULT 'active',
    "sbtiType" TEXT,
    "sbtiCn" TEXT,
    "sbtiPattern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questionnaire_result" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "mood" TEXT,
    "style" TEXT,
    "lifestyle" TEXT,
    "abstractAxis" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "introspectiveAxis" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_slug_key" ON "public"."community"("slug" ASC);

-- CreateIndex
CREATE INDEX "community_discussion_authorId_createdAt_idx" ON "public"."community_discussion"("authorId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "community_discussion_communityId_title_key" ON "public"."community_discussion"("communityId" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "community_discussion_communityId_updatedAt_idx" ON "public"."community_discussion"("communityId" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "community_discussion_reply_authorId_createdAt_idx" ON "public"."community_discussion_reply"("authorId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "community_discussion_reply_discussionId_createdAt_idx" ON "public"."community_discussion_reply"("discussionId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "community_discussion_reply_seedKey_key" ON "public"."community_discussion_reply"("seedKey" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "community_membership_userId_communityId_key" ON "public"."community_membership"("userId" ASC, "communityId" ASC);

-- CreateIndex
CREATE INDEX "community_post_authorId_createdAt_idx" ON "public"."community_post"("authorId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "community_post_communityId_createdAt_idx" ON "public"."community_post"("communityId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "community_post_like_postId_userId_key" ON "public"."community_post_like"("postId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "community_post_like_userId_createdAt_idx" ON "public"."community_post_like"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "community_post_reply_authorId_createdAt_idx" ON "public"."community_post_reply"("authorId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "community_post_reply_postId_createdAt_idx" ON "public"."community_post_reply"("postId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_thread_userAId_userBId_key" ON "public"."conversation_thread"("userAId" ASC, "userBId" ASC);

-- CreateIndex
CREATE INDEX "direct_message_conversationId_createdAt_idx" ON "public"."direct_message"("conversationId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "match_planetAId_planetBId_key" ON "public"."match"("planetAId" ASC, "planetBId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "profile_userId_key" ON "public"."profile"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "public"."session"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_discussion" ADD CONSTRAINT "community_discussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_discussion" ADD CONSTRAINT "community_discussion_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_discussion_reply" ADD CONSTRAINT "community_discussion_reply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_discussion_reply" ADD CONSTRAINT "community_discussion_reply_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "public"."community_discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_membership" ADD CONSTRAINT "community_membership_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_membership" ADD CONSTRAINT "community_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_post" ADD CONSTRAINT "community_post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_post" ADD CONSTRAINT "community_post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "public"."community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_post_like" ADD CONSTRAINT "community_post_like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."community_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_post_like" ADD CONSTRAINT "community_post_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_post_reply" ADD CONSTRAINT "community_post_reply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."community_post_reply" ADD CONSTRAINT "community_post_reply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."community_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_thread" ADD CONSTRAINT "conversation_thread_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_thread" ADD CONSTRAINT "conversation_thread_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."direct_message" ADD CONSTRAINT "direct_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."direct_message" ADD CONSTRAINT "direct_message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match" ADD CONSTRAINT "match_planetAId_fkey" FOREIGN KEY ("planetAId") REFERENCES "public"."planet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match" ADD CONSTRAINT "match_planetBId_fkey" FOREIGN KEY ("planetBId") REFERENCES "public"."planet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match" ADD CONSTRAINT "match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match" ADD CONSTRAINT "match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."planet" ADD CONSTRAINT "planet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."profile" ADD CONSTRAINT "profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questionnaire_result" ADD CONSTRAINT "questionnaire_result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
