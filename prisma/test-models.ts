/**
 * Prisma model integration test
 * Tests all 12 models: CRUD operations + relations + constraints
 *
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/test-models.ts
 */

import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});
const prisma = new PrismaClient({ adapter });

// Test tracking
let passed = 0;
let failed = 0;
const errors: string[] = [];

function ok(name: string) {
  passed++;
  console.log(`  ✅ ${name}`);
}

function fail(name: string, err: unknown) {
  failed++;
  const msg = err instanceof Error ? err.message : String(err);
  errors.push(`${name}: ${msg}`);
  console.log(`  ❌ ${name} — ${msg}`);
}

// Unique prefix to avoid collisions with real data
const PREFIX = `__test_${Date.now()}`;

// IDs for cleanup
const ids: Record<string, string> = {};

// ─── Tests ───────────────────────────────────────────────────────────────────

async function testUser() {
  console.log("\n🔹 Model: user");

  // CREATE
  try {
    const u = await prisma.user.create({
      data: {
        id: `${PREFIX}_user_a`,
        name: "Test User A",
        email: `${PREFIX}_a@test.local`,
        emailVerified: false,
      },
    });
    ids.userA = u.id;
    ok("CREATE user A");
  } catch (e) { fail("CREATE user A", e); }

  try {
    const u = await prisma.user.create({
      data: {
        id: `${PREFIX}_user_b`,
        name: "Test User B",
        email: `${PREFIX}_b@test.local`,
        emailVerified: false,
      },
    });
    ids.userB = u.id;
    ok("CREATE user B");
  } catch (e) { fail("CREATE user B", e); }

  // READ
  try {
    const u = await prisma.user.findUnique({ where: { id: ids.userA } });
    if (!u || u.name !== "Test User A") throw new Error("User not found or name mismatch");
    ok("READ user by ID");
  } catch (e) { fail("READ user by ID", e); }

  // READ by unique email
  try {
    const u = await prisma.user.findUnique({ where: { email: `${PREFIX}_a@test.local` } });
    if (!u) throw new Error("User not found by email");
    ok("READ user by email (unique)");
  } catch (e) { fail("READ user by email (unique)", e); }

  // UPDATE
  try {
    const u = await prisma.user.update({
      where: { id: ids.userA },
      data: { name: "Test User A (updated)" },
    });
    if (u.name !== "Test User A (updated)") throw new Error("Name not updated");
    ok("UPDATE user");
  } catch (e) { fail("UPDATE user", e); }

  // Unique constraint violation
  try {
    await prisma.user.create({
      data: {
        id: `${PREFIX}_user_dup`,
        name: "Duplicate",
        email: `${PREFIX}_a@test.local`, // same email as user A
        emailVerified: false,
      },
    });
    fail("UNIQUE constraint email", new Error("Should have thrown"));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      ok("UNIQUE constraint email (rejected duplicate)");
    } else {
      fail("UNIQUE constraint email", e);
    }
  }
}

async function testSession() {
  console.log("\n🔹 Model: Session");

  try {
    const s = await prisma.session.create({
      data: {
        id: `${PREFIX}_session`,
        token: `${PREFIX}_token`,
        expiresAt: new Date(Date.now() + 86400000),
        userId: ids.userA,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      },
    });
    ids.session = s.id;
    ok("CREATE session");
  } catch (e) { fail("CREATE session", e); }

  try {
    const s = await prisma.session.findUnique({ where: { id: ids.session } });
    if (!s || s.userId !== ids.userA) throw new Error("Session read failed");
    ok("READ session");
  } catch (e) { fail("READ session", e); }

  // Unique token constraint
  try {
    await prisma.session.create({
      data: {
        id: `${PREFIX}_session_dup`,
        token: `${PREFIX}_token`, // duplicate
        expiresAt: new Date(Date.now() + 86400000),
        userId: ids.userA,
      },
    });
    fail("UNIQUE constraint token", new Error("Should have thrown"));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      ok("UNIQUE constraint session.token (rejected)");
    } else {
      fail("UNIQUE constraint token", e);
    }
  }
}

async function testAccount() {
  console.log("\n🔹 Model: Account");

  try {
    const a = await prisma.account.create({
      data: {
        id: `${PREFIX}_account`,
        accountId: `${PREFIX}_acct`,
        providerId: "credential",
        userId: ids.userA,
        password: "hashed_test_pw",
      },
    });
    ids.account = a.id;
    ok("CREATE account");
  } catch (e) { fail("CREATE account", e); }

  try {
    const a = await prisma.account.findUnique({ where: { id: ids.account } });
    if (!a || a.providerId !== "credential") throw new Error("Account read failed");
    ok("READ account");
  } catch (e) { fail("READ account", e); }
}

async function testVerification() {
  console.log("\n🔹 Model: Verification");

  try {
    const v = await prisma.verification.create({
      data: {
        id: `${PREFIX}_verif`,
        identifier: `${PREFIX}_a@test.local`,
        value: "123456",
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    ids.verification = v.id;
    ok("CREATE verification");
  } catch (e) { fail("CREATE verification", e); }

  try {
    const v = await prisma.verification.findUnique({ where: { id: ids.verification } });
    if (!v || v.value !== "123456") throw new Error("Verification read failed");
    ok("READ verification");
  } catch (e) { fail("READ verification", e); }
}

async function testProfile() {
  console.log("\n🔹 Model: Profile");

  try {
    const p = await prisma.profile.create({
      data: {
        userId: ids.userA,
        name: "Test Planet Name",
        avatarSymbol: "🧪",
        tagline: "Testing all the things",
        location: "Test City",
        languages: ["en", "fr"],
        culturalTags: ["test"],
        sbtiType: "Explorer",
        sbtiCn: "XI",
        sbtiPattern: "Spiral",
        matchPreference: "mixed",
      },
    });
    ids.profile = p.id;
    ok("CREATE profile");
  } catch (e) { fail("CREATE profile", e); }

  // Unique userId constraint
  try {
    await prisma.profile.create({
      data: { userId: ids.userA, name: "Dupe" },
    });
    fail("UNIQUE constraint profile.userId", new Error("Should have thrown"));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      ok("UNIQUE constraint profile.userId (rejected)");
    } else {
      fail("UNIQUE constraint profile.userId", e);
    }
  }

  // READ with relation
  try {
    const u = await prisma.user.findUnique({
      where: { id: ids.userA },
      include: { profile: true },
    });
    if (!u?.profile || u.profile.sbtiType !== "Explorer") throw new Error("Profile relation failed");
    ok("READ user→profile relation");
  } catch (e) { fail("READ user→profile relation", e); }

  // UPDATE
  try {
    await prisma.profile.update({
      where: { userId: ids.userA },
      data: { tagline: "Updated tagline" },
    });
    ok("UPDATE profile");
  } catch (e) { fail("UPDATE profile", e); }
}

async function testQuestionnaireResult() {
  console.log("\n🔹 Model: QuestionnaireResult");

  try {
    const q = await prisma.questionnaireResult.create({
      data: {
        userId: ids.userA,
        answers: { q1: "a", q2: "b", q3: "c" },
        mood: "calm",
        style: "minimal",
        lifestyle: "solitary",
        abstractAxis: 72.5,
        introspectiveAxis: 88.3,
      },
    });
    ids.questionnaire = q.id;
    ok("CREATE questionnaireResult");
  } catch (e) { fail("CREATE questionnaireResult", e); }

  try {
    const q = await prisma.questionnaireResult.findFirst({
      where: { userId: ids.userA },
      orderBy: { createdAt: "desc" },
    });
    if (!q || q.mood !== "calm") throw new Error("Questionnaire read failed");
    if (q.abstractAxis !== 72.5) throw new Error(`abstractAxis mismatch: ${q.abstractAxis}`);
    ok("READ questionnaireResult (findFirst + orderBy)");
  } catch (e) { fail("READ questionnaireResult", e); }

  // JSON answers field
  try {
    const q = await prisma.questionnaireResult.findUnique({ where: { id: ids.questionnaire } });
    const answers = q?.answers as Record<string, string>;
    if (answers.q1 !== "a") throw new Error("JSON answers field mismatch");
    ok("READ questionnaireResult.answers (JSON)");
  } catch (e) { fail("READ questionnaireResult.answers (JSON)", e); }
}

async function testPlanet() {
  console.log("\n🔹 Model: Planet");

  try {
    const p = await prisma.planet.create({
      data: {
        userId: ids.userA,
        name: "TestPlanet-Alpha",
        avatarSymbol: "🧪",
        tagline: "A test planet",
        mood: "calm",
        style: "minimal",
        lifestyle: "solitary",
        coreThemes: ["test", "automation"],
        contentFragments: ["Test fragment"],
        visual: {
          coreColor: "#a78bfa",
          accentColor: "#7c3aed",
          ringStyle: "single",
          surfaceStyle: "smooth",
          satelliteCount: 1,
          size: "md",
        },
        abstractAxis: 60,
        introspectiveAxis: 75,
        active: true,
      },
    });
    ids.planetA = p.id;
    ok("CREATE planet A");
  } catch (e) { fail("CREATE planet A", e); }

  try {
    const p = await prisma.planet.create({
      data: {
        userId: ids.userB,
        name: "TestPlanet-Beta",
        avatarSymbol: "🔬",
        mood: "intense",
        style: "dense",
        lifestyle: "communal",
        coreThemes: ["science"],
        visual: { coreColor: "#60a5fa", accentColor: "#2563eb", ringStyle: "none", surfaceStyle: "crystalline", satelliteCount: 0, size: "sm" },
        abstractAxis: 40,
        introspectiveAxis: 55,
        active: true,
      },
    });
    ids.planetB = p.id;
    ok("CREATE planet B");
  } catch (e) { fail("CREATE planet B", e); }

  // READ with visual JSON
  try {
    const p = await prisma.planet.findUnique({ where: { id: ids.planetA } });
    const v = p?.visual as Record<string, unknown>;
    if (v.coreColor !== "#a78bfa") throw new Error("Visual JSON mismatch");
    ok("READ planet.visual (JSON)");
  } catch (e) { fail("READ planet.visual (JSON)", e); }

  // findMany active
  try {
    const planets = await prisma.planet.findMany({
      where: { active: true, userId: ids.userA },
    });
    if (planets.length < 1) throw new Error("No active planets found");
    ok("READ findMany active planets");
  } catch (e) { fail("READ findMany active planets", e); }

  // Deactivate pattern (used by API)
  try {
    await prisma.planet.updateMany({
      where: { userId: ids.userA, active: true },
      data: { active: false },
    });
    const p = await prisma.planet.findUnique({ where: { id: ids.planetA } });
    if (p?.active !== false) throw new Error("Deactivation failed");
    // Re-activate for later tests
    await prisma.planet.update({ where: { id: ids.planetA }, data: { active: true } });
    ok("UPDATE deactivate/reactivate pattern");
  } catch (e) { fail("UPDATE deactivate/reactivate pattern", e); }

  // Include user relation
  try {
    const p = await prisma.planet.findUnique({
      where: { id: ids.planetA },
      include: { user: { include: { profile: true } } },
    });
    if (!p?.user || p.user.name !== "Test User A (updated)") throw new Error("Planet→user relation failed");
    ok("READ planet→user→profile relation");
  } catch (e) { fail("READ planet→user→profile relation", e); }
}

async function testMatch() {
  console.log("\n🔹 Model: Match");

  try {
    const m = await prisma.match.create({
      data: {
        userAId: ids.userA,
        userBId: ids.userB,
        planetAId: ids.planetA,
        planetBId: ids.planetB,
        score: 0.87,
        orbitColor: "purple",
        primaryReason: "shared-themes",
        dimensions: { intellectual: 0.9, emotional: 0.7, cultural: 0.85 },
        similarities: ["philosophy", "solitude"],
        differences: ["social-style"],
        resonanceNote: "Deep thinkers aligned",
      },
    });
    ids.match = m.id;
    ok("CREATE match");
  } catch (e) { fail("CREATE match", e); }

  // Unique constraint on [planetAId, planetBId]
  try {
    await prisma.match.create({
      data: {
        userAId: ids.userA,
        userBId: ids.userB,
        planetAId: ids.planetA,
        planetBId: ids.planetB,
        score: 0.5,
      },
    });
    fail("UNIQUE constraint [planetAId, planetBId]", new Error("Should have thrown"));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      ok("UNIQUE constraint [planetAId, planetBId] (rejected)");
    } else {
      fail("UNIQUE constraint [planetAId, planetBId]", e);
    }
  }

  // READ with relations
  try {
    const m = await prisma.match.findUnique({
      where: { id: ids.match },
      include: { userA: true, userB: true, planetA: true, planetB: true },
    });
    if (!m?.userA || !m?.planetB) throw new Error("Match relations missing");
    if (m.score !== 0.87) throw new Error(`Score mismatch: ${m.score}`);
    ok("READ match with all relations");
  } catch (e) { fail("READ match with all relations", e); }

  // READ JSON dimensions
  try {
    const m = await prisma.match.findUnique({ where: { id: ids.match } });
    const dims = m?.dimensions as Record<string, number>;
    if (dims.intellectual !== 0.9) throw new Error("Dimensions JSON mismatch");
    ok("READ match.dimensions (JSON)");
  } catch (e) { fail("READ match.dimensions (JSON)", e); }
}

async function testCommunity() {
  console.log("\n🔹 Model: Community");

  try {
    const c = await prisma.community.create({
      data: {
        slug: `${PREFIX}-test-community`,
        name: "Test Community",
        symbol: "🧫",
        tagline: "For testing purposes",
        description: "A community created by the test suite",
        keywords: ["test", "ci"],
        mood: "technical",
        accentColor: "#06b6d4",
        maturity: "forming",
      },
    });
    ids.community = c.id;
    ok("CREATE community");
  } catch (e) { fail("CREATE community", e); }

  // Unique slug
  try {
    await prisma.community.create({
      data: {
        slug: `${PREFIX}-test-community`,
        name: "Dupe Community",
      },
    });
    fail("UNIQUE constraint community.slug", new Error("Should have thrown"));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      ok("UNIQUE constraint community.slug (rejected)");
    } else {
      fail("UNIQUE constraint community.slug", e);
    }
  }

  // READ
  try {
    const c = await prisma.community.findUnique({ where: { slug: `${PREFIX}-test-community` } });
    if (!c || c.name !== "Test Community") throw new Error("Community read failed");
    ok("READ community by slug");
  } catch (e) { fail("READ community by slug", e); }
}

async function testCommunityMembership() {
  console.log("\n🔹 Model: CommunityMembership");

  try {
    const m = await prisma.communityMembership.create({
      data: {
        userId: ids.userA,
        communityId: ids.community,
      },
    });
    ids.membership = m.id;
    ok("CREATE membership");
  } catch (e) { fail("CREATE membership", e); }

  // Unique [userId, communityId]
  try {
    await prisma.communityMembership.upsert({
      where: {
        userId_communityId: {
          userId: ids.userA,
          communityId: ids.community,
        },
      },
      update: {},
      create: {
        userId: ids.userA,
        communityId: ids.community,
      },
    });
    ok("UPSERT membership (idempotent join)");
  } catch (e) { fail("UPSERT membership (idempotent)", e); }

  // Count members
  try {
    const count = await prisma.communityMembership.count({
      where: { communityId: ids.community },
    });
    if (count !== 1) throw new Error(`Expected 1 member, got ${count}`);
    ok("COUNT community members");
  } catch (e) { fail("COUNT community members", e); }

  // Include community relation
  try {
    const m = await prisma.communityMembership.findUnique({
      where: { id: ids.membership },
      include: { community: true, user: true },
    });
    if (!m?.community || m.community.name !== "Test Community") throw new Error("Membership→community failed");
    ok("READ membership→community relation");
  } catch (e) { fail("READ membership→community relation", e); }
}

async function testConversationThread() {
  console.log("\n🔹 Model: ConversationThread");

  // Sort user IDs (matches API pattern)
  const [uA, uB] = [ids.userA, ids.userB].sort();

  try {
    const c = await prisma.conversationThread.create({
      data: {
        userAId: uA,
        userBId: uB,
      },
    });
    ids.conversation = c.id;
    ok("CREATE conversationThread");
  } catch (e) { fail("CREATE conversationThread", e); }

  // Unique [userAId, userBId]
  try {
    await prisma.conversationThread.create({
      data: { userAId: uA, userBId: uB },
    });
    fail("UNIQUE constraint [userAId, userBId]", new Error("Should have thrown"));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      ok("UNIQUE constraint [userAId, userBId] (rejected)");
    } else {
      fail("UNIQUE constraint [userAId, userBId]", e);
    }
  }

  // Upsert pattern (matches API)
  try {
    const c = await prisma.conversationThread.upsert({
      where: { userAId_userBId: { userAId: uA, userBId: uB } },
      update: {},
      create: { userAId: uA, userBId: uB },
    });
    if (c.id !== ids.conversation) throw new Error("Upsert created new instead of reusing");
    ok("UPSERT conversationThread (idempotent)");
  } catch (e) { fail("UPSERT conversationThread", e); }
}

async function testDirectMessage() {
  console.log("\n🔹 Model: DirectMessage");

  try {
    const m = await prisma.directMessage.create({
      data: {
        conversationId: ids.conversation,
        senderId: ids.userA,
        content: "Hello from test!",
        type: "text",
      },
    });
    ids.messageA = m.id;
    ok("CREATE directMessage (msg 1)");
  } catch (e) { fail("CREATE directMessage (msg 1)", e); }

  try {
    const m = await prisma.directMessage.create({
      data: {
        conversationId: ids.conversation,
        senderId: ids.userB,
        content: "Reply from B",
        type: "text",
      },
    });
    ids.messageB = m.id;
    ok("CREATE directMessage (msg 2)");
  } catch (e) { fail("CREATE directMessage (msg 2)", e); }

  // Read messages ordered
  try {
    const msgs = await prisma.directMessage.findMany({
      where: { conversationId: ids.conversation },
      orderBy: { createdAt: "asc" },
    });
    if (msgs.length !== 2) throw new Error(`Expected 2 messages, got ${msgs.length}`);
    if (msgs[0].content !== "Hello from test!") throw new Error("Message order wrong");
    ok("READ messages (ordered by createdAt)");
  } catch (e) { fail("READ messages (ordered)", e); }

  // Update lastMessageAt on conversation
  try {
    await prisma.conversationThread.update({
      where: { id: ids.conversation },
      data: { lastMessageAt: new Date() },
    });
    ok("UPDATE conversationThread.lastMessageAt");
  } catch (e) { fail("UPDATE conversationThread.lastMessageAt", e); }

  // Mark as read
  try {
    await prisma.directMessage.update({
      where: { id: ids.messageA },
      data: { readAt: new Date() },
    });
    const m = await prisma.directMessage.findUnique({ where: { id: ids.messageA } });
    if (!m?.readAt) throw new Error("readAt not set");
    ok("UPDATE directMessage.readAt (mark as read)");
  } catch (e) { fail("UPDATE directMessage.readAt", e); }

  // Count unread
  try {
    const unread = await prisma.directMessage.count({
      where: {
        conversationId: ids.conversation,
        readAt: null,
        senderId: { not: ids.userA },
      },
    });
    if (unread !== 1) throw new Error(`Expected 1 unread, got ${unread}`);
    ok("COUNT unread messages");
  } catch (e) { fail("COUNT unread messages", e); }

  // Include sender relation
  try {
    const m = await prisma.directMessage.findUnique({
      where: { id: ids.messageA },
      include: { sender: true },
    });
    if (!m?.sender || m.sender.id !== ids.userA) throw new Error("Message→sender relation failed");
    ok("READ message→sender relation");
  } catch (e) { fail("READ message→sender relation", e); }
}

async function testCascadeDelete() {
  console.log("\n🔹 CASCADE DELETE");

  // Deleting userA should cascade to: sessions, accounts, profile, questionnaires,
  // planets, matches, memberships, conversations, messages
  try {
    await prisma.user.delete({ where: { id: ids.userA } });
    ok("DELETE user A (cascade)");
  } catch (e) { fail("DELETE user A (cascade)", e); }

  // Verify cascades
  try {
    const session = await prisma.session.findUnique({ where: { id: ids.session } });
    if (session) throw new Error("Session not cascaded");
    ok("CASCADE → session deleted");
  } catch (e) { fail("CASCADE → session", e); }

  try {
    const account = await prisma.account.findUnique({ where: { id: ids.account } });
    if (account) throw new Error("Account not cascaded");
    ok("CASCADE → account deleted");
  } catch (e) { fail("CASCADE → account", e); }

  try {
    const profile = await prisma.profile.findUnique({ where: { id: ids.profile } });
    if (profile) throw new Error("Profile not cascaded");
    ok("CASCADE → profile deleted");
  } catch (e) { fail("CASCADE → profile", e); }

  try {
    const q = await prisma.questionnaireResult.findUnique({ where: { id: ids.questionnaire } });
    if (q) throw new Error("Questionnaire not cascaded");
    ok("CASCADE → questionnaireResult deleted");
  } catch (e) { fail("CASCADE → questionnaireResult", e); }

  try {
    const p = await prisma.planet.findUnique({ where: { id: ids.planetA } });
    if (p) throw new Error("Planet A not cascaded");
    ok("CASCADE → planet deleted");
  } catch (e) { fail("CASCADE → planet", e); }

  try {
    const m = await prisma.match.findUnique({ where: { id: ids.match } });
    if (m) throw new Error("Match not cascaded");
    ok("CASCADE → match deleted");
  } catch (e) { fail("CASCADE → match", e); }

  try {
    const m = await prisma.communityMembership.findUnique({ where: { id: ids.membership } });
    if (m) throw new Error("Membership not cascaded");
    ok("CASCADE → communityMembership deleted");
  } catch (e) { fail("CASCADE → communityMembership", e); }

  try {
    const msg = await prisma.directMessage.findUnique({ where: { id: ids.messageA } });
    if (msg) throw new Error("Message not cascaded");
    ok("CASCADE → directMessage deleted");
  } catch (e) { fail("CASCADE → directMessage", e); }
}

// ─── Cleanup & Run ───────────────────────────────────────────────────────────

async function cleanup() {
  console.log("\n🧹 Cleaning up test data...");

  // Delete remaining test data that might not have been cascade-deleted
  try { await prisma.directMessage.deleteMany({ where: { id: { in: [ids.messageA, ids.messageB].filter(Boolean) } } }); } catch {}
  try { await prisma.conversationThread.deleteMany({ where: { id: ids.conversation } }); } catch {}
  try { await prisma.match.deleteMany({ where: { id: ids.match } }); } catch {}
  try { await prisma.communityMembership.deleteMany({ where: { id: ids.membership } }); } catch {}
  try { await prisma.planet.deleteMany({ where: { id: { in: [ids.planetA, ids.planetB].filter(Boolean) } } }); } catch {}
  try { await prisma.questionnaireResult.deleteMany({ where: { id: ids.questionnaire } }); } catch {}
  try { await prisma.profile.deleteMany({ where: { id: ids.profile } }); } catch {}
  try { await prisma.account.deleteMany({ where: { id: ids.account } }); } catch {}
  try { await prisma.session.deleteMany({ where: { id: ids.session } }); } catch {}
  try { await prisma.verification.deleteMany({ where: { id: ids.verification } }); } catch {}
  try { await prisma.community.deleteMany({ where: { id: ids.community } }); } catch {}
  try { await prisma.user.deleteMany({ where: { id: { in: [ids.userA, ids.userB].filter(Boolean) } } }); } catch {}

  console.log("  Done.");
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Prisma Model Integration Tests          ║");
  console.log("║  Database: Neon PostgreSQL                ║");
  console.log("╚══════════════════════════════════════════╝");

  try {
    await testUser();
    await testSession();
    await testAccount();
    await testVerification();
    await testProfile();
    await testQuestionnaireResult();
    await testPlanet();
    await testMatch();
    await testCommunity();
    await testCommunityMembership();
    await testConversationThread();
    await testDirectMessage();
    await testCascadeDelete();
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log("\n══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (errors.length) {
    console.log("\n  Failures:");
    errors.forEach((e) => console.log(`    • ${e}`));
  }
  console.log("══════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
