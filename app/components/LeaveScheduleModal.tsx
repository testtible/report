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

function isWeekend(dateKey: string): boolean {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6;
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

type Toast = {
  type: "success" | "error" | "info";
  message: string;
};

type ConfirmDialog = {
  title: string;
  message: string;
  confirmText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
};

export default function LeaveScheduleModal({
  username,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [leaveType, setLeaveType] = useState<LeaveType>(LEAVE_TYPES.TRIP);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingLeaves, setExistingLeaves] = useState<LeaveEntry[]>([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);

  // 인앱 알림 토스트 및 확인 모달 상태
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const showToast = useCallback((type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 오늘 날짜 계산 (YYYY-MM-DD)
  const todayKey = useMemo(() => {
    const now = new Date();
    return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // 캘린더 월 목록 (React Hook Lint 경고 해결)
  const months = useMemo(() => getLeaveCalendarMonths(), []);

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

  // 주말 자동 제외 옵션이 적용된 선택 날짜 목록
  const selectedDates = useMemo(() => {
    if (!rangeStart) return [];
    const all = expandDateRange(rangeStart, rangeEnd ?? rangeStart);
    if (excludeWeekends) {
      return all.filter((d) => !isWeekend(d));
    }
    return all;
  }, [rangeStart, rangeEnd, excludeWeekends]);

  // 선택된 기간 내에 이미 등록되어 있어 취소 가능한 날짜 목록
  const cancelableDates = useMemo(() => {
    if (!rangeStart) return [];
    const all = expandDateRange(rangeStart, rangeEnd ?? rangeStart);
    return all.filter((d) => Boolean(leaveMap[d]));
  }, [rangeStart, rangeEnd, leaveMap]);

  const cancelableCount = cancelableDates.length;

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
    setRangeStart(null);
    setRangeEnd(null);
    setToast(null);
    setConfirmDialog(null);
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
    type?: LeaveType,
  ) => {
    if (type) setLeaveType(type);
    setRangeStart(startDate);
    setRangeEnd(endDate);
  };

  // 주요 기간 빠른 선택 프리셋 핸들러
  const applyPreset = (preset: "today" | "tomorrow" | "thisWeek" | "nextWeek") => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const dow = now.getDay(); // 0: 일, 1: 월, ..., 6: 토

    if (preset === "today") {
      const key = toDateKey(y, m, d);
      setRangeStart(key);
      setRangeEnd(key);
      return;
    }

    if (preset === "tomorrow") {
      const tmrw = new Date(y, m, d + 1);
      if (tmrw.getDay() === 6) tmrw.setDate(tmrw.getDate() + 2); // 토 -> 월
      else if (tmrw.getDay() === 0) tmrw.setDate(tmrw.getDate() + 1); // 일 -> 월
      const key = toDateKey(tmrw.getFullYear(), tmrw.getMonth(), tmrw.getDate());
      setRangeStart(key);
      setRangeEnd(key);
      return;
    }

    if (preset === "thisWeek") {
      // 오늘부터 이번 주 금요일까지
      const daysUntilFri = 5 - (dow === 0 ? 7 : dow);
      const fri = new Date(y, m, d + Math.max(0, daysUntilFri));
      setRangeStart(toDateKey(y, m, d));
      setRangeEnd(toDateKey(fri.getFullYear(), fri.getMonth(), fri.getDate()));
      return;
    }

    if (preset === "nextWeek") {
      // 다음 주 월요일부터 금요일까지
      const daysUntilNextMon = dow === 0 ? 1 : 8 - dow;
      const nextMon = new Date(y, m, d + daysUntilNextMon);
      const nextFri = new Date(y, m, d + daysUntilNextMon + 4);
      setRangeStart(toDateKey(nextMon.getFullYear(), nextMon.getMonth(), nextMon.getDate()));
      setRangeEnd(toDateKey(nextFri.getFullYear(), nextFri.getMonth(), nextFri.getDate()));
      return;
    }
  };

  // 출장/휴가 지정 제출
  const handleAssign = async () => {
    if (!rangeStart) {
      showToast("error", "기간을 선택해주세요.");
      return;
    }

    if (selectedDates.length === 0) {
      showToast("error", "지정할 수 있는 근무일(평일)이 없습니다. 주말 제외 설정을 확인해주세요.");
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
          dates: selectedDates,
          excludeWeekends,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error ?? "지정에 실패했습니다.");
        return;
      }
      showToast("success", `${data.count}일간 ${leaveType}이(가) 지정되었습니다.`);
      setRangeStart(null);
      setRangeEnd(null);
      await fetchLeaves();
      onSuccess?.();
    } catch {
      showToast("error", "네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 선택된 기존 일정 취소
  const handleCancelLeave = () => {
    if (!rangeStart) {
      showToast("error", "취소할 기간을 선택해주세요.");
      return;
    }
    if (cancelableCount === 0) {
      showToast("error", "선택한 기간에 등록된 출장·휴가 일정이 없습니다.");
      return;
    }

    setConfirmDialog({
      title: "출장·휴가 일정 취소",
      message: `${username} 님의 선택 기간(${formatRangeLabel(rangeStart, rangeEnd ?? rangeStart)}) 내 등록된 일정 ${cancelableCount}일을 취소하시겠습니까?`,
      confirmText: "일정 취소",
      isDanger: true,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const res = await fetch("/api/report/leave", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              dates: cancelableDates,
              startDate: rangeStart,
              endDate: rangeEnd ?? rangeStart,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast("error", data.error ?? "취소에 실패했습니다.");
            return;
          }
          showToast("success", `${data.count ?? cancelableCount}일간 출장·휴가 일정이 취소되었습니다.`);
          setRangeStart(null);
          setRangeEnd(null);
          await fetchLeaves();
          onSuccess?.();
        } catch {
          showToast("error", "네트워크 오류가 발생했습니다.");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  // 기존 일정 칩에서 원클릭 삭제 (✕)
  const handleQuickDeleteRange = (range: {
    type: LeaveType;
    startDate: string;
    endDate: string;
  }) => {
    setConfirmDialog({
      title: `${range.type} 일정 삭제`,
      message: `${username} 님의 [${range.type}] ${formatRangeLabel(range.startDate, range.endDate)} 일정을 취소하시겠습니까?`,
      confirmText: "삭제하기",
      isDanger: true,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const res = await fetch("/api/report/leave", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              startDate: range.startDate,
              endDate: range.endDate,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast("error", data.error ?? "삭제에 실패했습니다.");
            return;
          }
          showToast("success", `${range.type} 일정이 취소되었습니다.`);
          if (rangeStart === range.startDate && rangeEnd === range.endDate) {
            setRangeStart(null);
            setRangeEnd(null);
          }
          await fetchLeaves();
          onSuccess?.();
        } catch {
          showToast("error", "네트워크 오류가 발생했습니다.");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleClose = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setToast(null);
    setConfirmDialog(null);
    onClose();
  };

  if (!isOpen) return null;

  const typeActiveClass =
    leaveType === LEAVE_TYPES.TRIP
      ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-300"
      : "bg-violet-600 text-white shadow-md ring-2 ring-violet-300";

  const rangeHighlightClass =
    leaveType === LEAVE_TYPES.TRIP
      ? "bg-sky-500 text-white"
      : "bg-violet-500 text-white";

  const rangeEdgeClass =
    leaveType === LEAVE_TYPES.TRIP
      ? "ring-2 ring-sky-300 ring-offset-1"
      : "ring-2 ring-violet-300 ring-offset-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs"
      onClick={handleClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 인앱 토스트 알림 */}
        {toast && (
          <div
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
                : toast.type === "error"
                  ? "bg-rose-50/95 border-rose-200 text-rose-900"
                  : "bg-indigo-50/95 border-indigo-200 text-indigo-900"
            }`}
          >
            {toast.type === "success" && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {toast.type === "error" && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            {toast.type === "info" && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 인앱 확인 모달 (confirm 대체) */}
        {confirmDialog && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    confirmDialog.isDanger
                      ? "bg-rose-100 text-rose-600"
                      : "bg-indigo-100 text-indigo-600"
                  }`}
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    {confirmDialog.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    action();
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer ${
                    confirmDialog.isDanger
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {confirmDialog.confirmText ?? "확인"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  출장 및 휴가 지정
                </h3>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {username}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                지정된 날짜는 일일 보고서 제출 목록에서 출장·휴가 상태로 자동 처리됩니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
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

        {/* 모달 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 현재 지정된 일정 칩 목록 */}
          {isLoadingLeaves ? (
            <p className="text-xs text-gray-500">지정된 일정 불러오는 중...</p>
          ) : existingRanges.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <span>📅</span>
                  <span>현재 지정된 일정</span>
                  <span className="text-[11px] font-normal text-gray-400">
                    ({existingRanges.length}건)
                  </span>
                </p>
                <span className="text-[11px] text-gray-400">
                  칩 클릭 시 달력 선택 · ✕ 버튼으로 즉시 취소
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {existingRanges.map((range) => {
                  const isTrip = range.type === LEAVE_TYPES.TRIP;
                  return (
                    <div
                      key={`${range.type}-${range.startDate}-${range.endDate}`}
                      className={`inline-flex items-center rounded-lg border text-xs font-medium shadow-2xs overflow-hidden transition-all ${
                        isTrip
                          ? "bg-sky-50 border-sky-200 text-sky-800"
                          : "bg-violet-50 border-violet-200 text-violet-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          selectExistingRange(
                            range.startDate,
                            range.endDate,
                            range.type,
                          )
                        }
                        className="px-2.5 py-1 hover:bg-black/5 transition-colors cursor-pointer flex items-center gap-1.5"
                        title="클릭하여 달력에서 이 기간을 확인하거나 변경/취소"
                      >
                        <span className="font-semibold">{range.type}</span>
                        <span className="opacity-80">
                          {formatRangeLabel(range.startDate, range.endDate)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickDeleteRange(range);
                        }}
                        className="px-1.5 py-1 border-l border-current/15 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                        title={`${range.type} 일정 즉시 취소`}
                        aria-label="삭제"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
              현재 지정된 출장·휴가 일정이 없습니다.
            </p>
          )}

          {/* 유형 선택 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">유형 선택</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLeaveType(LEAVE_TYPES.TRIP)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  leaveType === LEAVE_TYPES.VACATION
                    ? typeActiveClass
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                휴가
              </button>
            </div>
          </div>

          {/* 주요 기간 퀵 프리셋 & 옵션 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
                ⚡ <span>빠른 선택:</span>
              </span>
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => applyPreset("tomorrow")}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
              >
                내일
              </button>
              <button
                type="button"
                onClick={() => applyPreset("thisWeek")}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
              >
                이번 주
              </button>
              <button
                type="button"
                onClick={() => applyPreset("nextWeek")}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
              >
                다음 주 (월~금)
              </button>
            </div>

            {/* 주말 자동 제외 체크박스 */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={excludeWeekends}
                onChange={(e) => setExcludeWeekends(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span>주말(토·일) 자동 제외</span>
            </label>
          </div>

          {/* 캘린더 영역 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-700">기간 선택</p>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full ring-2 ring-indigo-500" />
                  오늘
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
                  출장
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />
                  휴가
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              시작일과 종료일을 클릭하여 기간을 선택하세요. (하루만 지정 시 같은 날짜를 한 번 더 클릭)
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
                    {WEEKDAYS.map((w, i) => (
                      <div
                        key={w}
                        className={`text-center text-[11px] font-bold py-1 ${
                          i === 0
                            ? "text-rose-500"
                            : i === 6
                              ? "text-sky-500"
                              : "text-gray-400"
                        }`}
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
                      const isToday = dateKey === todayKey;
                      const dow = new Date(year, month, day).getDay();
                      const isSat = dow === 6;
                      const isSun = dow === 0;
                      const isWknd = isSat || isSun;
                      const isExcludedWeekend =
                        excludeWeekends && inRange && isWknd;

                      let dayClass =
                        "hover:bg-white hover:shadow-xs cursor-pointer";
                      if (!selectable) {
                        dayClass = "text-gray-300 cursor-not-allowed";
                      } else if (isExcludedWeekend) {
                        // 선택 범위 내 주말 제외 표시
                        dayClass =
                          "bg-gray-100 text-gray-400 cursor-pointer line-through opacity-70";
                      } else if (inRange) {
                        dayClass = `${rangeHighlightClass} ${
                          isEdge ? rangeEdgeClass : ""
                        } cursor-pointer font-bold`;
                      } else if (existing === LEAVE_TYPES.TRIP) {
                        dayClass =
                          "bg-sky-100 text-sky-700 hover:bg-sky-200 cursor-pointer font-semibold";
                      } else if (existing === LEAVE_TYPES.VACATION) {
                        dayClass =
                          "bg-violet-100 text-violet-700 hover:bg-violet-200 cursor-pointer font-semibold";
                      } else if (isSun) {
                        dayClass =
                          "text-rose-600 font-semibold hover:bg-rose-50/50 cursor-pointer";
                      } else if (isSat) {
                        dayClass =
                          "text-sky-600 font-semibold hover:bg-sky-50/50 cursor-pointer";
                      } else {
                        dayClass =
                          "text-gray-700 hover:bg-white cursor-pointer";
                      }

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          disabled={!selectable}
                          onClick={() => handleDateClick(dateKey)}
                          className={`aspect-square rounded-lg text-xs font-medium transition-all relative flex flex-col items-center justify-center ${dayClass} ${
                            isToday && !inRange
                              ? "ring-2 ring-indigo-500 font-bold"
                              : ""
                          }`}
                          title={
                            isExcludedWeekend
                              ? "주말 자동 제외됨"
                              : existing
                                ? `${existing} 지정됨`
                                : isToday
                                  ? "오늘"
                                  : undefined
                          }
                        >
                          <span>{day}</span>
                          {isToday && !inRange && (
                            <span className="text-[8px] leading-none text-indigo-600 font-bold -mt-0.5">
                              오늘
                            </span>
                          )}
                          {existing && inRange && (
                            <span className="text-[8px] leading-none text-white/90 font-medium -mt-0.5">
                              {existing}
                            </span>
                          )}
                          {existing && !inRange && !isToday && (
                            <span
                              className={`w-1 h-1 rounded-full mt-0.5 ${
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
              className={`rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center justify-between flex-wrap gap-2 border ${
                leaveType === LEAVE_TYPES.TRIP
                  ? "bg-sky-50/80 text-sky-900 border-sky-200"
                  : "bg-violet-50/80 text-violet-900 border-violet-200"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-bold text-white ${
                    leaveType === LEAVE_TYPES.TRIP
                      ? "bg-sky-600"
                      : "bg-violet-600"
                  }`}
                >
                  {leaveType}
                </span>
                <span className="font-bold text-gray-800">
                  {formatRangeLabel(rangeStart, rangeEnd ?? rangeStart)}
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-semibold text-gray-700">
                  선택 {selectedDates.length}일
                  {excludeWeekends ? " (주말 제외)" : ""}
                </span>
                {cancelableCount > 0 && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      기존 일정 {cancelableCount}일 포함
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer ml-auto"
              >
                선택 초기화
              </button>
            </div>
          )}
        </div>

        {/* 모달 푸터 버튼 */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors cursor-pointer text-sm shrink-0"
          >
            닫기
          </button>

          <div className="flex items-center gap-2 flex-1 justify-end">
            {cancelableCount > 0 && (
              <button
                type="button"
                onClick={handleCancelLeave}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl font-semibold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 transition-all disabled:opacity-50 cursor-pointer text-sm shadow-2xs shrink-0 flex items-center gap-1.5"
                title="선택한 기간 내 이미 등록된 일정을 취소합니다"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {isSubmitting
                  ? "취소 중..."
                  : `선택 일정 취소 (${cancelableCount}일)`}
              </button>
            )}

            <button
              type="button"
              onClick={handleAssign}
              disabled={
                !rangeStart || selectedDates.length === 0 || isSubmitting
              }
              className={`flex-1 max-w-xs py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 cursor-pointer text-sm shadow-sm ${
                leaveType === LEAVE_TYPES.TRIP
                  ? "bg-sky-600 hover:bg-sky-700 shadow-sky-100"
                  : "bg-violet-600 hover:bg-violet-700 shadow-violet-100"
              }`}
            >
              {isSubmitting
                ? "지정 중..."
                : selectedDates.length > 0
                  ? `${selectedDates.length}일간 ${leaveType} 지정하기`
                  : `${leaveType} 지정하기`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
