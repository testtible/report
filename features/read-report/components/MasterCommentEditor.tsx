type Props = {
  reportId: string;
  username: string;
  currentComment: string;
  isEditing: boolean;
  commentInput: string;
  isSaving: boolean;
  isConfirmed?: boolean;
  onChangeInput: (val: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
};

export default function MasterCommentEditor({
  currentComment,
  isEditing,
  commentInput,
  isSaving,
  isConfirmed,
  onChangeInput,
  onStartEdit,
  onCancelEdit,
  onSave,
}: Props) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200/80">
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
              <span>💬</span> 관리자 코멘트 작성 / 수정
            </label>
            <span className="text-[11px] text-gray-400">
              비워두고 저장 시 삭제됩니다
            </span>
          </div>
          <textarea
            rows={2}
            value={commentInput}
            onChange={(e) => onChangeInput(e.target.value)}
            placeholder="팀원에게 전달할 피드백 또는 관리자 메모를 남겨주세요."
            className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-indigo-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSaving}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      ) : currentComment ? (
        <div className="flex items-start justify-between gap-3 bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5 sm:p-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-800">
              <span className="flex items-center gap-1">
                <span>💬</span>
                <span>관리자 코멘트</span>
              </span>
              {isConfirmed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  팀원 확인 완료
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  팀원 미확인
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-black whitespace-pre-wrap leading-relaxed">
              {currentComment}
            </p>
          </div>
          <button
            type="button"
            onClick={onStartEdit}
            className="shrink-0 px-2 py-1 text-[11px] font-medium rounded border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            수정
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-sm">💬</span>
            <span className="text-[11px] sm:text-xs font-medium text-gray-500">
              팀원에게 이쁜 피드백을 남겨보세요 :)
            </span>
          </div>
          <button
            type="button"
            onClick={onStartEdit}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5 stroke-[2.5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>관리자 코멘트 남기기</span>
          </button>
        </div>
      )}
    </div>
  );
}
