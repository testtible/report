import {
  formatDateLabel,
  formatDateWithWeekday,
} from "@/app/lib/dates";

type Props = {
  selectedDate: string;
  editableDates: string[];
  selectedMember: string;
  onSelectDate: (date: string) => void;
  onOpenLeaveModal: () => void;
  onOpenAiChatModal: () => void;
};

export default function ReportHeader({
  selectedDate,
  editableDates,
  selectedMember,
  onSelectDate,
  onOpenLeaveModal,
  onOpenAiChatModal,
}: Props) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">
          일일 보고서{" "}
          <span className="text-base sm:text-lg font-semibold text-gray-600">
            {formatDateWithWeekday(selectedDate)}
          </span>
        </h1>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (!selectedMember) {
                alert("AI에게 질문하려면 먼저 팀원을 선택해주세요.");
                return;
              }
              onOpenAiChatModal();
            }}
            disabled={!selectedMember}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              selectedMember
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm hover:from-indigo-700 hover:to-purple-700 hover:shadow-md cursor-pointer"
                : "border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
            title={
              selectedMember
                ? `${selectedMember} 님의 과거 보고서를 기반으로 AI에게 질문합니다`
                : "팀원을 먼저 선택하면 AI 질문 기능이 활성화됩니다"
            }
          >
            <svg
              className={`w-4 h-4 ${
                selectedMember
                  ? "text-amber-300 animate-pulse"
                  : "text-gray-400"
              }`}
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
            <span>AI에게 질문하기</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedMember) {
                alert("출장 및 휴가를 지정하려면 먼저 팀원을 선택해주세요.");
                return;
              }
              onOpenLeaveModal();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            출장 및 휴가 지정
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        주말을 제외한 최근 평일 5일 중 날짜를 선택해 작성하거나 수정할 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {editableDates.map((dateKey) => {
          const isSelected = dateKey === selectedDate;
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {formatDateLabel(dateKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
