import MarkdownView from "@/app/components/MarkdownView";
import {
  formatModifiedReportDate,
  type ModifiedReportItem,
} from "@/app/lib/modifiedReports";

type Props = {
  modifiedReports: ModifiedReportItem[];
  detailModalItem: ModifiedReportItem | null;
  onOpenDetailModal: (item: ModifiedReportItem) => void;
  onCloseDetailModal: () => void;
  onConfirmModification: (id: string) => void;
};

export default function ModifiedReportsSection({
  modifiedReports,
  detailModalItem,
  onOpenDetailModal,
  onCloseDetailModal,
  onConfirmModification,
}: Props) {
  if (modifiedReports.length === 0) return null;

  return (
    <>
      <section className="w-full rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            보고 수정 리스트
          </h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            {modifiedReports.length}건
          </span>
        </div>
        <p className="mb-5 text-sm text-gray-600">
          오늘을 제외한 최근 평일 4일 이내에 수정된 보고입니다.
        </p>
        <div className="space-y-3">
          {modifiedReports.map((item) => (
            <div
              key={`${item.username}-${item.reportDate}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {item.username}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatModifiedReportDate(item.reportDate)} 보고 수정
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onOpenDetailModal(item)}
                  className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 cursor-pointer"
                >
                  수정 내용 보러가기
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmModification(item.id)}
                  className="shrink-0 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 cursor-pointer"
                >
                  확인 완료
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 수정 내용 상세 모달 */}
      {detailModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onCloseDetailModal}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="font-semibold text-gray-900">
                수정 보고 · {detailModalItem.username}
              </h3>
              <button
                type="button"
                onClick={onCloseDetailModal}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 cursor-pointer"
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
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  보고 날짜
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatModifiedReportDate(detailModalItem.reportDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  수정 내용
                </p>
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm leading-relaxed text-gray-800">
                  <MarkdownView content={detailModalItem.content} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
