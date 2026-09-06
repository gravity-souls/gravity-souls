import { readJson, safeApiError } from '@/lib/api-input'
import { questionnaireSchema } from '@/lib/input-schemas'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Append a new questionnaire result. QuestionnaireResult is an append-only
// history table — all reads use findFirst + orderBy createdAt desc (latest wins).
export async function POST(request: Request) {
  try {
    let session;
    try {
      session = await requireUser();
    } catch (res) {
      return res as Response;
    }

    const input = await readJson(request, questionnaireSchema)
    if (!input.ok) return input.response
    const body = input.data;
    const { answers, mood, style, lifestyle, abstractAxis, introspectiveAxis } = body;

    const result = await prisma.questionnaireResult.create({
      data: {
        userId: session.user.id,
        answers: answers ?? {},
        mood,
        style,
        lifestyle,
        abstractAxis: abstractAxis ?? 50,
        introspectiveAxis: introspectiveAxis ?? 50,
      },
    });

    return NextResponse.json(result);

  } catch (error) {
    return safeApiError(error)
  }
}

// Get latest questionnaire result
export async function GET() {
  try {
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

  } catch (error) {
    return safeApiError(error)
  }
}
