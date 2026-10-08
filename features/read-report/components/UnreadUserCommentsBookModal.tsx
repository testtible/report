"use client";

import { useEffect, useState, useCallback } from "react";
import type { UnreadUserCommentItem } from "@/features/report/types/report.types";

type Props = {
  isOpen: boolean;
  comments: UnreadUserCommentItem[];
  onConfirmUserComment: (commentId: string) => Promise<void>;
  onSaveMasterComment: (
    reportId: string,
    username: string,
    commentText: string,
  ) => Promise<void>;
  onNotifySnackbar?: (
    message: string,
    type?: "success" | "info" | "warning" | "error",
  ) => void;
  onClose: () => void;
};

type FlipPhase = "idle" | "flipping-next" | "flipping-prev";

export default function UnreadUserCommentsBookModal({
  isOpen,
  comments,
  onConfirmUserComment,
  onSaveMasterComment,
  onNotifySnackbar,
  onClose,
}: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [displayPage, setDisplayPage] = useState(0);
  const [flipPhase, setFlipPhase] = useState<FlipPhase>("idle");

  // 관리자 코멘트 편집 상태
  const [isEditingMaster, setIsEditingMaster] = useState(false);
  const [masterInput, setMasterInput] = useState("");
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // 로컬 코멘트 오버라이드 (방금 수정한 코멘트 반영용)
  const [localMasterComments, setLocalMasterComments] = useState<
    Record<string, string | null>
  >({});
  const [localConfirmedIds, setLocalConfirmedIds] = useState<
    Record<string, boolean>
  >({});
  const [savedMasterSuccessIds, setSavedMasterSuccessIds] = useState<
    Record<string, boolean>
  >({});

  const totalPages = comments.length;
  const currentItem = comments[displayPage] ?? comments[0];

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
      setDisplayPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  // 페이지 바뀔 때 마스터 코멘트 인풋 초기화
  useEffect(() => {
    if (currentItem) {
      const existing =
        localMasterComments[currentItem.id] !== undefined
          ? localMasterComments[currentItem.id]
          : currentItem.masterComment;
      setMasterInput(existing ?? "");
      setIsEditingMaster(false);
    }
  }, [displayPage, currentItem, localMasterComments]);

  const changePageWithFlip = useCallback(
    (targetPage: number) => {
      if (
        flipPhase !== "idle" ||
        targetPage === currentPage ||
        targetPage < 0 ||
        targetPage >= totalPages
      ) {
        return;
      }

      const direction: "next" | "prev" =
        targetPage > currentPage ? "next" : "prev";
      setCurrentPage(targetPage);
      setFlipPhase(direction === "next" ? "flipping-next" : "flipping-prev");

      setTimeout(() => {
        setDisplayPage(targetPage);
        setFlipPhase("idle");
      }, 200);
    },
    [currentPage, flipPhase, totalPages],
  );

  const handlePrev = useCallback(() => {
    if (currentPage > 0) {
      changePageWithFlip(currentPage - 1);
    }
  }, [currentPage, changePageWithFlip]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      changePageWithFlip(currentPage + 1);
    }
  }, [currentPage, totalPages, changePageWithFlip]);

  // 키보드 단축키
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || totalPages === 0 || !currentItem) return null;

  const effectiveMasterComment =
    localMasterComments[currentItem.id] !== undefined
      ? localMasterComments[currentItem.id]
      : currentItem.masterComment;

  const isConfirmed =
    localConfirmedIds[currentItem.id] ?? currentItem.isUserComment;

  const checkItemHasFeedback = (item: UnreadUserCommentItem) => {
    const val =
      localMasterComments[item.id] !== undefined
        ? localMasterComments[item.id]
        : item.masterComment;
    return !!val && val.trim().length > 0;
  };

  const answeredFeedbackCount = comments.filter(checkItemHasFeedback).length;
  const remainingFeedbackCount = totalPages - answeredFeedbackCount;

  // 관리자 코멘트 저장 핸들러
  const handleSaveMaster = async () => {
    const trimmedInput = masterInput.trim();
    if (!trimmedInput) {
      alert("관리자 코멘트 내용을 입력해주세요.");
      return;
    }

    setIsSavingMaster(true);
    try {
      // 1. 관리자 피드백 코멘트 저장
      await onSaveMasterComment(
        currentItem.id,
        currentItem.username,
        trimmedInput,
      );

      // 2. 팀원의 요청 코멘트 자동 확인 완료 처리 ("똑같이 팀원의 코멘트는 자동 확인된거고")
      await onConfirmUserComment(currentItem.id);

      const nextMasterComments = {
        ...localMasterComments,
        [currentItem.id]: trimmedInput,
      };
      setLocalMasterComments(nextMasterComments);
      setSavedMasterSuccessIds((prev) => ({
        ...prev,
        [currentItem.id]: true,
      }));
      setLocalConfirmedIds((prev) => ({
        ...prev,
        [currentItem.id]: true,
      }));
      setIsEditingMaster(false);

      // 코멘트 작성 여부 확인 헬퍼
      const isItemAnswered = (item: UnreadUserCommentItem) => {
        if (item.id === currentItem.id) return true;
        const val =
          nextMasterComments[item.id] !== undefined
            ? nextMasterComments[item.id]
            : item.masterComment;
        return !!val && val.trim().length > 0;
      };

      const isAllAnswered = comments.every(isItemAnswered);
      const remainingItems = comments.filter((c) => !isItemAnswered(c));

      // 팀원 요청 개수별 분기:
      // 1. 팀원 요청이 1개라면 자동으로 모달창을 닫음
      // 2. 2명 이상일 때 다 작성할 때까지는 모달 유지, 모든 요청에 대해 코멘트를 남겼다면 그 때 자동으로 닫힘
      if (totalPages === 1) {
        onNotifySnackbar?.(
          `'${currentItem.username}' 님의 요청에 피드백 코멘트를 남겼으며, 확인 완료되었습니다.`,
          "success",
        );
        onClose();
      } else if (totalPages >= 2) {
        if (isAllAnswered) {
          onNotifySnackbar?.(
            "모든 팀원의 요청에 피드백 코멘트 작성을 완료했습니다.",
            "success",
          );
          onClose();
        } else {
          onNotifySnackbar?.(
            `피드백 코멘트가 저장되었습니다. (남은 미작성 요청: ${remainingItems.length}건)`,
            "info",
          );
          // 아직 코멘트가 남겨지지 않은 다음 팀원 페이지로 자동 이동
          const nextUnansweredIdx = comments.findIndex(
            (c, idx) => idx !== displayPage && !isItemAnswered(c),
          );
          if (nextUnansweredIdx !== -1) {
            setTimeout(() => {
              changePageWithFlip(nextUnansweredIdx);
            }, 300);
          }
        }
      }
    } catch {
      alert("관리자 코멘트 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingMaster(false);
    }
  };

  // 팀원 요청 코멘트 확인 완료 핸들러
  const handleConfirmItem = async () => {
    setIsConfirming(true);
    try {
      await onConfirmUserComment(currentItem.id);
      setLocalConfirmedIds((prev) => ({
        ...prev,
        [currentItem.id]: true,
      }));
    } finally {
      setIsConfirming(false);
    }
  };

  const animationClass =
    flipPhase === "flipping-next"
      ? "animate-[bookFlipNextIn_0.2s_ease-out_forwards]"
      : flipPhase === "flipping-prev"
        ? "animate-[bookFlipPrevIn_0.2s_ease-out_forwards]"
        : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-indigo-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 px-5 sm:px-6 py-3.5 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-base backdrop-blur-xs">
                📬
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight flex items-center gap-2">
                  <span>팀원 요청 코멘트 확인</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                    총 {totalPages}건
                  </span>
                  {totalPages >= 2 && (
                    remainingFeedbackCount > 0 ? (
                      <span className="rounded-full bg-amber-400 text-amber-950 px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                        남은 피드백 {remainingFeedbackCount}건
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-400 text-emerald-950 px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                        ✓ 전체 작성 완료
                      </span>
                    )
                  )}
                </h3>
                <p className="text-[11px] text-blue-100 mt-0.5">
                  최근 5일간 팀원들이 팀장님께 남긴 요청 및 문의사항입니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="닫기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 상단 팀원 북마크 탭 바 */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 bg-gray-50 border-b border-gray-200/80 shrink-0 scrollbar-none">
          <span className="text-[11px] text-gray-500 font-medium shrink-0 mr-1 flex items-center gap-1">
            <span>📑</span> 요청 목록:
          </span>
          {comments.map((item, idx) => {
            const isActive = idx === currentPage;
            const itemConfirmed =
              localConfirmedIds[item.id] ?? item.isUserComment;
            const itemHasFeedback = checkItemHasFeedback(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => changePageWithFlip(idx)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-2xs scale-102"
                    : "bg-white text-gray-700 hover:bg-indigo-50 border border-gray-200/90"
                }`}
              >
                <span>{item.username}</span>
                <span className={`text-[10px] ${isActive ? "text-indigo-200" : "text-gray-400"}`}>
                  {item.date.slice(5)}
                </span>
                {itemHasFeedback ? (
                  <span
                    className={`inline-flex items-center text-[10px] font-bold ${
                      isActive ? "text-emerald-200" : "text-emerald-600"
                    }`}
                    title="피드백 작성 완료"
                  >
                    ✓
                  </span>
                ) : (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      itemConfirmed
                        ? "bg-emerald-400"
                        : isActive
                          ? "bg-amber-300 animate-pulse"
                          : "bg-amber-500"
                    }`}
                    title={itemConfirmed ? "확인 완료" : "확인 대기"}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 책장 스테이지 (스크롤 가능 영역) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 relative bg-gradient-to-b from-gray-50/50 to-white">
          {/* 책 속지 효과 배경 그림자 */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 overflow-hidden">
            {/* 좌측 책 제본선 효과 */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-gray-300/40 via-gray-100/30 to-transparent border-r border-gray-200/50 pointer-events-none z-10" />

            {/* 카드 내부 애니메이션 영역 */}
            <div
              className={`transition-all duration-200 pl-2 sm:pl-3 space-y-4 ${animationClass}`}
              style={{
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
            >
              {/* 카드 상단 정보 */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                    {displayPage + 1}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {currentItem.username} 님의 업무 보고 요청
                  </span>
                  <span className="rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 border border-blue-200/80">
                    📅 {currentItem.date}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    📖 {displayPage + 1} / {totalPages}
                  </span>
                </div>
              </div>

              {/* 팀원 요청 코멘트 본문 */}
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-indigo-50/60 p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-600 text-white text-[11px]">
                      💬
                    </span>
                    <span>팀원 요청 코멘트</span>
                  </label>
                  {isConfirmed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      팀장 확인 완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      팀장 확인 대기
                    </span>
                  )}
                </div>
                <div className="rounded-lg bg-white/95 border border-blue-100 p-3 shadow-2xs">
                  <p className="text-xs sm:text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {currentItem.userComment}
                  </p>
                </div>
              </div>

              {/* 관리자 피드백 / 코멘트 작성 및 확인 섹션 */}
              <div className="rounded-xl border border-indigo-200/80 bg-gray-50/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <span>✍️</span> 관리자 코멘트 (피드백)
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {effectiveMasterComment ? "등록된 코멘트가 있습니다" : "요청에 대한 피드백을 바로 남겨보세요"}
                  </span>
                </div>

                {/* 관리자 코멘트 전송 성공 안내 배너 */}
                {savedMasterSuccessIds[currentItem.id] && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <span>✓</span>
                    <span>관리자 피드백 코멘트가 전송되었습니다. (팀원에게 새 피드백으로 전달됨)</span>
                  </div>
                )}

                {isEditingMaster ? (
                  <div className="space-y-2 bg-white rounded-lg p-3 border border-indigo-200 shadow-2xs">
                    <textarea
                      rows={3}
                      value={masterInput}
                      onChange={(e) => setMasterInput(e.target.value)}
                      placeholder="팀원의 요청에 대한 답변이나 관리자 메모를 남겨주세요."
                      className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-indigo-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
                      disabled={isSavingMaster}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingMaster(false)}
                        disabled={isSavingMaster}
                        className="px-2.5 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMaster}
                        disabled={isSavingMaster}
                        className="px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isSavingMaster ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                ) : effectiveMasterComment ? (
                  <div className="flex items-start justify-between gap-3 bg-white border border-indigo-100 rounded-lg p-3 shadow-2xs">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {effectiveMasterComment}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMasterInput(effectiveMasterComment);
                        setIsEditingMaster(true);
                      }}
                      className="shrink-0 px-2 py-1 text-[11px] font-semibold rounded border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      수정
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-gray-500">
                      아직 작성된 관리자 코멘트가 없습니다.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingMaster(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>관리자 코멘트 남기기</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 확인 완료 처리 버튼 */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <p className="text-[11px] text-gray-500">
                  {isConfirmed
                    ? "✓ 이미 확인 처리가 완료된 요청입니다."
                    : "아래 버튼을 누르면 팀원에게 확인 상태가 표시됩니다."}
                </p>
                {!isConfirmed && (
                  <button
                    type="button"
                    onClick={handleConfirmItem}
                    disabled={isConfirming}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{isConfirming ? "확인 처리 중..." : "요청 확인 완료"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 하단 책장 넘기기 컨트롤러 및 닫기 버튼 */}
        <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentPage === 0 || flipPhase !== "idle"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                currentPage === 0
                  ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-100"
                  : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100 cursor-pointer shadow-2xs"
              }`}
            >
              ◀ 이전
            </button>
            <span className="text-xs font-bold text-gray-600 px-1">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentPage === totalPages - 1 || flipPhase !== "idle"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                currentPage === totalPages - 1
                  ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-100"
                  : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100 cursor-pointer shadow-2xs"
              }`}
            >
              다음 ▶
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
