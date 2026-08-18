import { desc, eq } from "drizzle-orm";
import { getDb, ensureDbSchema } from "../../../db";
import { submissions } from "../../../db/schema";

interface SubmissionPayload {
  instagram?: string;
  locale?: "ko" | "ja";
  answers?: Record<string, string | number>;
  importance?: Record<string, number>;
  completion?: number;
}

const cleanInstagram = (value: string) => {
  const trimmed = value.trim().replace(/^@+/, "");
  return trimmed ? `@${trimmed}` : "";
};

export async function GET() {
  try {
    await ensureDbSchema();
    const rows = await getDb()
      .select()
      .from(submissions)
      .orderBy(desc(submissions.updatedAt))
      .limit(100);

    return Response.json({
      submissions: rows.map((row) => ({
        id: row.id,
        instagram: row.instagram,
        locale: row.locale,
        answers: JSON.parse(row.answersJson),
        importance: JSON.parse(row.importanceJson),
        completion: row.completion,
        updatedAt: row.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "응답을 불러오지 못했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SubmissionPayload;
    const instagram = cleanInstagram(payload.instagram ?? "");
    if (!/^@[A-Za-z0-9._]{2,30}$/.test(instagram)) {
      return Response.json({ error: "올바른 인스타그램 아이디를 입력해주세요." }, { status: 400 });
    }
    if (!payload.answers || typeof payload.answers !== "object") {
      return Response.json({ error: "설문 응답이 필요합니다." }, { status: 400 });
    }

    await ensureDbSchema();
    const db = getDb();
    const existing = await db
      .select({ id: submissions.id, createdAt: submissions.createdAt })
      .from(submissions)
      .where(eq(submissions.instagram, instagram))
      .limit(1);
    const now = new Date().toISOString();
    const id = existing[0]?.id ?? crypto.randomUUID();

    await db
      .insert(submissions)
      .values({
        id,
        instagram,
        locale: payload.locale === "ja" ? "ja" : "ko",
        intent: String(payload.answers.R001 ?? "UNSURE"),
        country: String(payload.answers.CB001 ?? "OTHER"),
        answersJson: JSON.stringify(payload.answers),
        importanceJson: JSON.stringify(payload.importance ?? {}),
        completion: Math.max(0, Math.min(100, Math.round(payload.completion ?? 0))),
        createdAt: existing[0]?.createdAt ?? now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: submissions.instagram,
        set: {
          locale: payload.locale === "ja" ? "ja" : "ko",
          intent: String(payload.answers.R001 ?? "UNSURE"),
          country: String(payload.answers.CB001 ?? "OTHER"),
          answersJson: JSON.stringify(payload.answers),
          importanceJson: JSON.stringify(payload.importance ?? {}),
          completion: Math.max(0, Math.min(100, Math.round(payload.completion ?? 0))),
          updatedAt: now,
        },
      });

    return Response.json({ id, instagram, saved: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "응답을 저장하지 못했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
