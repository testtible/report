import MarkdownView from "@/app/components/MarkdownView";
import ReportAttachmentLink from "@/app/components/ReportAttachmentLink";
import type { MemberReport } from "@/app/lib/attachments";
import MasterCommentEditor from "@/features/read-report/components/MasterCommentEditor";

type Props = {
  username: string;
  report: MemberReport;
  currentComment: string;
  isEditingComment: boolean;
  commentInput: string;
  isSavingComment: boolean;
  onChangeCommentInput: (val: string) => void;
  onStartEditComment: () => void;
  onCancelEditComment: () => void;
  onSaveComment: () => void;
  onConfirmUserComment?: (reportId: string) => Promise<void>;
};

export default function SubmittedReportCard({
  username,
  report,
  currentComment,
  isEditingComment,
  commentInput,
  isSavingComment,
  onChangeCommentInput,
  onStartEditComment,
  onCancelEditComment,
  onSaveComment,
  onConfirmUserComment,
}: Props) {
  return (
    <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-2 text-sm font-semibold text-gray-900">{username}</p>
      <div className="text-sm leading-relaxed text-gray-800">
        <MarkdownView content={report.content} />
      </div>

      {report.attachmentName && (
        <div className="mt-3">
          <ReportAttachmentLink
            reportId={report.id}
            fileName={report.attachmentName}
            fileSize={report.attachmentSize}
          />
        </div>
      )}

      {/* 팀원이 남긴 요청 코멘트 섹션 */}
      {report.userComment && (
        <div className="mt-3 rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px]">
                💬
              </span>
              <span>팀원 요청 코멘트</span>
            </div>
            {report.isUserComment ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                확인 완료
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  팀장 확인 대기
                </span>
                {onConfirmUserComment && (
                  <button
                    type="button"
                    onClick={() => onConfirmUserComment(report.id)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-2xs transition-all cursor-pointer"
                  >
                    확인하기
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed pl-1">
            {report.userComment}
          </p>
        </div>
      )}

      {/* 마스터 코멘트 섹션 */}
      <MasterCommentEditor
        reportId={report.id}
        username={username}
        currentComment={currentComment}
        isEditing={isEditingComment}
        commentInput={commentInput}
        isSaving={isSavingComment}
        isConfirmed={report.isConfirmMasterComment}
        onChangeInput={onChangeCommentInput}
        onStartEdit={onStartEditComment}
        onCancelEdit={onCancelEditComment}
        onSave={onSaveComment}
      />
    </article>
  );
}
