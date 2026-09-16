"use client";

import { useEffect, useState, useCallback } from "react";
import MarkdownView from "@/app/components/MarkdownView";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  reports: Array<{ username: string; content: string }>;
};

export default function ProjectSummaryModal({
  isOpen,
  onClose,
  selectedDate,
  reports,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  const fetchProjectSummary = useCallback(async () => {
    if (reports.length === 0) {
      setError("취합할 제출 보고서가 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    setIsCopied(false);

    try {
      const res = await fetch("/api/report/project-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          reports,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "프로젝트 취합 생성에 실패했습니다.");
        return;
      }

      setSummary(data.summary || "정리된 내용이 없습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [reports, selectedDate]);

  useEffect(() => {
    if (isOpen) {
      setSummary(null);
      fetchProjectSummary();
    }
  }, [isOpen, fetchProjectSummary]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-slate-50 via-purple-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-200">
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">
                  프로젝트별 보고 취합 정리
                </h3>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                  AI 자동 분류
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedDate} · 팀원 {reports.length}명의 보고서를 프로젝트 단위로 그룹화했습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
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

        {/* 본문 영역 */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-3 border-purple-100 border-t-purple-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-600 animate-pulse"
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
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-gray-800">
                  보고서를 프로젝트별로 취합 중입니다...
                </p>
                <p className="text-xs text-gray-500">
                  팀원들의 업무 내용에서 공통 프로젝트와 세부 항목을 분류하고 있습니다.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                type="button"
                onClick={fetchProjectSummary}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 보기 모드 선택 탭 */}
              <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                <span className="text-xs text-gray-500 font-medium">
                  {viewMode === "formatted" ? "✨ 마크다운 서식으로 정리된 화면입니다" : "📄 복사용 일반 텍스트 화면입니다"}
                </span>
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("formatted")}
                    className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                      viewMode === "formatted"
                        ? "bg-white text-purple-700 shadow-xs font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    ✨ 서식 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("raw")}
                    className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                      viewMode === "raw"
                        ? "bg-white text-purple-700 shadow-xs font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    📄 텍스트 원문
                  </button>
                </div>
              </div>

              {viewMode === "formatted" ? (
                <div className="rounded-xl bg-white border border-purple-100 p-5 shadow-xs text-sm leading-relaxed text-gray-800">
                  <MarkdownView content={summary} />
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-gray-200 p-5 font-mono text-xs leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {summary}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="border-t border-gray-200 px-6 py-3.5 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            disabled={loading}
            onClick={fetchProjectSummary}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-purple-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            다시 취합하기
          </button>

          <div className="flex items-center gap-2">
            {summary && !loading && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-emerald-600 font-semibold">복사 완료!</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-purple-600"
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
                    전체 내용 복사
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
