"use client";

import { useMemo, useRef } from "react";
import { getTodayKey, isValidDateKey } from "@/app/lib/dates";

type Props = {
  selectedDate: string;
  editableDates: string[];
  selectedMember: string;
  onSelectDate: (date: string) => void;
  onOpenLeaveModal: () => void;
  onOpenAiChatModal: () => void;
};

function parseDateDetails(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayOfWeek = dayNames[dateObj.getDay()];

  const today = new Date();
  const isToday =
    today.getFullYear() === y &&
    today.getMonth() === m - 1 &&
    today.getDate() === d;

  return {
    year: y,
    month: m,
    day: d,
    dayOfWeek,
    isToday,
  };
}

export default function ReportHeader({
  selectedDate,
  editableDates,
  selectedMember,
  onSelectDate,
  onOpenLeaveModal,
  onOpenAiChatModal,
}: Props) {
  const todayKey = useMemo(() => getTodayKey(), []);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 선택된 날짜가 기본 리스트에 없더라도 표시되도록 병합
  const allDateKeys = useMemo(() => {
    if (selectedDate && !editableDates.includes(selectedDate)) {
      return Array.from(new Set([selectedDate, ...editableDates])).sort((a, b) =>
        b.localeCompare(a),
      );
    }
    return editableDates;
  }, [editableDates, selectedDate]);

  const selectedDetails = useMemo(
    () => parseDateDetails(selectedDate),
    [selectedDate],
  );

  // 달력 팝업 직접 열기
  const handleOpenPicker = () => {
    if (!dateInputRef.current) return;
    try {
      if (typeof dateInputRef.current.showPicker === "function") {
        dateInputRef.current.showPicker();
        return;
      }
    } catch {
      // fallback
    }
    dateInputRef.current.focus();
    dateInputRef.current.click();
  };

  // 달력 직접 선택 인풋
  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && isValidDateKey(val)) {
      onSelectDate(val);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. 상단 타이틀 & 부가 액션 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          일일 보고서
        </h1>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (!selectedMember) {
                alert("AI에게 질문하려면 먼저 팀원을 선택해주세요.");
                return;
              }
              onOpenAiChatModal();
            }}
            disabled={!selectedMember}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
              selectedMember
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs hover:from-indigo-700 hover:to-purple-700 hover:shadow-md cursor-pointer"
                : "border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
            title={
              selectedMember
                ? `${selectedMember} 님의 과거 보고서를 기반으로 AI에게 질문합니다`
                : "팀원을 먼저 선택하면 AI 질문 기능이 활성화됩니다"
            }
          >
            <svg
              className={`w-4 h-4 ${
                selectedMember
                  ? "text-amber-300 animate-pulse"
                  : "text-gray-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>AI에게 질문하기</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedMember) {
                alert("출장 및 휴가를 지정하려면 먼저 팀원을 선택해주세요.");
                return;
              }
              onOpenLeaveModal();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>출장 및 휴가 지정</span>
          </button>
        </div>
      </div>

      {/* 2. 일일 보고 현황 스타일의 날짜 선택 스트립 */}
      <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        {/* 좌측: 선택된 날짜 표시 + 오늘 바로가기 + 달력 팝업 버튼 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenPicker}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer group"
            title="클릭하여 달력에서 날짜 변경하기"
          >
            <span className="text-indigo-600 group-hover:scale-110 transition-transform">
              📅
            </span>
            <span className="text-[14px] sm:text-[15px] font-bold text-gray-900 tracking-tight group-hover:text-indigo-600 group-hover:underline underline-offset-2">
              {selectedDetails.year}.
              {String(selectedDetails.month).padStart(2, "0")}.
              {String(selectedDetails.day).padStart(2, "0")}
            </span>
            <span className="text-xs text-gray-500 font-normal">
              ({selectedDetails.dayOfWeek})
            </span>
          </button>

          {selectedDetails.isToday ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.2 text-[11px] font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              오늘
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSelectDate(todayKey)}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.2 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
              title="오늘 날짜로 이동"
            >
              <span>⚡ 오늘로</span>
            </button>
          )}

          {/* 달력 선택 버튼 */}
          <div className="relative">
            <button
              type="button"
              onClick={handleOpenPicker}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/70 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs active:scale-98"
              title="달력에서 날짜 직접 선택"
            >
              <svg
                className="w-3.5 h-3.5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-[11px]">달력</span>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              max={todayKey}
              onChange={handleDateInput}
              className="absolute bottom-0 left-0 opacity-0 pointer-events-none w-0 h-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* 우측: 최근 날짜 퀵 필 버튼들 (컴팩트 슬림 스트립) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-thin">
          {allDateKeys.map((dateKey) => {
            const isSelected = dateKey === selectedDate;
            const details = parseDateDetails(dateKey);
            const label = details.isToday
              ? `오늘 (${details.dayOfWeek})`
              : `${details.month}/${details.day} (${details.dayOfWeek})`;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onSelectDate(dateKey)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                    : "bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 hover:text-gray-900 font-medium"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
