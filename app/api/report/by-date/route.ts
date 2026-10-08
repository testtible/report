import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getDateRange, isValidDateKey, getTodayKey } from "@/app/lib/dates";
import type { MemberReport } from "@/app/lib/attachments";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const selectedDate =
      dateParam && isValidDateKey(dateParam) ? dateParam : getTodayKey();
    const { start, end } = getDateRange(selectedDate);

    const reports = await prisma.$queryRaw<
      {
        id: bigint;
        username: string;
        content: string | null;
        attachment_name: string | null;
        attachment_size: number | null;
        master_comment: string | null;
        is_confirm_master_comment: boolean;
        user_id: bigint | null;
        user_comment: string | null;
        is_user_comment: boolean;
      }[]
    >`
      SELECT id, username, content, attachment_name, attachment_size, master_comment, is_confirm_master_comment, user_id, user_comment, is_user_comment
      FROM content
      WHERE created_at >= ${start} AND created_at <= ${end}
      ORDER BY created_at DESC
    `;

    const reportsByMember: Record<string, MemberReport> = {};
    for (const r of reports) {
      if (!(r.username in reportsByMember)) {
        reportsByMember[r.username] = {
          id: r.id.toString(),
          content: r.content ?? "",
          attachmentName: r.attachment_name,
          attachmentSize: r.attachment_size,
          masterComment: r.master_comment,
          isConfirmMasterComment: r.is_confirm_master_comment,
          userId: r.user_id?.toString() ?? null,
          userComment: r.user_comment ?? null,
          isUserComment: r.is_user_comment ?? false,
        };
      }
    }

    return NextResponse.json({ reportsByMember });
  } catch (error) {
    console.error("Fetch reports by date error:", error);
    return NextResponse.json(
      { error: "날짜별 보고서 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
