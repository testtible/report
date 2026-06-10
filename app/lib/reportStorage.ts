import { prisma } from "@/app/lib/prisma";
import type { AttachmentMeta } from "@/app/lib/attachments";

type ExistingReport = {
  id: bigint;
  attachment_name: string | null;
};

export async function findReportByDate(
  username: string,
  start: Date,
  end: Date,
): Promise<
  | {
      id: bigint;
      content: string | null;
      attachment_name: string | null;
      attachment_size: number | null;
    }
  | undefined
> {
  const rows = await prisma.$queryRaw<
    {
      id: bigint;
      content: string | null;
      attachment_name: string | null;
      attachment_size: number | null;
    }[]
  >`
    SELECT id, content, attachment_name, attachment_size
    FROM content
    WHERE username = ${username}
      AND created_at >= ${start}
      AND created_at <= ${end}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0];
}

export async function createReport(
  username: string,
  content: string,
  createdAt: Date,
  attachment: (AttachmentMeta & { data: Buffer }) | null,
): Promise<bigint> {
  const rows = await prisma.$queryRaw<{ id: bigint }[]>`
    INSERT INTO content (
      username,
      content,
      created_at,
      updated_at,
      attachment_name,
      attachment_mime_type,
      attachment_size,
      attachment_data
    )
    VALUES (
      ${username},
      ${content},
      ${createdAt},
      ${createdAt},
      ${attachment?.name ?? null},
      ${attachment?.mimeType ?? null},
      ${attachment?.size ?? null},
      ${attachment?.data ?? null}
    )
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateReport(
  existing: ExistingReport,
  content: string,
  attachment: (AttachmentMeta & { data: Buffer }) | null,
  removeAttachment: boolean,
): Promise<void> {
  const keepExistingAttachment =
    !attachment && !removeAttachment && !!existing.attachment_name;

  if (keepExistingAttachment) {
    await prisma.$executeRaw`
      UPDATE content
      SET content = ${content}, updated_at = NOW()
      WHERE id = ${existing.id}
    `;
    return;
  }

  if (attachment) {
    await prisma.$executeRaw`
      UPDATE content
      SET
        content = ${content},
        updated_at = NOW(),
        attachment_name = ${attachment.name},
        attachment_mime_type = ${attachment.mimeType},
        attachment_size = ${attachment.size},
        attachment_data = ${attachment.data}
      WHERE id = ${existing.id}
    `;
    return;
  }

  await prisma.$executeRaw`
    UPDATE content
    SET
      content = ${content},
      updated_at = NOW(),
      attachment_name = NULL,
      attachment_mime_type = NULL,
      attachment_size = NULL,
      attachment_data = NULL
    WHERE id = ${existing.id}
  `;
}
