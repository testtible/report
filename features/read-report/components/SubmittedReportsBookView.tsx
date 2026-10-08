"use client";

import { useEffect, useRef, useState } from "react";
import type { MemberReport } from "@/app/lib/attachments";
import SubmittedReportCard from "@/features/read-report/components/SubmittedReportCard";

type SubmittedReportItem = {
  username: string;
  report: MemberReport;
  teamName?: string;
};

type Props = {
  submittedReports: SubmittedReportItem[];
  masterComment: {
    getEffectiveComment: (
      username: string,
      initialComment: string | null | undefined,
    ) => string;
    editingCommentMember: string | null;
    commentInput: string;
    isSavingComment: boolean;
    setCommentInput: (val: string) => void;
    startEditComment: (username: string, initialComment: string) => void;
    cancelEditComment: () => void;
    saveComment: (reportId: string, username: string) => Promise<void>;
  };
  onExpandAll: () => void;
  onConfirmUserComment?: (reportId: string) => Promise<void>;
  onSaveComment?: (
    reportId: string,
    username: string,
    hasUnconfirmedUserComment: boolean,
  ) => Promise<void>;
};

type FlipPhase = "idle" | "turning-out" | "turning-in";
type FlipDirection = "next" | "prev" | null;

export default function SubmittedReportsBookView({
  submittedReports,
  masterComment,
  onExpandAll,
  onConfirmUserComment,
  onSaveComment,
}: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [displayPage, setDisplayPage] = useState(0);
  const [flipPhase, setFlipPhase] = useState<FlipPhase>("idle");
  const [flipDirection, setFlipDirection] = useState<FlipDirection>(null);

  const isTransitioningRef = useRef(false);

  // 보고서 개수가 변경되었을 때 인덱스 보정
  useEffect(() => {
    if (currentPage >= submittedReports.length) {
      const clamped = Math.max(0, submittedReports.length - 1);
      setCurrentPage(clamped);
      setDisplayPage(clamped);
    }
  }, [submittedReports.length, currentPage]);

  // 책장 넘기기 (페이지 전환) 함수
  const goToPage = (targetIndex: number) => {
    if (isTransitioningRef.current) return;
    if (targetIndex === currentPage) return;
    if (targetIndex < 0 || targetIndex >= submittedReports.length) return;

    const direction: FlipDirection =
      targetIndex > currentPage ? "next" : "prev";

    isTransitioningRef.current = true;
    setFlipDirection(direction);
    setFlipPhase("turning-out");

    // 1단계: 현재 페이지가 책장 축을 중심으로 들리며 회전 (200ms)
    setTimeout(() => {
      setCurrentPage(targetIndex);
      setDisplayPage(targetIndex);
      setFlipPhase("turning-in");

      // 2단계: 새 페이지가 펼쳐지며 안착 (230ms)
      setTimeout(() => {
        setFlipPhase("idle");
        setFlipDirection(null);
        isTransitioningRef.current = false;
      }, 230);
    }, 200);
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < submittedReports.length - 1) {
      goToPage(currentPage + 1);
    }
  };

  // 키보드 좌우 방향키로 책장 넘기기 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (submittedReports.length === 0) return null;

  const currentItem = submittedReports[displayPage] || submittedReports[0];
  const totalPages = submittedReports.length;

  const prevItem = currentPage > 0 ? submittedReports[currentPage - 1] : null;
  const nextItem =
    currentPage < totalPages - 1 ? submittedReports[currentPage + 1] : null;

  // 플립 애니메이션 클래스 결정
  let animationClass = "";
  if (flipPhase === "turning-out") {
    animationClass =
      flipDirection === "next"
        ? "animate-book-flip-next-out"
        : "animate-book-flip-prev-out";
  } else if (flipPhase === "turning-in") {
    animationClass =
      flipDirection === "next"
        ? "animate-book-flip-next-in"
        : "animate-book-flip-prev-in";
  }

  const effectiveComment = masterComment.getEffectiveComment(
    currentItem.username,
    currentItem.report.masterComment,
  );
  const isEditingThis =
    masterComment.editingCommentMember === currentItem.username;

  return (
    <div className="space-y-4">
      {/* 1. 상단 팀원 북마크 탭 (원하는 팀원으로 바로 넘기기) */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
          <span className="text-[11px] font-semibold text-gray-400 shrink-0 mr-1 flex items-center gap-1">
            <span>🔖</span>
            <span className="hidden sm:inline">팀원 바로가기:</span>
          </span>
          {submittedReports.map((item, index) => {
            const isActive = index === currentPage;
            const hasMasterComment = !!item.report.masterComment;
            const isConfirmed = !!item.report.isConfirmMasterComment;
            const hasAttachment = !!item.report.attachmentName;

            return (
              <button
                key={item.username}
                type="button"
                onClick={() => goToPage(index)}
                disabled={flipPhase !== "idle"}
                className={`group shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-xs ring-2 ring-indigo-200"
                    : "bg-gray-100/90 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border border-gray-200/80 hover:border-indigo-200"
                } disabled:opacity-60`}
                title={`${item.username} 님의 보고서 (${index + 1}/${totalPages})`}
              >
                <span
                  className={`text-[11px] ${
                    isActive ? "text-indigo-200" : "text-gray-400"
                  }`}
                >
                  {index + 1}.
                </span>
                <span>{item.username}</span>

                {/* 첨부파일 표시 */}
                {hasAttachment && (
                  <span
                    className={`text-[10px] ${
                      isActive ? "text-indigo-200" : "text-gray-400"
                    }`}
                    title="첨부파일 있음"
                  >
                    📎
                  </span>
                )}

                {/* 관리자 코멘트 배지 */}
                {hasMasterComment && (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isConfirmed
                        ? "bg-emerald-400"
                        : isActive
                          ? "bg-amber-300"
                          : "bg-amber-500"
                    }`}
                    title={
                      isConfirmed ? "코멘트 확인 완료" : "관리자 코멘트 있음"
                    }
                  />
                )}

                {/* 팀원 요청 코멘트 배지 */}
                {item.report.userComment && (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      item.report.isUserComment
                        ? "bg-blue-300"
                        : isActive
                          ? "bg-blue-200 animate-pulse"
                          : "bg-blue-500 animate-pulse"
                    }`}
                    title={
                      item.report.isUserComment
                        ? "팀원 요청 확인 완료"
                        : "팀원 요청 확인 대기"
                    }
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 펼치기 바로가기 버튼 */}
        <button
          type="button"
          onClick={onExpandAll}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer"
          title="모든 팀원의 보고서를 세로로 한 번에 펼쳐봅니다"
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
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          <span className="hidden sm:inline">전체 펼치기</span>
        </button>
      </div>

      {/* 2. 책장 스테이지 (3D 책장 프레임 & 단일 카드 넘기기) */}
      <div className="relative">
        {/* 책 속지 레이어 느낌의 배경 스택 그림자 효과 (페이지가 여러 장 겹쳐있는 모습) */}
        <div className="absolute inset-0 bg-gray-100 rounded-2xl transform translate-x-1.5 translate-y-1.5 border border-gray-200/60 -z-10 shadow-xs pointer-events-none" />
        <div className="absolute inset-0 bg-gray-50 rounded-2xl transform translate-x-0.5 translate-y-0.5 border border-gray-200/40 -z-5 pointer-events-none" />

        {/* 메인 책 페이지 컨테이너 */}
        <div
          className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 overflow-hidden"
          style={{ perspective: "1400px" }}
        >
          {/* 책 제본선(Spine) 느낌의 좌측 그라데이션 및 바인딩 스티치 */}
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-gray-300/40 via-gray-100/30 to-transparent border-r border-gray-200/50 pointer-events-none z-20" />

          {/* 상단 페이지 정보 헤더 */}
          <div className="flex items-center justify-between gap-2 mb-3 pl-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                {displayPage + 1}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {currentItem.username} 님의 업무 보고
              </span>
              {currentItem.report.attachmentName && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                  📎 첨부파일
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                📖 {displayPage + 1} / {totalPages} 페이지
              </span>
            </div>
          </div>

          {/* 3D 플립 애니메이션이 적용되는 단일 카드 영역 */}
          <div
            className={`transition-all duration-200 ${animationClass}`}
            style={{
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
          >
            <SubmittedReportCard
              username={currentItem.username}
              report={currentItem.report}
              teamName={currentItem.teamName}
              currentComment={effectiveComment}
              isEditingComment={isEditingThis}
              commentInput={masterComment.commentInput}
              isSavingComment={masterComment.isSavingComment}
              onChangeCommentInput={masterComment.setCommentInput}
              onStartEditComment={() =>
                masterComment.startEditComment(
                  currentItem.username,
                  effectiveComment,
                )
              }
              onCancelEditComment={masterComment.cancelEditComment}
              onSaveComment={() => {
                if (onSaveComment) {
                  return onSaveComment(
                    currentItem.report.id,
                    currentItem.username,
                    !!currentItem.report.userComment &&
                      !currentItem.report.isUserComment,
                  );
                }
                return masterComment.saveComment(
                  currentItem.report.id,
                  currentItem.username,
                );
              }}
              onConfirmUserComment={onConfirmUserComment}
            />
          </div>
        </div>
      </div>

      {/* 3. 하단 책장 네비게이션 & 페이지네이션 컨트롤러 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-1">
        {/* 이전 페이지 버튼 */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage === 0 || flipPhase !== "idle"}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
            currentPage === 0
              ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-400 hover:text-indigo-600 shadow-2xs cursor-pointer active:scale-98"
          }`}
          title="이전 팀원 보고서로 이동"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>
            {prevItem ? `이전 (${prevItem.username})` : "첫 번째 보고서"}
          </span>
        </button>

        {/* 중앙 페이지 인디케이터 도트 */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            {submittedReports.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToPage(idx)}
                disabled={flipPhase !== "idle"}
                className={`transition-all duration-200 rounded-full cursor-pointer ${
                  idx === currentPage
                    ? "w-6 h-2 bg-indigo-600 shadow-2xs"
                    : "w-2 h-2 bg-gray-300 hover:bg-indigo-300"
                }`}
                title={`${idx + 1}페이지로 이동`}
              />
            ))}
          </div>
          <span className="text-[13px] text-gray-500 hidden sm:inline font-bold">
            키보드 방향키 [ ← ] [ → ] 로도 넘길 수 있습니다
          </span>
        </div>

        {/* 다음 페이지 버튼 */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage === totalPages - 1 || flipPhase !== "idle"}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
            currentPage === totalPages - 1
              ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
              : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 shadow-2xs cursor-pointer active:scale-98"
          }`}
          title="다음 팀원 보고서로 이동"
        >
          <span>
            {nextItem ? `다음 (${nextItem.username})` : "마지막 보고서"}
          </span>
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
