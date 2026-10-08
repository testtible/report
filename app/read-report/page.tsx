import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { hashReadReportAuth } from "@/app/lib/auth";
import {
  getDateRange,
  getEditableDateKeys,
  getTodayKey,
  isValidDateKey,
} from "@/app/lib/dates";
import {
  buildUpcomingLeaveByMember,
  getLeaveSelectableBounds,
} from "@/app/lib/leave";
import type { MemberReport } from "@/app/lib/attachments";
import {
  buildModifiedReportList,
  getPastEditableDateRange,
  type ModifiedReportItem,
} from "@/app/lib/modifiedReports";
import { getUsersFromDb } from "@/app/lib/users";
import type { UnreadUserCommentItem } from "@/features/report/types/report.types";
import LoginForm from "./LoginForm";
import ReadReportContent from "./ReadReportContent";

const READ_REPORT_COOKIE = "read_report_auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function ReadReportPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(READ_REPORT_COOKIE);
  const expectedToken =
    process.env.NEXT_PUBLIC_PW != null
      ? hashReadReportAuth(process.env.NEXT_PUBLIC_PW)
      : "";

  if (!expectedToken || authCookie?.value !== expectedToken) {
    return <LoginForm />;
  }

  const params = await searchParams;
  const dateParam = params.date;
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

  const { min, max } = getLeaveSelectableBounds();
  const monthRangeStart = getDateRange(min).start;
  const monthRangeEnd = getDateRange(max).end;
  const scheduledLeaveReports = await prisma.content.findMany({
    where: {
      created_at: { gte: monthRangeStart, lte: monthRangeEnd },
      content: { in: ["출장", "휴가"] },
    },
    orderBy: { created_at: "asc" },
    select: { username: true, created_at: true, content: true },
  });
  const scheduledLeaveByMember =
    buildUpcomingLeaveByMember(scheduledLeaveReports);

  const pastRange = getPastEditableDateRange();
  const pastReports = await prisma.$queryRaw<
    {
      id: bigint;
      username: string;
      created_at: Date;
      updated_at: Date;
      content: string | null;
    }[]
  >`
    SELECT id, username, created_at, updated_at, content
    FROM content
    WHERE created_at >= ${pastRange.start} AND created_at <= ${pastRange.end}
  `;
  const modifiedReports: ModifiedReportItem[] =
    buildModifiedReportList(pastReports);

  // DB user 테이블에서 팀원 목록 동적 조회
  const dbUsers = await getUsersFromDb();
  const members =
    dbUsers.length > 0 ? dbUsers.map((u) => u.name) : undefined;

  // 최근 5일(주말 제외) 미확인 팀원 요청 코멘트 조회
  const editableKeys = getEditableDateKeys();
  const oldestKey = editableKeys[editableKeys.length - 1];
  const newestKey = editableKeys[0];
  const { start: fiveDaysStart } = getDateRange(oldestKey);
  const { end: fiveDaysEnd } = getDateRange(newestKey);

  const rawUnreadUserComments = await prisma.content.findMany({
    where: {
      created_at: { gte: fiveDaysStart, lte: fiveDaysEnd },
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

  const unreadUserComments: UnreadUserCommentItem[] = rawUnreadUserComments
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <ReadReportContent
          selectedDate={selectedDate}
          reportsByMember={reportsByMember}
          scheduledLeaveByMember={scheduledLeaveByMember}
          modifiedReports={modifiedReports}
          memberList={members}
          initialUnreadUserComments={unreadUserComments}
        />
      </div>
    </div>
  );
}
