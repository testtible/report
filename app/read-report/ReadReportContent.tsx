"use client";

import { useMemo, useState } from "react";
import type { MemberReport } from "@/app/lib/attachments";
import { type ModifiedReportItem } from "@/app/lib/modifiedReports";
import { isLeaveContent, MEMBERS } from "@/app/lib/members";
import { useAiReportPrefetch } from "@/app/read-report/useAiReportPrefetch";

// Modals
import ReportAiChatModal from "@/app/components/ReportAiChatModal";
import ProjectSummaryModal from "@/app/components/ProjectSummaryModal";
import MemberSummaryModal from "@/app/components/MemberSummaryModal";
import ReportRiskRadarModal from "@/app/components/ReportRiskRadarModal";
import ReportWorkloadModal from "@/app/components/ReportWorkloadModal";

// Sub-components
import ReadReportHeader from "@/features/read-report/components/ReadReportHeader";
import DateSelectStrip from "@/features/read-report/components/DateSelectStrip";
import SubmittedReportCard from "@/features/read-report/components/SubmittedReportCard";
import SubmittedReportsBookView from "@/features/read-report/components/SubmittedReportsBookView";
import LeaveMembersSection from "@/features/read-report/components/LeaveMembersSection";
import ModifiedReportsSection from "@/features/read-report/components/ModifiedReportsSection";
import PendingNoticeModal from "@/features/read-report/components/PendingNoticeModal";

// Custom Hooks
import { useMasterComment } from "@/features/read-report/hooks/useMasterComment";
import { useCopyReports } from "@/features/read-report/hooks/useCopyReports";
import { useAiModals } from "@/features/read-report/hooks/useAiModals";
import { useModifiedReports } from "@/features/read-report/hooks/useModifiedReports";

/** 주말 제외, 이전 평일 count개 날짜 계산 (오늘 포함) */
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
  memberList?: string[];
};

export default function ReadReportContent({
  selectedDate,
  reportsByMember,
  modifiedReports: initialModifiedReports,
  memberList,
}: Props) {
  const [viewMode, setViewMode] = useState<"book" | "expanded">("book");
  const dateKeys = useMemo(() => getRecentDateKeys(10), []);

  const activeMembers = useMemo(() => {
    return memberList && memberList.length > 0 ? memberList : [...MEMBERS];
  }, [memberList]);

  // 1. 제출된 보고서 데이터 분류 계산
  const allSubmittedReports = useMemo(
    () =>
      activeMembers
        .map((username) => ({
          username,
          report: reportsByMember[username],
        }))
        .filter(
          ({ report }) =>
            report !== undefined && report.content.trim().length > 0,
        ),
    [activeMembers, reportsByMember],
  );

  const leaveMembersOnDate = useMemo(
    () =>
      allSubmittedReports.flatMap(({ username, report }) => {
        const trimmed = report.content.trim();
        if (!isLeaveContent(trimmed)) return [];
        return [{ username, type: trimmed }];
      }),
    [allSubmittedReports],
  );

  const submittedReports = useMemo(
    () =>
      allSubmittedReports.filter(
        ({ report }) => !isLeaveContent(report.content.trim()),
      ),
    [allSubmittedReports],
  );

  const submittedReportList = useMemo(
    () =>
      submittedReports.map((r) => ({
        username: r.username,
        content: r.report.content,
      })),
    [submittedReports],
  );

  // 2. AI 보고서 프리페치 (30분 주기 캐시)
  const aiPrefetch = useAiReportPrefetch(selectedDate, submittedReportList);

  // 3. 도메인별 커스텀 훅 결합
  const aiModals = useAiModals({
    projectSummary: aiPrefetch.projectSummary,
    riskRadar: aiPrefetch.riskRadar,
    workload: aiPrefetch.workload,
  });

  const masterComment = useMasterComment();
  const copyReports = useCopyReports(submittedReportList);
  const modifiedReportsManager = useModifiedReports(initialModifiedReports);

  return (
    <div className="space-y-6">
      {/* 1. 상단 액션 바 (AI 리스크/공수/요약/비서) */}
      <ReadReportHeader
        riskRadar={{
          isLoading: aiPrefetch.riskRadar.isLoading,
          data: aiPrefetch.riskRadar.data,
        }}
        workload={{
          isLoading: aiPrefetch.workload.isLoading,
          data: aiPrefetch.workload.data,
        }}
        onOpenRiskRadar={aiModals.actions.openRiskRadar}
        onOpenWorkload={aiModals.actions.openWorkload}
        onOpenMemberSummary={() =>
          aiModals.actions.setMemberSummaryModalOpen(true)
        }
        onOpenAiChat={() => aiModals.actions.setAiChatModalOpen(true)}
      />

      {/* 2. 날짜 선택 스트립 */}
      <DateSelectStrip selectedDate={selectedDate} dateKeys={dateKeys} />

      {/* 3. 업무 보고 리스트 섹션 */}
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              업무 보고 리스트
            </h2>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
              제출 {submittedReports.length}명
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* AI 프로젝트별 정리 버튼 */}
            <button
              type="button"
              onClick={() =>
                aiModals.actions.openProjectSummary(submittedReports.length > 0)
              }
              disabled={submittedReports.length === 0}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                submittedReports.length === 0
                  ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 hover:shadow-xs active:bg-purple-200"
              }`}
              title="선택한 일자의 보고를 프로젝트 및 업무 단위로 분류하여 취합합니다"
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
              {aiPrefetch.projectSummary.isLoading ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-200/70 px-1.5 py-0.2 text-[10px] font-medium text-purple-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-pulse" />
                  분석 중...
                </span>
              ) : aiPrefetch.projectSummary.data ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  준비 완료
                </span>
              ) : null}
            </button>

            {/* 전체 내역 복사 버튼 */}
            <button
              type="button"
              onClick={copyReports.copyAllReports}
              disabled={submittedReports.length === 0}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 border ${
                submittedReports.length === 0
                  ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                  : copyReports.isCopied
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm cursor-pointer"
                    : "bg-white border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:shadow-sm active:bg-indigo-100 cursor-pointer"
              }`}
            >
              {copyReports.isCopied ? (
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

            {/* 뷰 모드 토글: 책장 모드 vs 세로 전체 펼치기 */}
            {submittedReports.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setViewMode((prev) => (prev === "book" ? "expanded" : "book"))
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                  viewMode === "book"
                    ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-400 hover:shadow-xs active:bg-amber-200"
                    : "bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 hover:shadow-xs active:bg-indigo-200"
                }`}
                title={
                  viewMode === "book"
                    ? "모든 팀원의 보고서를 세로로 한 번에 펼쳐봅니다"
                    : "보고서를 책장 넘기듯 1개씩 집중해서 봅니다"
                }
              >
                {viewMode === "book" ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-amber-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                      />
                    </svg>
                    <span>전체 펼치기</span>
                    <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                      {submittedReports.length}
                    </span>
                  </>
                ) : (
                  <>
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
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <span>📖 책장으로 모아보기</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="mb-5 text-sm text-gray-600">
          미제출 인원을 제외하고, 작성된 업무 보고를 한 번에 확인합니다.
        </p>

        {submittedReports.length === 0 && leaveMembersOnDate.length === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            아직 제출된 보고가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {/* 제출된 개별 팀원 보고서: 책장 모드 vs 세로 전체 펼침 모드 */}
            {viewMode === "book" ? (
              <SubmittedReportsBookView
                submittedReports={submittedReports}
                masterComment={masterComment}
                onExpandAll={() => setViewMode("expanded")}
              />
            ) : (
              <div className="space-y-4">
                {/* 전체 펼침 모드 안내 배너 */}
                <div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-50/70 border border-indigo-100 px-4 py-2.5 text-xs text-indigo-900">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>📜</span>
                    <span>
                      전체 펼침 모드: 총 {submittedReports.length}명의 보고서를 세로로 확인 중입니다.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode("book")}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>📖 책장으로 접기</span>
                  </button>
                </div>

                {/* 개별 팀원 보고서 카드 목록 */}
                {submittedReports.map(({ username, report }) => {
                  const currentComment = masterComment.getEffectiveComment(
                    username,
                    report.masterComment,
                  );
                  const isEditingThis =
                    masterComment.editingCommentMember === username;

                  return (
                    <SubmittedReportCard
                      key={username}
                      username={username}
                      report={report}
                      currentComment={currentComment}
                      isEditingComment={isEditingThis}
                      commentInput={masterComment.commentInput}
                      isSavingComment={masterComment.isSavingComment}
                      onChangeCommentInput={masterComment.setCommentInput}
                      onStartEditComment={() =>
                        masterComment.startEditComment(username, currentComment)
                      }
                      onCancelEditComment={masterComment.cancelEditComment}
                      onSaveComment={() =>
                        masterComment.saveComment(report.id, username)
                      }
                    />
                  );
                })}

                {/* 하단 책장으로 다시 접기 버튼 */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("book")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>▲ 다시 책장으로 접어서 보기</span>
                  </button>
                </div>
              </div>
            )}

            {/* 출장 · 휴가 인원 섹션 */}
            <LeaveMembersSection
              leaveMembers={leaveMembersOnDate}
              hasSubmittedReports={submittedReports.length > 0}
            />
          </div>
        )}
      </section>

      {/* 4. 보고 수정 리스트 섹션 */}
      <ModifiedReportsSection
        modifiedReports={modifiedReportsManager.reports}
        detailModalItem={modifiedReportsManager.detailModalItem}
        onOpenDetailModal={modifiedReportsManager.setDetailModalItem}
        onCloseDetailModal={() =>
          modifiedReportsManager.setDetailModalItem(null)
        }
        onConfirmModification={modifiedReportsManager.confirmModification}
      />

      {/* 5. 모달들 */}
      <MemberSummaryModal
        isOpen={aiModals.state.memberSummaryModalOpen}
        onClose={() => aiModals.actions.setMemberSummaryModalOpen(false)}
        memberList={activeMembers}
      />

      <ReportAiChatModal
        isOpen={aiModals.state.aiChatModalOpen}
        onClose={() => aiModals.actions.setAiChatModalOpen(false)}
      />

      <ProjectSummaryModal
        isOpen={aiModals.state.projectSummaryModalOpen}
        onClose={() => aiModals.actions.setProjectSummaryModalOpen(false)}
        selectedDate={selectedDate}
        reports={submittedReportList}
        data={aiPrefetch.projectSummary.data}
        isLoading={aiPrefetch.projectSummary.isLoading}
        error={aiPrefetch.projectSummary.error}
        updatedAt={aiPrefetch.projectSummary.updatedAt}
        onRefresh={aiPrefetch.projectSummary.refresh}
      />

      <ReportRiskRadarModal
        isOpen={aiModals.state.riskRadarModalOpen}
        onClose={() => aiModals.actions.setRiskRadarModalOpen(false)}
        data={aiPrefetch.riskRadar.data}
        isLoading={aiPrefetch.riskRadar.isLoading}
        error={aiPrefetch.riskRadar.error}
        updatedAt={aiPrefetch.riskRadar.updatedAt}
        onRefresh={aiPrefetch.riskRadar.refresh}
      />

      <ReportWorkloadModal
        isOpen={aiModals.state.workloadModalOpen}
        onClose={() => aiModals.actions.setWorkloadModalOpen(false)}
        data={aiPrefetch.workload.data}
        isLoading={aiPrefetch.workload.isLoading}
        error={aiPrefetch.workload.error}
        updatedAt={aiPrefetch.workload.updatedAt}
        onRefresh={aiPrefetch.workload.refresh}
      />

      <PendingNoticeModal
        isOpen={aiModals.state.pendingNoticeModalOpen}
        message={aiModals.state.pendingNoticeMessage}
        onClose={() => aiModals.actions.setPendingNoticeModalOpen(false)}
      />
    </div>
  );
}
