"use client";

import { useEffect, useRef, useState } from "react";
import LeaveScheduleModal from "@/app/components/LeaveScheduleModal";
import ReportHistoryModal from "@/app/components/ReportHistoryModal";
import {
  formatFileSize,
  MAX_ATTACHMENT_SIZE_LABEL,
  validateAttachmentFile,
} from "@/app/lib/attachments";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<
    string | null
  >(null);
  const [existingAttachmentSize, setExistingAttachmentSize] = useState<
    number | null
  >(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editableDates = getEditableDateKeys();

  const resetAttachmentState = () => {
    setSelectedFile(null);
    setExistingAttachmentName(null);
    setExistingAttachmentSize(null);
    setRemoveAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!selectedMember) {
      setReportContent("");
      setIsExistingReport(false);
      resetAttachmentState();
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
          resetAttachmentState();
          return;
        }
        setReportContent(data.content ?? "");
        setIsExistingReport(!!data.exists);
        setSelectedFile(null);
        setRemoveAttachment(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setExistingAttachmentName(data.attachmentName ?? null);
        setExistingAttachmentSize(data.attachmentSize ?? null);
      } catch {
        if (!cancelled) {
          setReportContent("");
          setIsExistingReport(false);
          resetAttachmentState();
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

    if (selectedFile) {
      const fileError = validateAttachmentFile(selectedFile);
      if (fileError) {
        alert(fileError);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("username", selectedMember);
      formData.append("content", reportContent.trim());
      formData.append("date", selectedDate);
      if (selectedFile) formData.append("file", selectedFile);
      if (removeAttachment) formData.append("removeAttachment", "true");

      const res = await fetch("/api/report", {
        method: "POST",
        body: formData,
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
      setSelectedFile(null);
      setRemoveAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (selectedFile) {
        setExistingAttachmentName(selectedFile.name);
        setExistingAttachmentSize(selectedFile.size);
      } else if (removeAttachment) {
        setExistingAttachmentName(null);
        setExistingAttachmentSize(null);
      }
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

              {/* 첨부파일 */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  첨부파일
                  <span className="ml-2 font-normal text-gray-500 text-xs">
                    1개 · 최대 {MAX_ATTACHMENT_SIZE_LABEL}
                  </span>
                </label>

                {existingAttachmentName &&
                  !selectedFile &&
                  !removeAttachment && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs text-indigo-700 font-medium">
                          기존 첨부파일
                        </p>
                        <p
                          className="text-sm text-gray-800 truncate"
                          title={existingAttachmentName}
                        >
                          {existingAttachmentName}
                          {existingAttachmentSize
                            ? ` (${formatFileSize(existingAttachmentSize)})`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRemoveAttachment(true)}
                        className="shrink-0 text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                  )}

                {removeAttachment && !selectedFile && (
                  <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    제출 시 기존 첨부파일이 삭제됩니다.
                  </p>
                )}

                {!selectedFile && (
                  <label className="flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer py-6 px-4">
                    <svg
                      className="w-8 h-8 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">
                      클릭하여 파일 선택
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      압축파일 포함 모든 형식
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      disabled={isLoadingContent}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const error = validateAttachmentFile(file);
                        if (error) {
                          alert(error);
                          e.target.value = "";
                          return;
                        }
                        setSelectedFile(file);
                        setRemoveAttachment(false);
                      }}
                    />
                  </label>
                )}

                {selectedFile && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">선택된 파일</p>
                      <p
                        className="text-sm font-medium text-gray-900 truncate"
                        title={selectedFile.name}
                      >
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="shrink-0 text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
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
