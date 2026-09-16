"use client";

import { useEffect, useRef, useState } from "react";
import { MEMBERS } from "@/app/lib/members";
import MarkdownView from "@/app/components/MarkdownView";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MemberSummaryModal({ isOpen, onClose }: Props) {
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 모달 닫힐 때 요청 중단 및 초기화
  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsLoading(false);
      setLoadingStage("");
    }
  }, [isOpen]);

  // 스트리밍 중 스크롤 최하단 유지
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [summary]);

  const handleSelectMember = (username: string) => {
    if (!username) return;
    setSelectedMember(username);
    fetchSummary(username);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setLoadingStage("");
  };

  const fetchSummary = async (username: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);
    setSummary("");
    setLoadingStage(`${username} 팀원의 최근 5일치 보고서를 조회하고 있습니다...`);

    const stageTimer = setTimeout(() => {
      setLoadingStage("사내 AI 모델이 5일치 보고서 내용을 분석 및 요약 중입니다...");
    }, 2000);

    try {
      const response = await fetch("/api/report/member-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error || `서버 에러가 발생했습니다. (${response.status})`
        );
      }

      if (!response.body) {
        throw new Error("스트리밍 응답 본문이 비어있습니다.");
      }

      setLoadingStage("");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setSummary((prev) => prev + chunk);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message =
        err instanceof Error ? err.message : "요약 생성 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      clearTimeout(stageTimer);
      setIsLoading(false);
      setLoadingStage("");
      abortControllerRef.current = null;
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      alert("요약 복사에 실패했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-slate-50 via-purple-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">
                  최근 팀원 보고 AI 요약
                </h3>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                  최근 5일치 취합
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                팀원을 선택하면 최근 5일치 일일 보고서를 취합하여 실시간으로 요약합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 모달 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 팀원 선택 섹션 */}
          <div className="rounded-xl bg-slate-50 border border-gray-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="member-select" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <span>요약할 팀원 선택</span>
                <span className="font-normal text-gray-400">· 6명</span>
              </label>

              <div className="flex items-center gap-2">
                {/* 팀원 드롭다운 select */}
                <select
                  id="member-select"
                  value={selectedMember}
                  onChange={(e) => handleSelectMember(e.target.value)}
                  disabled={isLoading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none cursor-pointer disabled:bg-gray-100"
                >
                  <option value="" disabled>
                    팀원을 선택해주세요
                  </option>
                  {MEMBERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* 중단 / 다시 요약 버튼 */}
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>생성 중단</span>
                  </button>
                ) : (
                  selectedMember && (
                    <button
                      type="button"
                      onClick={() => fetchSummary(selectedMember)}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>다시 요약</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 빠른 선택 뱃지 버튼들 */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MEMBERS.map((m) => {
                const isCurrent = selectedMember === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSelectMember(m)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-purple-600 text-white shadow-xs font-semibold"
                        : "border border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50 disabled:opacity-50"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 에러 알림 */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* 실시간 요약 결과 영역 */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <span>AI 종합 요약 결과</span>
                  {isLoading && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-normal text-purple-600">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-600 animate-ping" />
                      한 글자씩 실시간 생성 중...
                    </span>
                  )}
                </span>

                {summary && (
                  <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewMode("formatted")}
                      className={`rounded px-2 py-0.5 transition-all cursor-pointer ${
                        viewMode === "formatted"
                          ? "bg-white text-purple-700 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      ✨ 서식
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("raw")}
                      className={`rounded px-2 py-0.5 transition-all cursor-pointer ${
                        viewMode === "raw"
                          ? "bg-white text-purple-700 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      📄 원문
                    </button>
                  </div>
                )}
              </div>

              {summary && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-purple-600 transition-colors cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-600 font-semibold">복사됨!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 3h6" />
                      </svg>
                      <span>요약 복사</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 본문 렌더링 */}
            {summary ? (
              viewMode === "formatted" ? (
                <div
                  ref={containerRef}
                  className="h-80 w-full overflow-y-auto rounded-xl border border-purple-100 bg-white p-5 text-sm leading-relaxed text-gray-800 shadow-inner"
                >
                  <MarkdownView content={summary} />
                </div>
              ) : (
                <textarea
                  id="summary-raw-textarea"
                  ref={textareaRef}
                  readOnly
                  rows={13}
                  value={summary}
                  className="w-full rounded-xl border border-gray-300 bg-slate-50 p-4 text-xs font-mono leading-relaxed outline-none transition-all resize-none text-gray-900 shadow-inner"
                />
              )
            ) : (
              <div className="h-80 w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-6 text-center">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-8 w-8 mx-auto rounded-full border-3 border-purple-200 border-t-purple-600 animate-spin" />
                    <p className="text-xs font-medium text-gray-600">{loadingStage}</p>
                    <p className="text-[11px] text-gray-400">잠시만 기다려주세요...</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-gray-400">
                    <svg className="w-10 h-10 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600">
                      요약할 팀원을 상단에서 선택해주세요.
                    </p>
                    <p className="text-xs text-gray-400">
                      최근 5일간 작성된 보고서 내용을 취합하여 마크다운 서식으로 실시간 스트리밍 요약합니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>* 사내 폐쇄망 온프레미스 LLM을 활용하여 외부로 데이터가 유출되지 않습니다.</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
