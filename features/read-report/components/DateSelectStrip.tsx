"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTodayKey, isValidDateKey } from "@/app/lib/dates";

type Props = {
  selectedDate: string;
  dateKeys: string[];
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

export default function DateSelectStrip({ selectedDate, dateKeys }: Props) {
  const router = useRouter();
  const todayKey = useMemo(() => getTodayKey(), []);

  // 선택된 날짜가 기본 리스트에 없더라도 표시되도록 병합
  const allDateKeys = useMemo(() => {
    if (selectedDate && !dateKeys.includes(selectedDate)) {
      return Array.from(new Set([selectedDate, ...dateKeys])).sort((a, b) =>
        b.localeCompare(a),
      );
    }
    return dateKeys;
  }, [dateKeys, selectedDate]);

  const selectedDetails = useMemo(
    () => parseDateDetails(selectedDate),
    [selectedDate],
  );

  // 달력 직접 선택 인풋
  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && isValidDateKey(val)) {
      router.push(`/read-report?date=${val}`);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
      {/* 1. 좌측: 선택된 날짜 표시 + 퀵 오늘 바로가기 + 달력 선택 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-900">
          <span className="text-indigo-600">📅</span>
          <span className="text-[14px] sm:text-[16px] font-bold text-gray-900 tracking-tight">
            {selectedDetails.year}.
            {String(selectedDetails.month).padStart(2, "0")}.
            {String(selectedDetails.day).padStart(2, "0")}
          </span>
          <span className="text-xs text-gray-500 font-normal">
            ({selectedDetails.dayOfWeek})
          </span>

          {selectedDetails.isToday ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.2 text-[11px] font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              오늘
            </span>
          ) : (
            <Link
              href={`/read-report?date=${todayKey}`}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.2 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
              title="오늘 날짜로 이동"
            >
              <span>⚡ 오늘로</span>
            </Link>
          )}
        </div>

        {/* 달력 선택 미니 버튼 */}
        <div className="relative pointer">
          <label
            htmlFor="compact-date-picker"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-gray-200 bg-gray-50 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors cursor-pointer"
            title="달력에서 날짜 직접 선택"
          >
            <svg
              className="w-3.5 h-3.5 text-gray-500"
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
            <span className="hidden sm:inline text-[11px]">달력</span>
          </label>
          <input
            id="compact-date-picker"
            type="date"
            value={selectedDate}
            max={todayKey}
            onChange={handleDateInput}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>

      {/* 2. 우측: 최근 날짜 퀵 필 버튼들 (컴팩트 슬림 스트립) */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-thin">
        {allDateKeys.slice(0, 8).map((dateKey) => {
          const isSelected = dateKey === selectedDate;
          const details = parseDateDetails(dateKey);
          const label = details.isToday
            ? `오늘 (${details.dayOfWeek})`
            : `${details.month}/${details.day} (${details.dayOfWeek})`;

          return (
            <Link
              key={dateKey}
              href={`/read-report?date=${dateKey}`}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                  : "bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 hover:text-gray-900 font-medium"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
