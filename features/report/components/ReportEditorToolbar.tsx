type Props = {
  activeTab: "write" | "preview";
  onTabChange: (tab: "write" | "preview") => void;
  onInsertFormat: (prefix: string, suffix?: string) => void;
  onInsertTemplate: () => void;
  onRefineWithAi: () => void;
  onUndoRefine: () => void;
  hasPrevRefineContent: boolean;
  isRefiningAi: boolean;
  selectedMember: string;
  hasContent: boolean;
  isLoadingContent: boolean;
  lastSavedTime: string | null;
  isExistingReport: boolean;
};

export default function ReportEditorToolbar({
  activeTab,
  onTabChange,
  onInsertFormat,
  onInsertTemplate,
  onRefineWithAi,
  onUndoRefine,
  hasPrevRefineContent,
  isRefiningAi,
  selectedMember,
  hasContent,
  isLoadingContent,
  lastSavedTime,
  isExistingReport,
}: Props) {
  const disabled = !selectedMember || isLoadingContent;

  return (
    <div className="space-y-2">
      {/* 툴바 상단 상태 뱃지 및 액션 버튼들 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => onTabChange("write")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "write"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            작성
          </button>
          <button
            type="button"
            onClick={() => onTabChange("preview")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            미리보기
          </button>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedTime && (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 border border-emerald-200/70 rounded-md px-2 py-0.5 shadow-2xs">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              자동 저장됨 ({lastSavedTime})
            </span>
          )}
          {!selectedMember && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5">
              팀원을 먼저 선택해주세요
            </span>
          )}
          {selectedMember && isExistingReport && !isLoadingContent && (
            <span className="text-xs font-medium text-amber-600 mr-1">
              기존 보고 수정 중
            </span>
          )}
          {hasPrevRefineContent && (
            <button
              type="button"
              onClick={onUndoRefine}
              disabled={!selectedMember}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="AI로 다듬기 전 원본 내용으로 복원합니다"
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
                  d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4"
                />
              </svg>
              원본 복원
            </button>
          )}
          <button
            type="button"
            onClick={onRefineWithAi}
            disabled={disabled || isRefiningAi || !hasContent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="대충 작성한 메모를 사람이 읽기 편한 보고서 형식으로 다듬어줍니다"
          >
            {isRefiningAi ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                <span>AI 정리 중...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 text-indigo-600"
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
                <span>AI 문장 정리</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 마크다운 서식 도구 모음 */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-50 border border-gray-200 rounded-lg">
        <button
          type="button"
          onClick={() => onInsertFormat("**", "**")}
          disabled={disabled}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs font-bold"
          title="굵게 (Bold)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => onInsertFormat("*", "*")}
          disabled={disabled}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs italic font-serif"
          title="기울임 (Italic)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => onInsertFormat("~~", "~~")}
          disabled={disabled}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs line-through"
          title="취소선 (Strikethrough)"
        >
          S
        </button>
        <span className="w-px h-3.5 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onClick={() => onInsertFormat("### ")}
          disabled={disabled}
          className="px-1.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs font-bold"
          title="소제목 (Heading 3)"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => onInsertFormat("- ")}
          disabled={disabled}
          className="px-1.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs font-medium"
          title="글머리 기호 (List)"
        >
          • 목록
        </button>
        <button
          type="button"
          onClick={() => onInsertFormat("- [ ] ")}
          disabled={disabled}
          className="px-1.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs font-medium"
          title="할 일 체크박스 (Task)"
        >
          ☑ 체크
        </button>
        <button
          type="button"
          onClick={() => onInsertFormat("> ")}
          disabled={disabled}
          className="px-1.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs font-medium"
          title="인용구 (Quote)"
        >
          “ 인용
        </button>
        <button
          type="button"
          onClick={() => onInsertFormat("`", "`")}
          disabled={disabled}
          className="px-1.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs font-mono"
          title="인라인 코드 (Code)"
        >
          &lt;/&gt;
        </button>
        <span className="w-px h-3.5 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onClick={onInsertTemplate}
          disabled={disabled}
          className="inline-flex items-center gap-1 px-2 py-1 text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded transition-colors disabled:opacity-40 cursor-pointer text-xs font-medium ml-auto"
          title="일일 보고서 추천 양식을 본문에 추가합니다"
        >
          <span>📋</span>
          <span>추천 양식 삽입</span>
        </button>
      </div>
    </div>
  );
}
