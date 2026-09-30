"use client";

import { useState } from "react";
import Link from "next/link";
import ReportAttachmentLink from "@/app/components/ReportAttachmentLink";
import type { MemberReport } from "@/app/lib/attachments";
import { getLeaveTypeColor } from "@/app/lib/leave";
import { formatModifiedReportDate, type ModifiedReportItem } from "@/app/lib/modifiedReports";
import { isLeaveContent, MEMBERS } from "@/app/lib/members";
import ReportAiChatModal from "@/app/components/ReportAiChatModal";
import ProjectSummaryModal from "@/app/components/ProjectSummaryModal";
import MemberSummaryModal from "@/app/components/MemberSummaryModal";
import ReportRiskRadarModal from "@/app/components/ReportRiskRadarModal";
import ReportWorkloadModal from "@/app/components/ReportWorkloadModal";
import MarkdownView from "@/app/components/MarkdownView";

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
  reportsByMember: Record<string, MemberReport>;
  scheduledLeaveByMember: Record<string, string | null>;
  modifiedReports: ModifiedReportItem[];
};

function ReportStatusBadge({ content }: { content: string | undefined }) {
  const hasReport = content !== undefined && content.trim().length > 0;

  if (!hasReport) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        미제출
      </span>
    );
  }

  const trimmed = content.trim();
  if (isLeaveContent(trimmed)) {
    const colors = getLeaveTypeColor(trimmed);
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
      >
        {trimmed}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      제출완료
    </span>
  );
}

export default function ReadReportContent({
  selectedDate,
  reportsByMember,
  scheduledLeaveByMember,
  modifiedReports,
}: Props) {
  const dateKeys = getRecentDateKeys(10);
  const [currentModifiedReports, setCurrentModifiedReports] = useState(modifiedReports);
  const allSubmittedReports = MEMBERS.map((username) => ({
    username,
    report: reportsByMember[username],
  })).filter(
    ({ report }) => report !== undefined && report.content.trim().length > 0,
  );
  const leaveMembersOnDate = allSubmittedReports.flatMap(({ username, report }) => {
    const trimmed = report.content.trim();
    if (!isLeaveContent(trimmed)) return [];
    return [{ username, type: trimmed }];
  });
  const submittedReports = allSubmittedReports.filter(
    ({ report }) => !isLeaveContent(report.content.trim()),
  );
  const [modifiedReportModal, setModifiedReportModal] =
    useState<ModifiedReportItem | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [aiChatModalOpen, setAiChatModalOpen] = useState(false);
  const [projectSummaryModalOpen, setProjectSummaryModalOpen] = useState(false);
  const [memberSummaryModalOpen, setMemberSummaryModalOpen] = useState(false);
  const [riskRadarModalOpen, setRiskRadarModalOpen] = useState(false);
  const [workloadModalOpen, setWorkloadModalOpen] = useState(false);

  const handleCopyAll = async () => {
    if (submittedReports.length === 0) {
      alert("복사할 제출 내역이 없습니다.");
      return;
    }
    const textToCopy = submittedReports
      .map(({ username, report }) => `${username}\n${report.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      alert("복사에 실패했습니다.");
    }
  };

  const confirmModification = async (id: string) => {
    if (!confirm("이 보고서의 수정을 확인 완료 처리하시겠습니까?\n리스트에서 제외됩니다.")) return;
    
    try {
      const res = await fetch("/api/report/confirm-modification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setCurrentModifiedReports((prev) => prev.filter((item) => item.id !== id));
      } else {
        const data = await res.json();
        alert(data.error ?? "처리에 실패했습니다.");
      }
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">일일 보고 현황</h1>
          <p className="mt-1 text-sm text-gray-600">
            날짜를 클릭하면 해당 날짜의 팀원별 보고를 볼 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRiskRadarModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:from-rose-700 hover:via-red-700 hover:to-rose-800 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            title="최근 보고서를 분석하여 잠재적 지연/장애 리스크를 조기 감지합니다"
          >
            <span className="text-base">🚨</span>
            <span>AI 리스크 레이더</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
              위험 감지
            </span>
          </button>

          <button
            type="button"
            onClick={() => setWorkloadModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:from-teal-700 hover:via-emerald-700 hover:to-teal-800 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            title="프로젝트별 투입 공수 및 팀원별 업무 비중을 시각화합니다"
          >
            <span className="text-base">📊</span>
            <span>업무 비중 분석</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
              공수 통계
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMemberSummaryModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-purple-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>최근 보고 요약</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
              5일 취합
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAiChatModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-amber-300 animate-pulse"
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
            <span>AI 질문 비서</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
              사내 LLM
            </span>
          </button>
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
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              오늘의 보고 리스트
            </h2>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
              제출 {submittedReports.length}명
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProjectSummaryModalOpen(true)}
              disabled={submittedReports.length === 0}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                submittedReports.length === 0
                  ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 hover:shadow-xs active:bg-purple-200"
              }`}
              title="오늘 보고를 프로젝트 및 업무 단위로 분류하여 취합합니다"
            >
              <svg
                className="w-3.5 h-3.5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span>AI 프로젝트별 정리</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              disabled={submittedReports.length === 0}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 border ${
              submittedReports.length === 0
                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                : isCopied
                ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm cursor-pointer"
                : "bg-white border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:shadow-sm active:bg-indigo-100 cursor-pointer"
            }`}
          >
            {isCopied ? (
              <>
                <svg
                  className="w-3.5 h-3.5 text-emerald-600 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                복사 완료!
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 3h6"
                  />
                </svg>
                전체 내역 복사
              </>
            )}
          </button>
          </div>
        </div>
        <p className="mb-5 text-sm text-gray-600">
          미제출 인원을 제외하고, 오늘 작성된 보고를 한 번에 확인합니다.
        </p>

        {submittedReports.length === 0 && leaveMembersOnDate.length === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            아직 제출된 보고가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {submittedReports.map(({ username, report }) => (
              <article
                key={username}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  {username}
                </p>
                <div className="text-sm leading-relaxed text-gray-800">
                  <MarkdownView content={report.content} />
                </div>
                {report.attachmentName && (
                  <div className="mt-3">
                    <ReportAttachmentLink
                      reportId={report.id}
                      fileName={report.attachmentName}
                      fileSize={report.attachmentSize}
                    />
                  </div>
                )}
              </article>
            ))}

            {leaveMembersOnDate.length > 0 && (
              <div
                className={`${submittedReports.length > 0 ? "pt-4 border-t border-gray-200" : ""}`}
              >
                <p className="mb-3 text-xs font-medium text-gray-500">
                  출장 · 휴가
                </p>
                <div className="flex flex-wrap gap-2">
                  {leaveMembersOnDate.map(({ username, type }) => {
                    const colors = getLeaveTypeColor(type);
                    return (
                      <div
                        key={username}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-gray-900">
                          {username}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                        >
                          {type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 보고 수정 리스트 */}
      {currentModifiedReports.length > 0 && (
        <section className="w-full rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              보고 수정 리스트
            </h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              {currentModifiedReports.length}건
            </span>
          </div>
          <p className="mb-5 text-sm text-gray-600">
            오늘을 제외한 최근 평일 4일 이내에 수정된 보고입니다.
          </p>
          <div className="space-y-3">
            {currentModifiedReports.map((item) => (
              <div
                key={`${item.username}-${item.reportDate}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.username}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatModifiedReportDate(item.reportDate)} 보고 수정
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModifiedReportModal(item)}
                    className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 cursor-pointer"
                  >
                    수정 내용 보러가기
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmModification(item.id)}
                    className="shrink-0 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 cursor-pointer"
                  >
                    확인 완료
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 수정 내용 모달 */}
      {modifiedReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModifiedReportModal(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="font-semibold text-gray-900">
                수정 보고 · {modifiedReportModal.username}
              </h3>
              <button
                type="button"
                onClick={() => setModifiedReportModal(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 cursor-pointer"
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
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  보고 날짜
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatModifiedReportDate(modifiedReportModal.reportDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  수정 내용
                </p>
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm leading-relaxed text-gray-800">
                  <MarkdownView content={modifiedReportModal.content} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 최근 팀원 보고 AI 요약 모달 */}
      <MemberSummaryModal
        isOpen={memberSummaryModalOpen}
        onClose={() => setMemberSummaryModalOpen(false)}
      />

      {/* 보고서 AI 질의응답 모달 */}
      <ReportAiChatModal
        isOpen={aiChatModalOpen}
        onClose={() => setAiChatModalOpen(false)}
      />

      {/* 프로젝트별 보고 취합 모달 */}
      <ProjectSummaryModal
        isOpen={projectSummaryModalOpen}
        onClose={() => setProjectSummaryModalOpen(false)}
        selectedDate={selectedDate}
        reports={submittedReports.map((r) => ({
          username: r.username,
          content: r.report.content,
        }))}
      />

      {/* AI 프로젝트 리스크 레이더 모달 */}
      <ReportRiskRadarModal
        isOpen={riskRadarModalOpen}
        onClose={() => setRiskRadarModalOpen(false)}
      />

      {/* 팀 업무 비중 및 공수 분석 모달 */}
      <ReportWorkloadModal
        isOpen={workloadModalOpen}
        onClose={() => setWorkloadModalOpen(false)}
      />
    </div>
  );
}
