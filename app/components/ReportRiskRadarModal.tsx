"use client";

import { useEffect, useState } from "react";
import MarkdownView from "@/app/components/MarkdownView";

type RiskItem = {
  level: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  project: string;
  member: string;
  date: string;
  description: string;
  actionPlan: string;
};

type RiskRadarData = {
  analyzedDateRange: string;
  totalReports: number;
  summary: string;
  risks: RiskItem[];
  rawText?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ReportRiskRadarModal({ isOpen, onClose }: Props) {
  const [data, setData] = useState<RiskRadarData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<
    "ALL" | "CRITICAL" | "WARNING" | "INFO"
  >("ALL");

  const loadRiskRadar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report/risk-radar", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "리스크 분석 요청에 실패했습니다.");
      }
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRiskRadar();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const criticalCount =
    data?.risks?.filter((r) => r.level === "CRITICAL").length || 0;
  const warningCount =
    data?.risks?.filter((r) => r.level === "WARNING").length || 0;
  const infoCount = data?.risks?.filter((r) => r.level === "INFO").length || 0;

  const filteredRisks =
    data?.risks?.filter((r) => {
      if (filterLevel === "ALL") return true;
      return r.level === filterLevel;
    }) || [];

  const getLevelBadge = (level: "CRITICAL" | "WARNING" | "INFO") => {
    switch (level) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
            🚨 심각
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            ⚠️ 주의
          </span>
        );
      case "INFO":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            ℹ️ 관찰
          </span>
        );
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
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-rose-50/70 via-amber-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-200 text-lg">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">
                  AI 프로젝트 리스크 레이더
                </h3>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                  병목 &amp; 장애 조기 감지
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                최근 2주간 보고서에서 일정 지연, 기술적 난제, 자재 수급 불량 등
                잠재 위험을 자동 추출합니다.
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

        {/* 본문 */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-rose-500 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-800">
                사내 AI가 최근 보고서의 기술적 위험 요소를 스캔하고 있습니다...
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2.5">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold text-sm">분석 오류</p>
                <p className="mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={loadRiskRadar}
                  className="mt-2 rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {/* 총평 & 카운터 배너 */}
              <div className="rounded-xl border border-gray-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">
                      분석 대상 기간:{" "}
                    </span>
                    <span className="font-mono">{data.analyzedDateRange}</span>
                    <span className="ml-2 text-gray-400">
                      (보고서 {data.totalReports}건 분석)
                    </span>
                  </div>
                  {/* 통계 칩 */}
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">
                      심각 {criticalCount}건
                    </span>
                    <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700">
                      주의 {warningCount}건
                    </span>
                    <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                      관찰 {infoCount}건
                    </span>
                  </div>
                </div>
                {data.summary && (
                  <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed bg-white border border-gray-200/80 rounded-lg p-3 shadow-2xs">
                    💡{" "}
                    <span className="font-semibold text-indigo-950">
                      AI 종합 진단:{" "}
                    </span>
                    {data.summary}
                  </p>
                )}
              </div>

              {/* 필터 탭 */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 flex-wrap gap-2">
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterLevel("ALL")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
                      filterLevel === "ALL"
                        ? "bg-white text-gray-900 shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    전체 ({data.risks?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel("CRITICAL")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
                      filterLevel === "CRITICAL"
                        ? "bg-rose-600 text-white shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    심각 ({criticalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel("WARNING")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
                      filterLevel === "WARNING"
                        ? "bg-amber-600 text-white shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    주의 ({warningCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel("INFO")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
                      filterLevel === "INFO"
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    관찰 ({infoCount})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadRiskRadar}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
                  다시 분석
                </button>
              </div>

              {/* 리스크 카드 리스트 */}
              {filteredRisks.length > 0 ? (
                <div className="space-y-3">
                  {filteredRisks.map((item, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border p-4 space-y-2.5 shadow-2xs transition-all ${
                        item.level === "CRITICAL"
                          ? "border-rose-200 bg-rose-50/20 hover:border-rose-300"
                          : item.level === "WARNING"
                            ? "border-amber-200 bg-amber-50/20 hover:border-amber-300"
                            : "border-blue-200 bg-blue-50/20 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getLevelBadge(item.level)}
                            <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-700">
                              {item.project}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                              담당:{" "}
                              <strong className="text-gray-800">
                                {item.member}
                              </strong>
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              ({item.date})
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 pt-0.5">
                            {item.title}
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-white/80 rounded-lg p-2.5 border border-gray-100">
                        {item.description}
                      </p>

                      {/* 팀장 액션 플랜 */}
                      <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/80 p-2.5 flex items-start gap-2 text-xs">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">
                          💡 권장 조치:
                        </span>
                        <span className="text-emerald-900 font-medium leading-relaxed">
                          {item.actionPlan}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : data.rawText ? (
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 text-xs leading-relaxed">
                  <MarkdownView content={data.rawText} />
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-gray-500">
                  <span className="text-2xl">🎉</span>
                  <p className="mt-2 font-medium">
                    선택한 조건에 해당하는 리스크 및 지연 이슈가 없습니다.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>* 사내 온프레미스 AI 기반 자동 위험 분석 결과입니다.</span>
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
