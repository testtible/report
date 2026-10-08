import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getDateRange, getEditableDateKeys } from "@/app/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json(
        { error: "팀원 이름(username)이 필요합니다." },
        { status: 400 },
      );
    }

    const editableKeys = getEditableDateKeys();
    if (editableKeys.length === 0) {
      return NextResponse.json({ unreadComments: [] });
    }

    const oldestKey = editableKeys[editableKeys.length - 1];
    const newestKey = editableKeys[0];
    const { start } = getDateRange(oldestKey);
    const { end } = getDateRange(newestKey);

    const rows = await prisma.content.findMany({
      where: {
        username,
        created_at: { gte: start, lte: end },
        master_comment: { not: null },
        is_confirm_master_comment: false,
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        username: true,
        created_at: true,
        master_comment: true,
        is_confirm_master_comment: true,
        user_comment: true,
        is_user_comment: true,
      },
    });

    // master_comment가 빈 문자열이 아닌 유효한 코멘트만 필터링
    const unreadComments = rows
      .filter((r) => r.master_comment && r.master_comment.trim() !== "")
      .map((r) => ({
        id: r.id.toString(),
        username: r.username,
        date: r.created_at.toISOString().slice(0, 10),
        masterComment: r.master_comment as string,
        isConfirmMasterComment: r.is_confirm_master_comment,
        userComment: r.user_comment ?? null,
        isUserComment: r.is_user_comment,
      }));

    return NextResponse.json({ unreadComments });
  } catch (error) {
    console.error("Get unread master comments error:", error);
    return NextResponse.json(
      { error: "미확인 관리자 코멘트 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
