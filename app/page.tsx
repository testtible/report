"use client";

import { useEffect, useState } from "react";
import LeaveScheduleModal from "@/app/components/LeaveScheduleModal";
import ReportHistoryModal from "@/app/components/ReportHistoryModal";
import {
  formatDateLabel,
  formatDateWithWeekday,
  getDefaultEditableDate,
  getEditableDateKeys,
  getTodayKey,
} from "@/app/lib/dates";
import { MEMBERS } from "@/app/lib/members";

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedDate, setSelectedDate] = useState(getDefaultEditableDate);
  const [reportContent, setReportContent] = useState("");
  const [isExistingReport, setIsExistingReport] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const editableDates = getEditableDateKeys();

  useEffect(() => {
    if (!selectedMember) {
      setReportContent("");
      setIsExistingReport(false);
      return;
    }

    let cancelled = false;
    const loadReport = async () => {
      setIsLoadingContent(true);
      try {
        const res = await fetch(
          `/api/report?username=${encodeURIComponent(selectedMember)}&date=${selectedDate}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setReportContent("");
          setIsExistingReport(false);
          return;
        }
        setReportContent(data.content ?? "");
        setIsExistingReport(!!data.exists);
      } catch {
        if (!cancelled) {
          setReportContent("");
          setIsExistingReport(false);
        }
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    };

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [selectedMember, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert("팀원을 선택해주세요.");
      return;
    }
    if (!reportContent.trim()) {
      alert("보고 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: selectedMember,
          content: reportContent.trim(),
          date: selectedDate,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? "제출에 실패했습니다.");
        return;
      }
      alert(
        data.updated ? "보고서가 수정되었습니다." : "보고서가 제출되었습니다.",
      );
      setIsExistingReport(true);
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            일일 보고서{" "}
            <span className="text-2xl font-normal text-gray-600">
              {formatDateWithWeekday(selectedDate)}
            </span>
          </h1>
          <p className="text-gray-600">팀장님께 보고할 내용을 작성해주세요</p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 날짜 선택 + 출장·휴가 지정 */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  보고 날짜
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedMember) {
                      alert(
                        "출장 및 휴가를 지정하려면 먼저 팀원을 선택해주세요.",
                      );
                      return;
                    }
                    setLeaveModalOpen(true);
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
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
                  출장 및 휴가 지정
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                주말을 제외한 최근 평일 5일 중 날짜를 선택해 작성하거나 수정할
                수 있습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {editableDates.map((dateKey) => {
                  const isSelected = dateKey === selectedDate;
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDate(dateKey)}
                      className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {formatDateLabel(dateKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 팀원 선택 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="member"
                  className="block text-sm font-semibold text-gray-700"
                >
                  팀원 선택
                </label>
                {selectedMember && (
                  <button
                    type="button"
                    onClick={() => setHistoryModalOpen(true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors cursor-pointer"
                  >
                    이전 보고 내용 보러가기
                  </button>
                )}
              </div>
              <select
                id="member"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="" disabled>
                  선택
                </option>
                {MEMBERS.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </div>

            {/* 보고 내용 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="content"
                  className="block text-sm font-semibold text-gray-700"
                >
                  보고 내용
                  <span className="ml-2 font-normal text-gray-500">
                    · {formatDateLabel(selectedDate)}
                  </span>
                </label>
                {selectedMember && isExistingReport && !isLoadingContent && (
                  <span className="text-xs font-medium text-amber-600">
                    기존 보고 수정 중
                  </span>
                )}
              </div>
              <textarea
                id="content"
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                rows={12}
                disabled={isLoadingContent}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-gray-900 placeholder-gray-400 disabled:bg-gray-50"
                placeholder={
                  isLoadingContent
                    ? "불러오는 중..."
                    : selectedDate === getTodayKey()
                      ? "오늘 수행한 업무를 작성해주세요."
                      : `${formatDateLabel(selectedDate)}에 수행한 업무를 작성해주세요.`
                }
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || isLoadingContent}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
              >
                {isSubmitting
                  ? "저장 중..."
                  : isExistingReport
                    ? "수정하기"
                    : "제출하기"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ReportHistoryModal
        username={selectedMember}
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />

      <LeaveScheduleModal
        username={selectedMember}
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
      />
    </div>
  );
}
