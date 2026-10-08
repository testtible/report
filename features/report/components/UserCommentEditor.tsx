import { useState, useEffect } from "react";

type Props = {
  userComment: string | null;
  isUserComment: boolean;
  disabled?: boolean;
  onSaveUserComment: (val: string) => Promise<void>;
};

export default function UserCommentEditor({
  userComment,
  isUserComment,
  disabled = false,
  onSaveUserComment,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(userComment ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setInputVal(userComment ?? "");
  }, [userComment]);

  const handleStartEdit = () => {
    setInputVal(userComment ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setInputVal(userComment ?? "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveUserComment(inputVal.trim());
      setIsEditing(false);
    } catch {
      // 오류 처리는 상위 훅에서 처리됨
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200/80">
      {isEditing ? (
        <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3 sm:p-4 transition-all">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <span>💬</span> 팀장님께 요청 코멘트 작성
            </label>
            <span className="text-[11px] text-gray-400">
              비워두고 저장 시 삭제됩니다
            </span>
          </div>
          <textarea
            rows={3}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="팀장님께 전달할 업무 요청, 피드백 문의, 공유 사항을 자유롭게 적어주세요."
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-blue-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
            disabled={isSaving}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      ) : userComment ? (
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/90 rounded-xl p-3 sm:p-4 shadow-2xs">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <span>💬</span>
                <span>팀장님께 전달한 요청 코멘트</span>
              </span>
              {isUserComment ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  팀장님 확인 완료
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  팀장님 확인 대기
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed pl-5">
              {userComment}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={disabled}
            className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            수정
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-sm">💬</span>
            <span className="text-[11px] sm:text-xs font-medium text-gray-500">
              팀장님께 전달할 요청사항이나 질문이 있으신가요?
            </span>
          </div>
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={disabled}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
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
            <span>팀장님께 요청 코멘트 남기기</span>
          </button>
        </div>
      )}
    </div>
  );
}
