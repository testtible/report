export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB

export const MAX_ATTACHMENT_SIZE_LABEL = "10MB";

export type AttachmentMeta = {
  name: string;
  mimeType: string;
  size: number;
};

export type MemberReport = {
  id: string;
  content: string;
  attachmentName: string | null;
  attachmentSize: number | null;
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return `첨부파일은 ${MAX_ATTACHMENT_SIZE_LABEL}를 초과할 수 없습니다.`;
  }
  return null;
}

export async function parseAttachmentFromFormData(
  formData: FormData,
): Promise<
  | { ok: true; attachment: AttachmentMeta & { data: Buffer } | null }
  | { ok: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, attachment: null };
  }

  const error = validateAttachmentFile(file);
  if (error) return { ok: false, error };

  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    ok: true,
    attachment: {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data: buffer,
    },
  };
}
