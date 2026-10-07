import { type RefObject } from "react";
import {
  formatFileSize,
  MAX_ATTACHMENT_SIZE_LABEL,
} from "@/app/lib/attachments";

type Props = {
  selectedFile: File | null;
  existingAttachmentName: string | null;
  existingAttachmentSize: number | null;
  removeAttachment: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveNewFile: () => void;
  onToggleRemoveExisting: (remove: boolean) => void;
  disabled: boolean;
};

export default function ReportAttachmentUploader({
  selectedFile,
  existingAttachmentName,
  existingAttachmentSize,
  removeAttachment,
  fileInputRef,
  onFileChange,
  onRemoveNewFile,
  onToggleRemoveExisting,
  disabled,
}: Props) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        첨부파일{" "}
        <span className="text-xs font-normal text-gray-500">
          (선택, 1개, 최대 {MAX_ATTACHMENT_SIZE_LABEL})
        </span>
      </label>

      {/* 새 파일 선택 */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileChange}
        disabled={disabled}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer border border-gray-200 rounded-xl p-2 bg-gray-50/50"
      />

      {/* 새로 선택한 파일 정보 */}
      {selectedFile && (
        <div className="mt-2 flex items-center justify-between text-xs bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-2 text-indigo-900">
          <span className="truncate">
            새 첨부: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </span>
          <button
            type="button"
            onClick={onRemoveNewFile}
            className="text-red-500 hover:text-red-700 ml-2 shrink-0 font-medium cursor-pointer"
          >
            취소
          </button>
        </div>
      )}

      {/* 기존에 저장되어 있던 첨부파일 표시 */}
      {existingAttachmentName && !selectedFile && (
        <div className="mt-2 flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700">
          <span className="truncate">
            기존 첨부: {existingAttachmentName}
            {existingAttachmentSize != null &&
              ` (${formatFileSize(existingAttachmentSize)})`}
            {removeAttachment && (
              <span className="text-red-500 ml-1.5 font-medium">
                (제출 시 삭제 예정)
              </span>
            )}
          </span>
          {removeAttachment ? (
            <button
              type="button"
              onClick={() => onToggleRemoveExisting(false)}
              className="text-indigo-600 hover:text-indigo-800 ml-2 shrink-0 font-medium cursor-pointer"
            >
              삭제 취소
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleRemoveExisting(true)}
              className="text-red-500 hover:text-red-700 ml-2 shrink-0 font-medium cursor-pointer"
            >
              첨부 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
