"use client";

import { useState } from "react";
import type { UrgentTaskItem } from "@/features/report/utils/deadlineParser";

type Props = {
  tasks: UrgentTaskItem[];
  isLoading?: boolean;
  selectedMember?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  onInsertToContent?: (task: UrgentTaskItem) => void;
};

export default function UrgentTaskWidget({
  tasks,
  isLoading = false,
  selectedMember,
  errorMessage,
  onRetry,
  onInsertToContent,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 1. AI 분석 진행 중 UI
  if (isLoading) {
    return (
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-blue-50/90 p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs shadow-2xs">
            <svg
              className="h-3.5 w-3.5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-1.5 flex-wrap">
              <span>AI 마감 임박 업무 분석 중...</span>
              <span className="text-[11px] font-normal text-indigo-700">
                ({selectedMember ? `${selectedMember} 님 ` : ""}최근 평일 3일치 보고서)
              </span>
            </p>
            <p className="text-[11px] text-indigo-600 hidden sm:block">
              사내 LLM이 미완료 목표 일정 및 최근 지연 업무를 백그라운드에서 분석하고 있습니다.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-indigo-600 animate-pulse">
          분석 중...
        </span>
      </div>
    );
  }

  // 2. AI 분석 실패 시 UI
  if (errorMessage) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white text-xs shadow-2xs">
            ⚠️
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-rose-950">
              마감 임박 업무 AI 분석에 실패했습니다
            </p>
            <p className="text-[11px] text-rose-700 truncate">
              {errorMessage}
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 hover:border-rose-400 active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>다시 시도</span>
          </button>
        )}
      </div>
    );
  }

  // 3. 정상 완료되었으나 임박 업무가 0건이면 표시 안 함
  if (tasks.length === 0) return null;

  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const todayCount = tasks.filter((t) => t.status === "today").length;

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/90 p-3.5 sm:p-4 shadow-xs transition-all animate-in fade-in duration-200">
      {/* 헤더 바 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs shadow-2xs">
            ⏳
          </span>
          <span className="text-xs sm:text-sm font-bold text-amber-950">
            마감 임박 업무 (D-3 이내)
          </span>
          <span className="rounded-full bg-amber-200/80 text-amber-900 px-2 py-0.5 text-[11px] font-bold shadow-2xs">
            총 {tasks.length}건
          </span>
          {overdueCount > 0 && (
            <span className="rounded-full bg-rose-100 border border-rose-300 text-rose-800 px-2 py-0.5 text-[10px] font-bold animate-pulse">
              지연 {overdueCount}건
            </span>
          )}
          {todayCount > 0 && (
            <span className="rounded-full bg-orange-100 border border-orange-300 text-orange-900 px-2 py-0.5 text-[10px] font-bold">
              오늘 마감 {todayCount}건
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 px-2 py-1 rounded-md hover:bg-amber-100/70 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
      </div>

      {/* 펼쳐진 업무 목록 */}
      {isExpanded && (
        <div className="mt-2.5 space-y-1.5 pt-1 border-t border-amber-200/60">
          {tasks.map((task) => {
            const isOverdue = task.status === "overdue";
            const isToday = task.status === "today";

            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg bg-white/95 border border-amber-100 shadow-2xs hover:border-amber-300 transition-all text-xs"
              >
                {/* 좌측: D-Day 뱃지 + 업무 제목 */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-[10px] tracking-tight shadow-2xs ${
                      isOverdue
                        ? "bg-rose-600 text-white animate-pulse"
                        : isToday
                          ? "bg-orange-500 text-white font-extrabold"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {isOverdue
                      ? `지연 D+${Math.abs(task.daysLeft)}`
                      : isToday
                        ? "D-Day (오늘) 🔥"
                        : `D-${task.daysLeft}`}
                  </span>

                  <span className="text-gray-900 font-medium truncate select-text">
                    {task.taskTitle}
                  </span>
                </div>

                {/* 우측: 마감일자 + 본문 삽입 버튼 */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-mono hidden sm:inline ${
                      isOverdue
                        ? "text-rose-600 font-bold"
                        : isToday
                          ? "text-orange-600 font-bold"
                          : "text-gray-500"
                    }`}
                  >
                    📅 {task.dueDate}
                  </span>

                  {onInsertToContent && (
                    <button
                      type="button"
                      onClick={() => onInsertToContent(task)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-500/15 hover:bg-amber-500 text-amber-900 hover:text-white transition-all shadow-2xs active:scale-95 cursor-pointer"
                      title="오늘 작성 중인 보고서 본문에 이 업무를 추가합니다"
                    >
                      <span>+ 본문 삽입</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
