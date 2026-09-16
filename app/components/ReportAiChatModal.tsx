"use client";

import { useEffect, useRef, useState } from "react";
import MarkdownView from "@/app/components/MarkdownView";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const SUGGESTED_QUESTIONS = [
  "최근 팀원들이 보고한 이슈나 장애 사항 요약해줘",
  "각 팀원별 주요 진행 업무와 성과를 정리해줘",
  "일정 지연이나 추가 지원이 필요한 업무가 있어?",
  "외부 미팅이나 출장 관련 보고 내역 알려줘",
];

export default function ReportAiChatModal({ isOpen, onClose }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const answerContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때 input에 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  // 스트리밍 중 스크롤 최하단 유지
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
    if (answerContainerRef.current) {
      answerContainerRef.current.scrollTop = answerContainerRef.current.scrollHeight;
    }
  }, [answer]);

  if (!isOpen) return null;

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleAsk = async (promptQuestion?: string) => {
    const q = (promptQuestion ?? question).trim();
    if (!q) return;

    if (promptQuestion) {
      setQuestion(promptQuestion);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);
    setAnswer("");
    setIsCopied(false);
    setLoadingStage("1/2단계: 사내 DB 전체에서 관련 보고서를 검색 및 추출하고 있습니다...");

    const stageTimer = setTimeout(() => {
      setLoadingStage(
        "2/2단계: 사내 온프레미스 AI(Ollama)가 보고서를 정밀 분석하여 답변을 구성 중입니다 (약 5~15초 소요)..."
      );
    }, 2000);

    try {
      const response = await fetch("/api/report/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setAnswer((prev) => prev + chunk);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // 사용자에 의한 요청 중단
        return;
      }
      const message =
        err instanceof Error ? err.message : "AI 답변 생성 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      clearTimeout(stageTimer);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopy = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      alert("답변 복사에 실패했습니다.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">
                  보고서 AI 질의응답 비서
                </h3>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  사내 로컬 LLM
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                기한 제한 없이 전체 팀원 보고서 DB를 기반으로 실시간 답변합니다.
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

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* 추천 질문 칩 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              💡 추천 질문 클릭
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleAsk(item)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors disabled:opacity-50 cursor-pointer text-left"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 질문 입력 창 (input) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
              placeholder="궁금한 내용을 질문해 보세요 (예: OOO 님의 최근 업무 내용 요약)"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all disabled:bg-gray-50"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition-all cursor-pointer"
              >
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                중지
              </button>
            ) : (
              <button
                type="submit"
                disabled={!question.trim()}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all cursor-pointer"
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
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                질문하기
              </button>
            )}
          </form>

          {/* 에러 발생 시 */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
              <svg
                className="w-4 h-4 shrink-0 mt-0.5 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* 실시간 타이핑되는 답변 영역 */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <span>AI 분석 답변</span>
                  {isLoading && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-normal text-indigo-600">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
                      실시간 생성 중...
                    </span>
                  )}
                </label>

                {answer && (
                  <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewMode("formatted")}
                      className={`rounded px-2 py-0.5 transition-all cursor-pointer ${
                        viewMode === "formatted"
                          ? "bg-white text-indigo-700 shadow-xs font-semibold"
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
                          ? "bg-white text-indigo-700 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      📄 원문
                    </button>
                  </div>
                )}
              </div>

              {answer && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
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
                      <span className="text-emerald-600">복사됨!</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
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
                      답변 복사
                    </>
                  )}
                </button>
              )}
            </div>

            {viewMode === "formatted" && answer ? (
              <div
                ref={answerContainerRef}
                className="h-72 w-full overflow-y-auto rounded-xl border border-indigo-100 bg-slate-50/50 p-4 text-sm leading-relaxed text-gray-800 shadow-inner"
              >
                <MarkdownView content={answer} />
              </div>
            ) : (
              <textarea
                id="ai-answer-textarea"
                ref={textareaRef}
                readOnly
                rows={11}
                value={
                  answer
                    ? answer
                    : isLoading
                    ? loadingStage || "보고서 데이터를 분석하고 있습니다..."
                    : "질문을 입력하시면 전체 팀원 보고서 DB를 분석하여 실시간으로 답변이 작성됩니다."
                }
                className={`w-full rounded-xl border p-4 text-sm font-mono leading-relaxed outline-none transition-all resize-none ${
                  answer
                    ? "bg-slate-50 border-gray-300 text-gray-900"
                    : "bg-gray-50 border-gray-200 text-gray-400 italic"
                }`}
              />
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
