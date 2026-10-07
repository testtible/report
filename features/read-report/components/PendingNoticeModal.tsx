type Props = {
  isOpen: boolean;
  message: string;
  onClose: () => void;
};

export default function PendingNoticeModal({
  isOpen,
  message,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 shadow-xs">
          <svg
            className="h-7 w-7 animate-spin text-amber-500"
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
        </div>

        <div className="space-y-1.5">
          <h4 className="text-base font-bold text-gray-900">AI 분석 준비 중</h4>
          <p className="text-sm font-semibold text-gray-700 leading-relaxed">
            {message}
          </p>
          <p className="text-xs text-gray-400 pt-1">
            사내 AI가 최근 보고서를 분석하고 있습니다.
            <br />
            분석이 완료되면 즉시 열람하실 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors shadow-xs cursor-pointer"
        >
          확인
        </button>
      </div>
    </div>
  );
}
