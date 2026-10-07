type Props = {
  masterComment: string | null;
  isVisible: boolean;
};

export default function MasterCommentNotice({
  masterComment,
  isVisible,
}: Props) {
  if (!isVisible || !masterComment) return null;

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-blue-50/90 p-4 shadow-xs">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs">
          💬
        </span>
        <span className="text-xs font-bold text-indigo-900">
          관리자(마스터) 코멘트
        </span>
        <span className="text-[11px] text-indigo-500">
          · 해당 보고서에 남겨진 피드백입니다
        </span>
      </div>
      <div className="text-sm text-black whitespace-pre-wrap pl-8 leading-relaxed">
        {masterComment}
      </div>
    </div>
  );
}
