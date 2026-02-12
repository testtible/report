"use client";

import Link from "next/link";

const MEMBERS = [
  "한준기",
  "박상원",
  "김나경",
  "강민석",
  "권혁재",
  "이상혁",
] as const;

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const week = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  const today = new Date();
  const isToday =
    today.getFullYear() === y &&
    today.getMonth() === m - 1 &&
    today.getDate() === d;
  if (isToday) return `오늘 (${week})`;
  return `${m}/${d} (${week})`;
}

/** 주말 제외, 이전 평일 count개 날짜 (오늘 포함 가능) */
function getRecentDateKeys(count: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  while (keys.length < count) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      keys.push(`${y}-${m}-${day}`);
    }
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

type Props = {
  selectedDate: string;
  reportsByMember: Record<string, string>;
};

export default function ReadReportContent({
  selectedDate,
  reportsByMember,
}: Props) {
  const dateKeys = getRecentDateKeys(10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">일일 보고 현황</h1>
          <p className="mt-1 text-sm text-gray-600">
            날짜를 클릭하면 해당 날짜의 팀원별 보고를 볼 수 있습니다.
          </p>
        </div>
      </div>

      {/* 날짜 선택 스트립 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500 mb-3">날짜 선택</p>
        <div className="flex flex-wrap gap-2">
          {dateKeys.map((dateKey) => {
            const isSelected = dateKey === selectedDate;
            return (
              <Link
                key={dateKey}
                href={`/read-report?date=${dateKey}`}
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {formatDateLabel(dateKey)}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 표시 */}
      <p className="text-gray-600">
        <span className="font-semibold text-gray-900">
          {formatDateLabel(selectedDate)}
        </span>
        <span className="ml-2 text-gray-500">{selectedDate}</span>
      </p>

      {/* 팀원별 보고 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MEMBERS.map((username) => {
          const content = reportsByMember[username];
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
                className={`min-h-[120px] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
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
  );
}
