type Props = {
  masterComment: string | null;
  isVisible: boolean;
  isConfirmMasterComment?: boolean;
  isConfirming?: boolean;
  onConfirmMasterComment?: () => void;
};

export default function MasterCommentNotice({
  masterComment,
  isVisible,
  isConfirmMasterComment,
  isConfirming,
  onConfirmMasterComment,
}: Props) {
  if (!isVisible || !masterComment) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-blue-50/90 p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs">
            💬
          </span>
          <span className="text-xs font-bold text-indigo-900">
            관리자(마스터) 코멘트
          </span>
          <span className="text-[11px] text-indigo-500 hidden sm:inline">
            · 해당 보고서에 남겨진 피드백입니다
          </span>
        </div>

        {/* 확인 완료 상태 배지 또는 확인 버튼 */}
        <div>
          {isConfirmMasterComment ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 shadow-2xs">
              <svg
                className="w-3.5 h-3.5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              확인 완료됨
            </span>
          ) : onConfirmMasterComment ? (
            <button
              type="button"
              onClick={onConfirmMasterComment}
              disabled={isConfirming}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="관리자의 코멘트를 확인했음을 표시합니다"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{isConfirming ? "확인 처리 중..." : "확인 완료"}</span>
            </button>
          ) : null}
        </div>
      </div>
      <div className="text-sm text-black whitespace-pre-wrap pl-8 leading-relaxed">
        {masterComment}
      </div>
    </div>
  );
}
