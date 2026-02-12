import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { hashReadReportAuth } from "@/app/lib/auth";
import LoginForm from "./LoginForm";
import ReadReportContent from "./ReadReportContent";

const READ_REPORT_COOKIE = "read_report_auth";

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 주어진 YYYY-MM-DD의 00:00 ~ 23:59 (서버 로컬) */
function getDateRange(dateKey: string): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

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
  const reports = await prisma.content.findMany({
    where: {
      created_at: { gte: start, lte: end },
    },
    orderBy: { created_at: "desc" },
  });

  const reportsByMember: Record<string, string> = {};
  for (const r of reports) {
    if (!(r.username in reportsByMember)) {
      reportsByMember[r.username] = r.content ?? "";
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <ReadReportContent
          selectedDate={selectedDate}
          reportsByMember={reportsByMember}
        />
      </div>
    </div>
  );
}
