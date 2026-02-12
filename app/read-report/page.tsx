import Link from "next/link";
import { prisma } from "@/app/lib/prisma";

const MEMBERS = [
  "한준기",
  "박상원",
  "김나경",
  "강민석",
  "권혁재",
  "이상혁",
] as const;

/** 오늘 00:00 ~ 23:59 (서버 로컬) */
function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export const dynamic = "force-dynamic";

export default async function ReadReportPage() {
  const { start, end } = getTodayRange();
  const todayReports = await prisma.content.findMany({
    where: {
      created_at: { gte: start, lte: end },
    },
    orderBy: { created_at: "desc" },
  });

  // 인당 오늘 제출한 것 중 가장 최신 1건만 매핑
  const latestByUsername = new Map<string | null, string>();
  for (const r of todayReports) {
    if (!latestByUsername.has(r.username)) {
      latestByUsername.set(r.username, r.content ?? "");
    }
  }

  const currentDate = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-8xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              일일 보고 현황
              <span className="ml-2 text-xl font-normal text-gray-500">
                {currentDate}
              </span>
            </h1>
            <p className="mt-1 text-gray-600">
              팀원별 오늘 제출한 보고 중 최신 내용입니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MEMBERS.map((username) => {
            const content = latestByUsername.get(username);
            const hasReport = content !== undefined;
            const displayText = hasReport ? content : "보고되지 않음";

            return (
              <div
                key={username}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {username}
                  </span>
                  {!hasReport && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      미제출
                    </span>
                  )}
                  {hasReport && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      제출완료
                    </span>
                  )}
                </div>
                <div
                  className={`min-h-[120px] rounded-xl px-4 py-3 text-md leading-relaxed whitespace-pre-wrap ${
                    hasReport
                      ? "bg-gray-50 text-gray-800"
                      : "bg-gray-100 text-gray-500 italic"
                  }`}
                >
                  {displayText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
