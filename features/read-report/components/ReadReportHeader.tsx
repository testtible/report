type PrefetchIndicator = {
  isLoading: boolean;
  data: unknown;
};

type Props = {
  riskRadar: PrefetchIndicator;
  workload: PrefetchIndicator;
  pendingUserCommentCount?: number;
  onOpenRiskRadar: () => void;
  onOpenWorkload: () => void;
  onOpenMemberSummary: () => void;
  onOpenAiChat: () => void;
  onOpenUserCommentsModal?: () => void;
};

export default function ReadReportHeader({
  riskRadar,
  workload,
  pendingUserCommentCount,
  onOpenRiskRadar,
  onOpenWorkload,
  onOpenMemberSummary,
  onOpenAiChat,
  onOpenUserCommentsModal,
}: Props) {
  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
      <div className="absolute top-[-30px]">
        <h1 className="text-2xl font-bold text-gray-900">일일 보고 현황</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {onOpenUserCommentsModal && (
          <button
            type="button"
            onClick={onOpenUserCommentsModal}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
              (pendingUserCommentCount ?? 0) > 0
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 ring-2 ring-blue-300"
                : "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
            }`}
            title="최근 5일간 팀원들이 남긴 요청 코멘트를 모아 확인합니다"
          >
            <span className="text-base">📬</span>
            <span>팀원 요청 코멘트</span>
            {(pendingUserCommentCount ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-amber-950 px-2 py-0.2 text-[10px] sm:text-[11px] font-bold shadow-2xs">
                미확인 {pendingUserCommentCount}건
              </span>
            ) : (
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
                확인
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenRiskRadar}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:from-rose-700 hover:via-red-700 hover:to-rose-800 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          title="최근 보고서를 분석하여 잠재적 지연/장애 리스크를 조기 감지합니다"
        >
          <span className="text-base">🚨</span>
          <span>AI 리스크 레이더</span>
          {riskRadar.isLoading ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              분석 중...
            </span>
          ) : riskRadar.data ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-semibold text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              준비 완료
            </span>
          ) : (
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
              위험 감지
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenWorkload}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:from-teal-700 hover:via-emerald-700 hover:to-teal-800 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          title="프로젝트별 투입 공수 및 팀원별 업무 비중을 시각화합니다"
        >
          <span className="text-base">📊</span>
          <span>업무 비중 분석</span>
          {workload.isLoading ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              분석 중...
            </span>
          ) : workload.data ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-semibold text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              준비 완료
            </span>
          ) : (
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] sm:text-[11px] font-medium text-white">
              공수 통계
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenMemberSummary}
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
          onClick={onOpenAiChat}
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
  );
}
