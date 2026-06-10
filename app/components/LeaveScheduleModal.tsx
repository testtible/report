"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  expandDateRange,
  getLeaveCalendarMonths,
  groupLeavesIntoRanges,
  isLeaveSelectableDate,
  type LeaveEntry,
} from "@/app/lib/leave";
import { LEAVE_TYPES, type LeaveType } from "@/app/lib/members";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

type ModalMode = "assign" | "cancel";

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function isInRange(
  dateKey: string,
  start: string | null,
  end: string | null,
): boolean {
  if (!start) return false;
  const rangeEnd = end ?? start;
  const [from, to] = start <= rangeEnd ? [start, rangeEnd] : [rangeEnd, start];
  return dateKey >= from && dateKey <= to;
}

function formatRangeLabel(startDate: string, endDate: string): string {
  if (startDate === endDate) return startDate;
  return `${startDate} ~ ${endDate}`;
}

type Props = {
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function LeaveScheduleModal({
  username,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [mode, setMode] = useState<ModalMode>("assign");
  const [leaveType, setLeaveType] = useState<LeaveType>(LEAVE_TYPES.TRIP);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingLeaves, setExistingLeaves] = useState<LeaveEntry[]>([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);

  const months = useMemo(() => getLeaveCalendarMonths(), [isOpen]);

  const leaveMap = useMemo(() => {
    const map: Record<string, LeaveType> = {};
    for (const entry of existingLeaves) {
      map[entry.date] = entry.type;
    }
    return map;
  }, [existingLeaves]);

  const existingRanges = useMemo(
    () => groupLeavesIntoRanges(existingLeaves),
    [existingLeaves],
  );

  const selectedDates = useMemo(() => {
    if (!rangeStart) return [];
    return expandDateRange(rangeStart, rangeEnd ?? rangeStart);
  }, [rangeStart, rangeEnd]);

  const cancelableCount = useMemo(() => {
    return selectedDates.filter((d) => leaveMap[d]).length;
  }, [selectedDates, leaveMap]);

  const fetchLeaves = useCallback(async () => {
    setIsLoadingLeaves(true);
    try {
      const res = await fetch(
        `/api/report/leave?username=${encodeURIComponent(username)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setExistingLeaves((data.leaves ?? []) as LeaveEntry[]);
      }
    } catch {
      setExistingLeaves([]);
    } finally {
      setIsLoadingLeaves(false);
    }
  }, [username]);

  useEffect(() => {
    if (!isOpen || !username) return;
    setMode("assign");
    setRangeStart(null);
    setRangeEnd(null);
    fetchLeaves();
  }, [isOpen, username, fetchLeaves]);

  const handleDateClick = (dateKey: string) => {
    if (!isLeaveSelectableDate(dateKey)) return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateKey);
      setRangeEnd(null);
      return;
    }

    if (dateKey === rangeStart) {
      setRangeEnd(dateKey);
      return;
    }

    setRangeEnd(dateKey);
  };

  const selectExistingRange = (
    startDate: string,
    endDate: string,
    targetMode: ModalMode,
  ) => {
    setMode(targetMode);
    setRangeStart(startDate);
    setRangeEnd(endDate);
  };

  const handleAssign = async () => {
    if (!rangeStart) {
      alert("기간을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/report/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          type: leaveType,
          startDate: rangeStart,
          endDate: rangeEnd ?? rangeStart,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "지정에 실패했습니다.");
        return;
      }
      alert(`${data.count}일간 ${leaveType}이(가) 지정되었습니다.`);
      setRangeStart(null);
      setRangeEnd(null);
      await fetchLeaves();
      onSuccess?.();
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async () => {
    if (!rangeStart) {
      alert("취소할 기간을 선택해주세요.");
      return;
    }
    if (cancelableCount === 0) {
      alert("선택한 기간에 취소할 출장·휴가가 없습니다.");
      return;
    }

    if (
      !confirm(
        `선택한 기간의 출장·휴가 ${cancelableCount}일을 취소하시겠습니까?`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/report/leave", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          startDate: rangeStart,
          endDate: rangeEnd ?? rangeStart,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "취소에 실패했습니다.");
        return;
      }
      alert(`${data.count}일간 출장·휴가가 취소되었습니다.`);
      setRangeStart(null);
      setRangeEnd(null);
      await fetchLeaves();
      onSuccess?.();
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRangeStart(null);
    setRangeEnd(null);
    onClose();
  };

  const switchMode = (next: ModalMode) => {
    setMode(next);
    setRangeStart(null);
    setRangeEnd(null);
  };

  if (!isOpen) return null;

  const typeActiveClass =
    leaveType === LEAVE_TYPES.TRIP
      ? "bg-sky-600 text-white shadow-md"
      : "bg-violet-600 text-white shadow-md";

  const rangeHighlightClass =
    mode === "cancel"
      ? "bg-red-500 text-white"
      : leaveType === LEAVE_TYPES.TRIP
        ? "bg-sky-500 text-white"
        : "bg-violet-500 text-white";

  const rangeEdgeClass =
    mode === "cancel"
      ? "ring-2 ring-red-300"
      : leaveType === LEAVE_TYPES.TRIP
        ? "ring-2 ring-sky-300"
        : "ring-2 ring-violet-300";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">출장 및 휴가 지정</h3>
            <p className="text-sm text-gray-500 mt-0.5">{username}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <svg
              className="w-5 h-5"
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 지정 / 취소 모드 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">작업 선택</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => switchMode("assign")}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  mode === "assign"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                지정하기
              </button>
              <button
                type="button"
                onClick={() => switchMode("cancel")}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  mode === "cancel"
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                지정 취소
              </button>
            </div>
          </div>

          {/* 현재 지정된 일정 */}
          {isLoadingLeaves ? (
            <p className="text-sm text-gray-500">지정된 일정 불러오는 중...</p>
          ) : existingRanges.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                현재 지정된 일정
              </p>
              <div className="flex flex-wrap gap-2">
                {existingRanges.map((range) => {
                  const isTrip = range.type === LEAVE_TYPES.TRIP;
                  return (
                    <button
                      key={`${range.type}-${range.startDate}-${range.endDate}`}
                      type="button"
                      onClick={() =>
                        selectExistingRange(
                          range.startDate,
                          range.endDate,
                          "cancel",
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isTrip
                          ? "bg-sky-100 text-sky-800 hover:bg-sky-200"
                          : "bg-violet-100 text-violet-800 hover:bg-violet-200"
                      }`}
                    >
                      <span>{range.type}</span>
                      <span className="opacity-70">
                        {formatRangeLabel(range.startDate, range.endDate)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                클릭하면 해당 기간이 취소 모드로 선택됩니다.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              현재 지정된 출장·휴가가 없습니다.
            </p>
          )}

          {/* 유형 선택 (지정 모드만) */}
          {mode === "assign" && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">유형 선택</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLeaveType(LEAVE_TYPES.TRIP)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    leaveType === LEAVE_TYPES.TRIP
                      ? typeActiveClass
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  출장
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveType(LEAVE_TYPES.VACATION)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    leaveType === LEAVE_TYPES.VACATION
                      ? typeActiveClass
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  휴가
                </button>
              </div>
            </div>
          )}

          {/* 캘린더 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">기간 선택</p>
            <p className="text-xs text-gray-500 mb-4">
              {mode === "assign"
                ? "시작일을 클릭한 뒤 종료일을 클릭하세요. 하루만 지정하려면 같은 날짜를 두 번 클릭하세요."
                : "취소할 기간을 선택하세요. 출장·휴가가 지정된 날짜만 취소됩니다."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {months.map(({ year, month }) => (
                <div
                  key={`${year}-${month}`}
                  className="rounded-xl border border-gray-200 p-4 bg-gray-50/50"
                >
                  <p className="text-center text-sm font-bold text-gray-800 mb-3">
                    {year}년 {month + 1}월
                  </p>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAYS.map((w) => (
                      <div
                        key={w}
                        className="text-center text-[10px] font-medium text-gray-400 py-1"
                      >
                        {w}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getMonthDays(year, month).map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} className="aspect-square" />;
                      }
                      const dateKey = toDateKey(year, month, day);
                      const selectable = isLeaveSelectableDate(dateKey);
                      const inRange = isInRange(dateKey, rangeStart, rangeEnd);
                      const isEdge =
                        dateKey === rangeStart ||
                        dateKey === (rangeEnd ?? rangeStart);
                      const existing = leaveMap[dateKey];

                      let dayClass =
                        "text-gray-700 hover:bg-white hover:shadow-sm cursor-pointer";
                      if (!selectable) {
                        dayClass = "text-gray-300 cursor-not-allowed";
                      } else if (inRange) {
                        dayClass = `${rangeHighlightClass} ${isEdge ? rangeEdgeClass : ""} cursor-pointer`;
                      } else if (existing === LEAVE_TYPES.TRIP) {
                        dayClass =
                          "bg-sky-100 text-sky-700 hover:bg-sky-200 cursor-pointer";
                      } else if (existing === LEAVE_TYPES.VACATION) {
                        dayClass =
                          "bg-violet-100 text-violet-700 hover:bg-violet-200 cursor-pointer";
                      }

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          disabled={!selectable}
                          onClick={() => handleDateClick(dateKey)}
                          className={`aspect-square rounded-lg text-xs font-medium transition-all relative ${dayClass}`}
                          title={existing ? `${existing} 지정됨` : undefined}
                        >
                          {day}
                          {existing && !inRange && (
                            <span
                              className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                                existing === LEAVE_TYPES.TRIP
                                  ? "bg-sky-500"
                                  : "bg-violet-500"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 선택 요약 */}
          {rangeStart && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                mode === "cancel"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : leaveType === LEAVE_TYPES.TRIP
                    ? "bg-sky-50 text-sky-800 border border-sky-200"
                    : "bg-violet-50 text-violet-800 border border-violet-200"
              }`}
            >
              {mode === "assign" ? (
                <>
                  <span className="font-semibold">{leaveType}</span>
                  <span className="mx-2">·</span>
                  <span>
                    {rangeStart}
                    {rangeEnd && rangeEnd !== rangeStart
                      ? ` ~ ${rangeEnd}`
                      : ""}
                  </span>
                  <span className="mx-2">·</span>
                  <span>{selectedDates.length}일</span>
                </>
              ) : (
                <>
                  <span className="font-semibold">지정 취소</span>
                  <span className="mx-2">·</span>
                  <span>
                    {rangeStart}
                    {rangeEnd && rangeEnd !== rangeStart
                      ? ` ~ ${rangeEnd}`
                      : ""}
                  </span>
                  <span className="mx-2">·</span>
                  <span>취소 대상 {cancelableCount}일</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            닫기
          </button>
          {mode === "assign" ? (
            <button
              type="button"
              onClick={handleAssign}
              disabled={!rangeStart || isSubmitting}
              className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 cursor-pointer ${
                leaveType === LEAVE_TYPES.TRIP
                  ? "bg-sky-600 hover:bg-sky-700"
                  : "bg-violet-600 hover:bg-violet-700"
              }`}
            >
              {isSubmitting ? "지정 중..." : "지정하기"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelLeave}
              disabled={!rangeStart || cancelableCount === 0 || isSubmitting}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "취소 중..." : "지정 취소"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
