import { formatFileSize } from "@/app/lib/attachments";

type Props = {
  reportId: string;
  fileName: string;
  fileSize?: number | null;
  compact?: boolean;
};

export default function ReportAttachmentLink({
  reportId,
  fileName,
  fileSize,
  compact = false,
}: Props) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white ${
        compact ? "px-2.5 py-1.5" : "px-3 py-2"
      }`}
    >
      <svg
        className={`shrink-0 text-gray-500 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-medium text-gray-800 ${
            compact ? "text-xs" : "text-sm"
          }`}
          title={fileName}
        >
          {fileName}
        </p>
        {fileSize != null && fileSize > 0 && (
          <p className="text-[10px] text-gray-500">{formatFileSize(fileSize)}</p>
        )}
      </div>
      <a
        href={`/api/report/attachment?id=${reportId}`}
        download={fileName}
        className={`shrink-0 rounded-md bg-indigo-600 font-medium text-white transition-colors hover:bg-indigo-700 ${
          compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-xs"
        }`}
      >
        다운로드
      </a>
    </div>
  );
}
