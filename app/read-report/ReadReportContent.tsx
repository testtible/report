"use client";

import { useState } from "react";
import Link from "next/link";

const MEMBERS = [
  "한준기",
  "박상원",
  "김나경",
  "강민석",
  "권혁재",
  "전승기",
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
  const submittedReports = MEMBERS.map((username) => ({
    username,
    content: reportsByMember[username],
  })).filter(
    (report) =>
      report.content !== undefined && report.content.trim().length > 0,
  );
  const [weekSummaryState, setWeekSummaryState] = useState<{
    username: string;
    loading: boolean;
    refined: string | null;
    error: string | null;
  } | null>(null);

  const fetchWeekSummary = async (username: string) => {
    setWeekSummaryState({
      username,
      loading: true,
      refined: null,
      error: null,
    });
    try {
      const res = await fetch(
        `/api/auth/week-report?username=${encodeURIComponent(username)}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) {
        setWeekSummaryState((s) =>
          s ? { ...s, loading: false, error: data.error ?? "요청 실패" } : s,
        );
        return;
      }
      setWeekSummaryState({
        username,
        loading: false,
        refined: data.refined ?? "",
        error: null,
      });
    } catch {
      setWeekSummaryState((s) =>
        s ? { ...s, loading: false, error: "네트워크 오류" } : s,
      );
    }
  };

  const closeWeekSummary = () => setWeekSummaryState(null);

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

      {/* 통합 보고 섹션 */}
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            오늘의 보고 리스트
          </h2>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
            제출 {submittedReports.length}명
          </span>
        </div>
        <p className="mb-5 text-sm text-gray-600">
          미제출 인원을 제외하고, 오늘 작성된 보고를 한 번에 확인합니다.
        </p>

        {submittedReports.length === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            아직 제출된 보고가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {submittedReports.map(({ username, content }) => (
              <article
                key={username}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  {username}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

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
              <button
                type="button"
                onClick={() => fetchWeekSummary(username)}
                disabled={
                  weekSummaryState?.username === username &&
                  weekSummaryState?.loading
                }
                className="mt-3 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-60 cursor-pointer"
              >
                {weekSummaryState?.username === username &&
                weekSummaryState?.loading
                  ? "시간이 소요될 수 있습니다. 요약 중..."
                  : "주간 보고 AI 요약 (최근 5일치)"}
              </button>
            </div>
          );
        })}
      </div>

      {/* 주간보고 AI 요약 모달 */}
      {weekSummaryState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeWeekSummary}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="font-semibold text-gray-900">
                주간 보고 AI 요약 · {weekSummaryState.username}
              </h3>
              <button
                type="button"
                onClick={closeWeekSummary}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {weekSummaryState.loading ? (
                <p className="text-center text-gray-500">
                  AI가 요약하고 있습니다...
                </p>
              ) : weekSummaryState.error ? (
                <p className="text-center text-red-600">
                  {weekSummaryState.error}
                </p>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {weekSummaryState.refined ?? "내용 없음"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
