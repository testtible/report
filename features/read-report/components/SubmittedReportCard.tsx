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

      {/* 마스터 코멘트 섹션 */}
      <MasterCommentEditor
        reportId={report.id}
        username={username}
        currentComment={currentComment}
        isEditing={isEditingComment}
        commentInput={commentInput}
        isSaving={isSavingComment}
        onChangeInput={onChangeCommentInput}
        onStartEdit={onStartEditComment}
        onCancelEdit={onCancelEditComment}
        onSave={onSaveComment}
      />
    </article>
  );
}
