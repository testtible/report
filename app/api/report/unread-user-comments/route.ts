import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getDateRange, getEditableDateKeys } from "@/app/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const editableKeys = getEditableDateKeys();
    if (editableKeys.length === 0) {
      return NextResponse.json({ unreadUserComments: [] });
    }

    const oldestKey = editableKeys[editableKeys.length - 1];
    const newestKey = editableKeys[0];
    const { start } = getDateRange(oldestKey);
    const { end } = getDateRange(newestKey);

    const rows = await prisma.content.findMany({
      where: {
        created_at: { gte: start, lte: end },
        user_comment: { not: null },
        is_user_comment: false,
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        username: true,
        created_at: true,
        content: true,
        user_comment: true,
        master_comment: true,
        is_confirm_master_comment: true,
        is_user_comment: true,
      },
    });

    // user_comment가 빈 문자열이 아닌 유효한 코멘트만 필터링
    const unreadUserComments = rows
      .filter((r) => r.user_comment && r.user_comment.trim() !== "")
      .map((r) => ({
        id: r.id.toString(),
        username: r.username,
        date: r.created_at.toISOString().slice(0, 10),
        reportContent: r.content ?? "",
        userComment: r.user_comment as string,
        masterComment: r.master_comment ?? null,
        isConfirmMasterComment: r.is_confirm_master_comment,
        isUserComment: r.is_user_comment,
      }));

    return NextResponse.json({ unreadUserComments });
  } catch (error) {
    console.error("Get unread user comments error:", error);
    return NextResponse.json(
      { error: "미확인 팀원 요청 코멘트 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
