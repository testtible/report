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
      master_comment: string | null;
      is_confirm_master_comment: boolean;
      user_id: bigint | null;
      team_id: bigint | null;
      user_comment: string | null;
      is_user_comment: boolean;
    }
  | undefined
> {
  const rows = await prisma.$queryRaw<
    {
      id: bigint;
      content: string | null;
      attachment_name: string | null;
      attachment_size: number | null;
      master_comment: string | null;
      is_confirm_master_comment: boolean;
      user_id: bigint | null;
      team_id: bigint | null;
      user_comment: string | null;
      is_user_comment: boolean;
    }[]
  >`
    SELECT id, content, attachment_name, attachment_size, master_comment, is_confirm_master_comment, user_id, team_id, user_comment, is_user_comment
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
  userId: bigint | null = null,
  userComment: string | null = null,
  teamId: bigint | number | null = null,
): Promise<bigint> {
  const finalTeamId = teamId != null ? BigInt(teamId) : null;
  const rows = await prisma.$queryRaw<{ id: bigint }[]>`
    INSERT INTO content (
      username,
      content,
      created_at,
      updated_at,
      attachment_name,
      attachment_mime_type,
      attachment_size,
      attachment_data,
      user_id,
      team_id,
      is_confirm_master_comment,
      user_comment,
      is_user_comment
    )
    VALUES (
      ${username},
      ${content},
      ${createdAt},
      ${createdAt},
      ${attachment?.name ?? null},
      ${attachment?.mimeType ?? null},
      ${attachment?.size ?? null},
      ${attachment?.data ?? null},
      ${userId},
      COALESCE(
        ${finalTeamId},
        (SELECT team_id FROM "user" WHERE id = ${userId} OR name = ${username} LIMIT 1),
        2
      ),
      false,
      ${userComment},
      false
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
  userId: bigint | null = null,
  userComment: string | null | undefined = undefined,
  teamId: bigint | number | null = null,
): Promise<void> {
  const finalTeamId = teamId != null ? BigInt(teamId) : null;
  const keepExistingAttachment =
    !attachment && !removeAttachment && !!existing.attachment_name;

  if (userComment !== undefined) {
    if (keepExistingAttachment) {
      await prisma.$executeRaw`
        UPDATE content
        SET content = ${content}, updated_at = NOW(),
            user_id = COALESCE(${userId}, user_id),
            team_id = COALESCE(
              ${finalTeamId},
              (SELECT team_id FROM "user" WHERE id = COALESCE(${userId}, user_id) OR name = content.username LIMIT 1),
              team_id
            ),
            user_comment = ${userComment}, is_user_comment = false
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
          attachment_data = ${attachment.data},
          user_id = COALESCE(${userId}, user_id),
          team_id = COALESCE(
            ${finalTeamId},
            (SELECT team_id FROM "user" WHERE id = COALESCE(${userId}, user_id) OR name = content.username LIMIT 1),
            team_id
          ),
          user_comment = ${userComment},
          is_user_comment = false
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
        attachment_data = NULL,
        user_id = COALESCE(${userId}, user_id),
        team_id = COALESCE(
          ${finalTeamId},
          (SELECT team_id FROM "user" WHERE id = COALESCE(${userId}, user_id) OR name = content.username LIMIT 1),
          team_id
        ),
        user_comment = ${userComment},
        is_user_comment = false
      WHERE id = ${existing.id}
    `;
    return;
  }

  if (keepExistingAttachment) {
    await prisma.$executeRaw`
      UPDATE content
      SET content = ${content}, updated_at = NOW(),
          user_id = COALESCE(${userId}, user_id),
          team_id = COALESCE(
            ${finalTeamId},
            (SELECT team_id FROM "user" WHERE id = COALESCE(${userId}, user_id) OR name = content.username LIMIT 1),
            team_id
          )
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
        attachment_data = ${attachment.data},
        user_id = COALESCE(${userId}, user_id),
        team_id = COALESCE(
          ${finalTeamId},
          (SELECT team_id FROM "user" WHERE id = COALESCE(${userId}, user_id) OR name = content.username LIMIT 1),
          team_id
        )
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
      attachment_data = NULL,
      user_id = COALESCE(${userId}, user_id),
      team_id = COALESCE(
        ${finalTeamId},
        (SELECT team_id FROM "user" WHERE id = COALESCE(${userId}, user_id) OR name = content.username LIMIT 1),
        team_id
      )
    WHERE id = ${existing.id}
  `;
}

export async function updateMasterComment(
  id: bigint,
  masterComment: string | null,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE content
    SET master_comment = ${masterComment},
        is_confirm_master_comment = false,
        is_user_comment = true
    WHERE id = ${id}
  `;
}

export async function confirmMasterComment(id: bigint): Promise<void> {
  await prisma.$executeRaw`
    UPDATE content
    SET is_confirm_master_comment = true
    WHERE id = ${id}
  `;
}

export async function updateUserComment(
  id: bigint,
  userComment: string | null,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE content
    SET user_comment = ${userComment},
        is_user_comment = false,
        is_confirm_master_comment = true
    WHERE id = ${id}
  `;
}

export async function confirmUserComment(id: bigint): Promise<void> {
  await prisma.$executeRaw`
    UPDATE content
    SET is_user_comment = true
    WHERE id = ${id}
  `;
}
