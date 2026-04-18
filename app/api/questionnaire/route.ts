import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Save or update questionnaire result
export async function POST(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const body = await request.json();
  const { answers, mood, style, lifestyle, abstractAxis, introspectiveAxis } = body;

  const result = await prisma.questionnaireResult.upsert({
    where: {
      id: body.id ?? "",
    },
    create: {
      userId: session.user.id,
      answers: answers ?? {},
      mood,
      style,
      lifestyle,
      abstractAxis: abstractAxis ?? 50,
      introspectiveAxis: introspectiveAxis ?? 50,
    },
    update: {
      answers: answers ?? {},
      mood,
      style,
      lifestyle,
      abstractAxis: abstractAxis ?? 50,
      introspectiveAxis: introspectiveAxis ?? 50,
    },
  });

  return NextResponse.json(result);
}

// Get latest questionnaire result
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const result = await prisma.questionnaireResult.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(result);
}
