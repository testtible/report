import { useState } from "react";
import { formatFileSize } from "@/app/lib/attachments";

type Props = {
  reportId: string;
  fileName: string;
  fileSize?: number | null;
  compact?: boolean;
};

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
];

export default function ReportAttachmentLink({
  reportId,
  fileName,
  fileSize,
  compact = false,
}: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const isImage = IMAGE_EXTENSIONS.some((ext) =>
    fileName.toLowerCase().endsWith(ext),
  );

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
          <p className="text-[10px] text-gray-500">
            {formatFileSize(fileSize)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isImage && (
          <div
            className="relative"
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => setShowPreview(false)}
          >
            <div
              className={`cursor-default rounded-md border border-indigo-200 bg-indigo-50 font-medium text-indigo-700 transition-colors hover:bg-indigo-100 ${
                compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-xs"
              }`}
            >
              미리보기
            </div>
            {showPreview && (
              <div className="absolute bottom-full right-0 pb-2 z-50">
                <div className="rounded-lg border border-gray-200 bg-white p-1 shadow-2xl transition-all duration-200 ease-out scale-100 opacity-100">
                  <img
                    src={`/api/report/attachment?id=${reportId}&inline=true`}
                    alt="미리보기"
                    className="max-h-192 max-w-[960px] rounded object-contain bg-gray-50"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <a
          href={`/api/report/attachment?id=${reportId}`}
          download={fileName}
          className={`block rounded-md bg-indigo-600 font-medium text-white transition-colors hover:bg-indigo-700 ${
            compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-xs"
          }`}
        >
          다운로드
        </a>
      </div>
    </div>
  );
}
