import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { hashReadReportAuth } from "@/app/lib/auth";
import { getDateRange, getTodayKey, isValidDateKey } from "@/app/lib/dates";
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
    }[]
  >`
    SELECT id, username, content, attachment_name, attachment_size
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
      username: string;
      created_at: Date;
      updated_at: Date;
      content: string | null;
    }[]
  >`
    SELECT username, created_at, updated_at, content
    FROM content
    WHERE created_at >= ${pastRange.start} AND created_at <= ${pastRange.end}
  `;
  const modifiedReports: ModifiedReportItem[] =
    buildModifiedReportList(pastReports);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <ReadReportContent
          selectedDate={selectedDate}
          reportsByMember={reportsByMember}
          scheduledLeaveByMember={scheduledLeaveByMember}
          modifiedReports={modifiedReports}
        />
      </div>
    </div>
  );
}
