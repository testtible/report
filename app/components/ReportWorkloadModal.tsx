"use client";

import { useCallback, useEffect, useState } from "react";
import MarkdownView from "@/app/components/MarkdownView";

type ProjectItem = {
  name: string;
  percentage: number;
  color?: string;
  description: string;
  members: string[];
};

type MemberWorkload = {
  username: string;
  primaryProject: string;
  recentFocus: string;
  workloadStatus: "HIGH" | "NORMAL" | "LOW";
};

type WorkloadData = {
  analyzedDateRange: string;
  totalReports: number;
  summary: string;
  projects: ProjectItem[];
  memberWorkloads: MemberWorkload[];
  teamInsights: string;
  rawText?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data?: WorkloadData | null;
  isLoading?: boolean;
  error?: string | null;
  updatedAt?: number | null;
  onRefresh?: () => void;
};

type ColorTheme = {
  bar: string;
  badge: string;
  cardBorder: string;
  dot: string;
  text: string;
};

const COLOR_MAP: Record<string, ColorTheme> = {
  blue: {
    bar: "bg-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    cardBorder: "border-l-blue-500",
    dot: "bg-blue-600",
    text: "text-blue-700",
  },
  amber: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    cardBorder: "border-l-amber-500",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  emerald: {
    bar: "bg-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cardBorder: "border-l-emerald-500",
    dot: "bg-emerald-600",
    text: "text-emerald-700",
  },
  purple: {
    bar: "bg-purple-600",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    cardBorder: "border-l-purple-500",
    dot: "bg-purple-600",
    text: "text-purple-700",
  },
  rose: {
    bar: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    cardBorder: "border-l-rose-500",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  teal: {
    bar: "bg-teal-600",
    badge: "bg-teal-50 text-teal-800 border-teal-200",
    cardBorder: "border-l-teal-500",
    dot: "bg-teal-600",
    text: "text-teal-700",
  },
  orange: {
    bar: "bg-orange-500",
    badge: "bg-orange-50 text-orange-800 border-orange-200",
    cardBorder: "border-l-orange-500",
    dot: "bg-orange-500",
    text: "text-orange-700",
  },
  indigo: {
    bar: "bg-indigo-600",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    cardBorder: "border-l-indigo-500",
    dot: "bg-indigo-600",
    text: "text-indigo-700",
  },
  cyan: {
    bar: "bg-cyan-600",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-200",
    cardBorder: "border-l-cyan-500",
    dot: "bg-cyan-600",
    text: "text-cyan-700",
  },
  fuchsia: {
    bar: "bg-fuchsia-600",
    badge: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",
    cardBorder: "border-l-fuchsia-500",
    dot: "bg-fuchsia-600",
    text: "text-fuchsia-700",
  },
  lime: {
    bar: "bg-lime-600",
    badge: "bg-lime-50 text-lime-800 border-lime-200",
    cardBorder: "border-l-lime-500",
    dot: "bg-lime-600",
    text: "text-lime-700",
  },
  green: {
    bar: "bg-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cardBorder: "border-l-emerald-500",
    dot: "bg-emerald-600",
    text: "text-emerald-700",
  },
};

// 인접 프로젝트 간 대비를 극대화하는 고대비 팔레트 시퀀스
const DISTINCT_PALETTE: string[] = [
  "blue",
  "amber",
  "emerald",
  "purple",
  "rose",
  "teal",
  "orange",
  "cyan",
  "fuchsia",
  "indigo",
  "lime",
];

function getProjectColor(idx: number): ColorTheme {
  const key = DISTINCT_PALETTE[idx % DISTINCT_PALETTE.length];
  return COLOR_MAP[key] || COLOR_MAP.blue;
}

export default function ReportWorkloadModal({
  isOpen,
  onClose,
  data: propData,
  isLoading: propIsLoading,
  error: propError,
  updatedAt,
  onRefresh,
}: Props) {
  const [internalData, setInternalData] = useState<WorkloadData | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"projects" | "members">("projects");

  const isControlled = propData !== undefined || propIsLoading !== undefined;
  const data = isControlled ? propData ?? null : internalData;
  const isLoading = isControlled ? Boolean(propIsLoading) : internalLoading;
  const error = isControlled ? propError ?? null : internalError;

  const loadWorkload = useCallback(async () => {
    if (onRefresh) {
      onRefresh();
      return;
    }
    setInternalLoading(true);
    setInternalError(null);
    try {
      const res = await fetch("/api/report/workload-analysis", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "업무 비중 분석 요청에 실패했습니다.");
      }
      setInternalData(json.data);
    } catch (err) {
      setInternalError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setInternalLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (isOpen && !isControlled) {
      loadWorkload();
    }
  }, [isOpen, isControlled, loadWorkload]);

  if (!isOpen) return null;

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
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-teal-50/70 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-md shadow-teal-200 text-lg">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">
                  팀 업무 비중 &amp; 공수 분배 분석
                </h3>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                  프로젝트 리소스 분석
                </span>
                {updatedAt && (
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {new Date(updatedAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    갱신 (30분 주기)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                최근 2주간 보고서를 기반으로 프로젝트별 투입 공수(%)와 팀원별
                전담 업무를 시각화합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={loadWorkload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/80 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition-all hover:shadow-xs disabled:opacity-50 cursor-pointer"
              title="새로 등록된 보고서를 반영하여 즉시 최신 데이터로 다시 분석합니다"
            >
              <svg
                className={`w-3.5 h-3.5 ${
                  isLoading ? "animate-spin text-teal-600" : ""
                }`}
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
              <span>{isLoading ? "분석 중..." : "수동 갱신"}</span>
            </button>

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
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-800">
                사내 AI가 프로젝트별 투입 공수 및 팀원별 업무 비중을 계산하고
                있습니다...
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
                  onClick={loadWorkload}
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
                  <span className="rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs font-bold text-teal-800">
                    주요 프로젝트 {data.projects?.length || 0}개
                  </span>
                </div>
                {data.summary && (
                  <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed bg-white border border-gray-200/80 rounded-lg p-3 shadow-2xs">
                    💡{" "}
                    <span className="font-semibold text-teal-950">
                      공수 투입 요약:{" "}
                    </span>
                    {data.summary}
                  </p>
                )}
              </div>

              {/* 프로젝트 전체 종합 누적 게이지 바 */}
              {data.projects && data.projects.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span>프로젝트별 투입 공수 비중 (전체 100%)</span>
                    </h4>
                    <span className="text-[11px] text-gray-400">
                      색상별 프로젝트 구분
                    </span>
                  </div>

                  {/* 고대비 컬러풀 누적 바 (구분선 및 내부 텍스트 라벨 포함) */}
                  <div className="h-7 w-full rounded-xl bg-gray-100 flex overflow-hidden shadow-inner p-0.5 border border-gray-200">
                    {data.projects.map((proj, idx) => {
                      const theme = getProjectColor(idx);
                      const hasRoomForLabel = proj.percentage >= 14;
                      const hasRoomForPercent = proj.percentage >= 6;
                      return (
                        <div
                          key={idx}
                          style={{ width: `${Math.max(proj.percentage, 2)}%` }}
                          className={`${theme.bar} h-full flex items-center justify-center text-white text-[11px] font-bold tracking-tight transition-all hover:brightness-110 border-r-2 border-white last:border-r-0 cursor-default select-none first:rounded-l-lg last:rounded-r-lg`}
                          title={`${proj.name}: ${proj.percentage}%`}
                        >
                          {hasRoomForLabel ? (
                            <span className="truncate px-1.5 drop-shadow-xs">
                              {proj.name} {proj.percentage}%
                            </span>
                          ) : hasRoomForPercent ? (
                            <span className="drop-shadow-xs">
                              {proj.percentage}%
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* 정돈된 칩형 범례 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    {data.projects.map((proj, idx) => {
                      const theme = getProjectColor(idx);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200/70 px-2.5 py-1.5 transition-colors hover:bg-gray-100"
                        >
                          <span
                            className={`h-3 w-3 rounded-md shrink-0 shadow-xs ${theme.bar}`}
                          />
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span
                              className="font-semibold text-gray-800 truncate"
                              title={proj.name}
                            >
                              {proj.name}
                            </span>
                            <span className="font-extrabold text-gray-900 ml-1 shrink-0 font-mono">
                              {proj.percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 탭 전환 (프로젝트별 상세 / 팀원별 현황) */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewTab("projects")}
                    className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
                      viewTab === "projects"
                        ? "bg-white text-gray-900 shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    🏢 프로젝트별 상세 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab("members")}
                    className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
                      viewTab === "members"
                        ? "bg-white text-gray-900 shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    👤 팀원별 전담 현황
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={loadWorkload}
                  className="inline-flex items-center gap-1.5 text-xs text-teal-800 hover:text-teal-950 font-semibold transition-colors cursor-pointer bg-teal-50 border border-teal-200/80 rounded-lg px-2.5 py-1 disabled:opacity-50"
                  title="새로 등록된 보고서를 반영하여 즉시 다시 분석합니다"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${
                      isLoading ? "animate-spin text-teal-600" : ""
                    }`}
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
                  <span>{isLoading ? "분석 중..." : "최신 데이터로 재분석"}</span>
                </button>
              </div>

              {/* 탭 1: 프로젝트별 상세 카드 */}
              {viewTab === "projects" && data.projects && (
                <div className="space-y-3">
                  {data.projects.map((proj, idx) => {
                    const theme = getProjectColor(idx);
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border border-gray-200 bg-white p-4 space-y-2.5 shadow-2xs hover:border-gray-300 transition-all border-l-4 ${theme.cardBorder}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${theme.badge}`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${theme.dot}`}
                              />
                              {proj.name}
                            </span>
                            <span className="text-sm font-extrabold text-gray-900 font-mono">
                              {proj.percentage}% 공수
                            </span>
                          </div>
                          {/* 참여 팀원 태그 */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[11px] text-gray-400 font-medium">
                              참여 팀원:
                            </span>
                            {proj.members?.map((m, mIdx) => (
                              <span
                                key={mIdx}
                                className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed bg-slate-50/70 rounded-lg p-2.5 border border-gray-100">
                          {proj.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 탭 2: 팀원별 전담 현황 */}
              {viewTab === "members" && data.memberWorkloads && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.memberWorkloads.map((m, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 bg-white p-3.5 space-y-2 shadow-2xs hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-900">
                          {m.username}
                        </span>
                        {m.workloadStatus === "HIGH" ? (
                          <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                            집중도 높음
                          </span>
                        ) : m.workloadStatus === "LOW" ? (
                          <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            여유/분산
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            적정
                          </span>
                        )}
                      </div>
                      <div className="text-xs flex items-center gap-1.5 flex-wrap">
                        <span className="text-gray-500">주력 업무: </span>
                        {(() => {
                          const matchedIdx =
                            data.projects?.findIndex(
                              (p) =>
                                m.primaryProject.includes(p.name) ||
                                p.name.includes(m.primaryProject.split(" ")[0]),
                            ) ?? -1;
                          if (matchedIdx >= 0) {
                            const pTheme = getProjectColor(matchedIdx);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${pTheme.badge}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${pTheme.dot}`}
                                />
                                {m.primaryProject}
                              </span>
                            );
                          }
                          return (
                            <strong className="text-gray-800 font-semibold">
                              {m.primaryProject}
                            </strong>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-gray-600 bg-slate-50 rounded-lg p-2 leading-relaxed border border-gray-100">
                        {m.recentFocus}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 팀장 관리자 인사이트 박스 */}
              {data.teamInsights && (
                <div className="rounded-xl bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-indigo-50/30 border border-indigo-200/80 p-3.5 space-y-1 text-xs">
                  <h5 className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <span>💡 팀장 매니지먼트 인사이트</span>
                  </h5>
                  <p className="text-gray-700 leading-relaxed pt-0.5">
                    {data.teamInsights}
                  </p>
                </div>
              )}

              {data.rawText &&
                (!data.projects || data.projects.length === 0) && (
                  <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 text-xs leading-relaxed">
                    <MarkdownView content={data.rawText} />
                  </div>
                )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>* 사내 온프레미스 AI 기반 업무 분배 분석 결과입니다.</span>
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
