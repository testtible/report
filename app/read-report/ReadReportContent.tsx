"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import UnreadUserCommentsBookModal from "@/features/read-report/components/UnreadUserCommentsBookModal";
import type {
  OrganizationResponse,
  UnreadUserCommentItem,
} from "@/features/report/types/report.types";
import {
  confirmUserCommentApi,
  fetchUnreadUserCommentsApi,
} from "@/features/report/services/reportApiService";
import Snackbar, { type SnackbarType } from "@/app/components/Snackbar";

// Sub-components
import ReadReportHeader from "@/features/read-report/components/ReadReportHeader";
import TeamSelectionLanding from "@/features/read-report/components/TeamSelectionLanding";
import TeamCurrentBar from "@/features/read-report/components/TeamCurrentBar";
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
  initialUnreadUserComments?: UnreadUserCommentItem[];
  organization?: OrganizationResponse;
  initialTeamId?: string;
};

export default function ReadReportContent({
  selectedDate,
  reportsByMember,
  modifiedReports: initialModifiedReports,
  memberList,
  initialUnreadUserComments,
  organization,
  initialTeamId,
}: Props) {
  const [viewMode, setViewMode] = useState<"book" | "expanded">("book");
  const [unreadUserComments, setUnreadUserComments] = useState<
    UnreadUserCommentItem[]
  >(initialUnreadUserComments ?? []);
  const [isUserCommentsModalOpen, setIsUserCommentsModalOpen] = useState(
    (initialUnreadUserComments ?? []).length > 0,
  );
  const [snackbar, setSnackbar] = useState<{
    isOpen: boolean;
    message: string;
    type?: SnackbarType;
    actionLabel?: string;
    onAction?: () => void;
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showSnackbar = useCallback(
    (
      message: string,
      type: SnackbarType = "success",
      actionLabel?: string,
      onAction?: () => void,
    ) => {
      setSnackbar({ isOpen: true, message, type, actionLabel, onAction });
    },
    [],
  );

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const [currentReportsByMember, setCurrentReportsByMember] = useState<
    Record<string, MemberReport>
  >(reportsByMember);

  // 상위 props 변경 시 동기화
  useEffect(() => {
    setCurrentReportsByMember(reportsByMember);
  }, [reportsByMember]);

  // 1분(60초)마다 팀원 요청 코멘트, 보고서 목록 refetch
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        // 1. 최근 5일 미확인 팀원 요청 코멘트 refetch
        const latestComments = await fetchUnreadUserCommentsApi();
        setUnreadUserComments((prev) => {
          const prevIds = new Set(prev.map((c) => c.id));
          const newArrivals = latestComments.filter((c) => !prevIds.has(c.id));

          if (newArrivals.length > 0) {
            showSnackbar(
              `📬 팀원의 새로운 요청 코멘트가 도착했습니다! (신규 ${newArrivals.length}건)`,
              "info",
              "확인하기 →",
              () => setIsUserCommentsModalOpen(true),
            );
          }
          return latestComments;
        });

        // 2. 현재 선택된 날짜의 팀원 보고서 및 코멘트 상태 refetch
        if (selectedDate) {
          const res = await fetch(
            `/api/report/by-date?date=${encodeURIComponent(selectedDate)}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.reportsByMember) {
              setCurrentReportsByMember(data.reportsByMember);
            }
          }
        }
      } catch (err) {
        console.error("1분 주기 팀원 요청 코멘트 및 데이터 refetch 오류:", err);
      }
    }, 60 * 1000); // 1분 (60,000ms)

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedDate, showSnackbar]);

  // 팀 선택 상태: team.id (예: "2") 또는 null (선택 전)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    return initialTeamId || null;
  });
  const [isChangingTeam, setIsChangingTeam] = useState<boolean>(false);
  const [isTeamHydrated, setIsTeamHydrated] = useState<boolean>(false);

  // 클라이언트 localStorage에서 이전 선택된 teamId 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aerix_read_report_team_id");
      if (!initialTeamId && saved) {
        setSelectedTeamId(saved);
      }
    } catch (e) {
      console.warn("Failed to read teamId from localStorage:", e);
    } finally {
      setIsTeamHydrated(true);
    }
  }, [initialTeamId]);

  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setIsChangingTeam(false);
    try {
      localStorage.setItem("aerix_read_report_team_id", teamId);
    } catch (e) {
      console.warn("Failed to save teamId to localStorage:", e);
    }
    // URL searchParam 동기화 (새로고침 없이 URL 갱신)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("teamId", teamId);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const handleStartChangeTeam = useCallback(() => {
    setIsChangingTeam(true);
  }, []);

  const handleCancelChangeTeam = useCallback(() => {
    setIsChangingTeam(false);
  }, []);

  const currentTeam = useMemo(() => {
    if (!selectedTeamId || !organization?.teams) return null;
    return (
      organization.teams.find((t) => String(t.id) === String(selectedTeamId)) ||
      null
    );
  }, [selectedTeamId, organization]);

  const dateKeys = useMemo(() => getRecentDateKeys(10), []);

  // 현재 선택된 팀에 따른 활성 멤버 필터링
  const activeMembers = useMemo(() => {
    if (!organization || !organization.users || organization.users.length === 0) {
      return memberList && memberList.length > 0 ? memberList : [...MEMBERS];
    }

    if (!selectedTeamId) {
      return organization.users.map((u) => u.name);
    }

    const teamUsers = organization.users.filter(
      (u) => String(u.teamId) === String(selectedTeamId),
    );
    return teamUsers.map((u) => u.name);
  }, [organization, memberList, selectedTeamId]);

  // 1. 제출된 보고서 데이터 분류 계산 (팀명 매핑 포함)
  const allSubmittedReports = useMemo(
    () =>
      activeMembers
        .map((username) => {
          const userOrg = organization?.users.find((u) => u.name === username);
          return {
            username,
            report: currentReportsByMember[username],
            teamName: userOrg?.teamName,
          };
        })
        .filter(
          ({ report }) =>
            report !== undefined && report.content.trim().length > 0,
        ),
    [activeMembers, currentReportsByMember, organization],
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

  const handleConfirmUserComment = async (reportId: string) => {
    await confirmUserCommentApi(reportId);
    setUnreadUserComments((prev) =>
      prev.map((item) =>
        item.id === reportId ? { ...item, isUserComment: true } : item,
      ),
    );
  };

  const handleSaveCardComment = async (
    reportId: string,
    username: string,
    hasUnconfirmedUserComment: boolean,
  ) => {
    await masterComment.saveComment(reportId, username);
    if (hasUnconfirmedUserComment) {
      try {
        await handleConfirmUserComment(reportId);
      } catch (e) {
        console.error("Auto confirm user comment error:", e);
      }
    }
    showSnackbar(
      `'${username}' 님의 보고서에 피드백 코멘트가 저장되었습니다.`,
      "success",
    );
  };

  const pendingUserCommentCount = useMemo(
    () => unreadUserComments.filter((c) => !c.isUserComment).length,
    [unreadUserComments],
  );

  // 1. 브라우저 localStorage 복원 전 깜빡임 방지용 로딩
  if (!isTeamHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <span className="text-xs text-gray-500 font-medium">
            팀 설정 불러오는 중...
          </span>
        </div>
      </div>
    );
  }

  // 2. 팀이 아직 선택되지 않았거나 팀 변경 버튼을 눌렀을 때: TeamSelectionLanding 랜딩 화면 표시!
  if (
    (!selectedTeamId || isChangingTeam) &&
    organization?.teams &&
    organization.teams.length > 0
  ) {
    return (
      <TeamSelectionLanding
        teams={organization.teams}
        users={organization.users}
        departments={organization.departments}
        divisions={organization.divisions}
        reportsByMember={currentReportsByMember}
        currentTeamId={selectedTeamId || undefined}
        onSelectTeam={handleSelectTeam}
        onCancelChange={selectedTeamId ? handleCancelChangeTeam : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. 상단 액션 바 (AI 리스크/공수/요약/비서 및 팀원 요청 코멘트 확인) */}
      <ReadReportHeader
        riskRadar={{
          isLoading: aiPrefetch.riskRadar.isLoading,
          data: aiPrefetch.riskRadar.data,
        }}
        workload={{
          isLoading: aiPrefetch.workload.isLoading,
          data: aiPrefetch.workload.data,
        }}
        pendingUserCommentCount={pendingUserCommentCount}
        onOpenRiskRadar={aiModals.actions.openRiskRadar}
        onOpenWorkload={aiModals.actions.openWorkload}
        onOpenMemberSummary={() =>
          aiModals.actions.setMemberSummaryModalOpen(true)
        }
        onOpenAiChat={() => aiModals.actions.setAiChatModalOpen(true)}
        onOpenUserCommentsModal={() => setIsUserCommentsModalOpen(true)}
      />

      {/* 2. 현재 선택된 팀 정보 바 및 팀 변경 버튼 */}
      {currentTeam && organization && (
        <TeamCurrentBar
          team={currentTeam}
          users={organization.users}
          departments={organization.departments}
          divisions={organization.divisions}
          reportsByMember={currentReportsByMember}
          onChangeTeamClick={handleStartChangeTeam}
        />
      )}

      {/* 3. 날짜 선택 스트립 */}
      <DateSelectStrip selectedDate={selectedDate} dateKeys={dateKeys} />

      {/* 4. 업무 보고 리스트 섹션 */}
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              업무 보고 리스트
            </h2>
            {currentTeam && (
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                🏢 {currentTeam.name}
              </span>
            )}
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
              제출 {submittedReports.length}명
            </span>
            {pendingUserCommentCount > 0 && (
              <button
                type="button"
                onClick={() => setIsUserCommentsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-300 px-2.5 py-0.5 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-2xs cursor-pointer animate-pulse"
                title="최근 5일간 팀원들의 미확인 요청 코멘트를 모달로 확인합니다"
              >
                <span>📬</span>
                <span>팀원 요청 {pendingUserCommentCount}건</span>
              </button>
            )}
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
                onConfirmUserComment={handleConfirmUserComment}
                onSaveComment={handleSaveCardComment}
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
                {submittedReports.map(({ username, report, teamName }) => {
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
                      teamName={teamName}
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
                        handleSaveCardComment(
                          report.id,
                          username,
                          !!report.userComment && !report.isUserComment,
                        )
                      }
                      onConfirmUserComment={handleConfirmUserComment}
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

      {/* 최근 5일 미확인 팀원 요청 코멘트 책장 넘김 팝업 모달 */}
      <UnreadUserCommentsBookModal
        isOpen={isUserCommentsModalOpen}
        comments={unreadUserComments}
        onConfirmUserComment={handleConfirmUserComment}
        onSaveMasterComment={async (reportId, username, text) => {
          await masterComment.saveCommentDirect(reportId, username, text);
        }}
        onNotifySnackbar={showSnackbar}
        onClose={() => setIsUserCommentsModalOpen(false)}
      />

      {/* 안내 스낵바 알림 */}
      <Snackbar
        isOpen={snackbar.isOpen}
        message={snackbar.message}
        type={snackbar.type}
        actionLabel={snackbar.actionLabel}
        onAction={snackbar.onAction}
        onClose={closeSnackbar}
      />
    </div>
  );
}
