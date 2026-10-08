import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { parseAttachmentFromFormData } from "@/app/lib/attachments";
import {
  dateKeyToCreatedAt,
  getDateRange,
  getTodayKey,
  isEditableDate,
  isValidDateKey,
} from "@/app/lib/dates";
import {
  createReport,
  findReportByDate,
  updateReport,
} from "@/app/lib/reportStorage";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  const date = request.nextUrl.searchParams.get("date");

  if (!username?.trim()) {
    return NextResponse.json(
      { error: "팀원을 선택해주세요." },
      { status: 400 },
    );
  }

  const dateKey = date && isValidDateKey(date) ? date : getTodayKey();
  if (!isEditableDate(dateKey)) {
    return NextResponse.json(
      { error: "최근 평일 5일 이내의 날짜만 조회할 수 있습니다." },
      { status: 400 },
    );
  }

  const { start, end } = getDateRange(dateKey);
  const report = await findReportByDate(username.trim(), start, end);

  let previousReport: { content: string; date: string } | null = null;
  if (!report) {
    const prev = await prisma.content.findFirst({
      where: {
        username: username.trim(),
        created_at: { lt: start },
        content: { not: null },
      },
      orderBy: { created_at: "desc" },
      select: { content: true, created_at: true },
    });
    if (prev && prev.content && prev.content.trim()) {
      previousReport = {
        content: prev.content.trim(),
        date: prev.created_at.toISOString().slice(0, 10),
      };
    }
  }

  return NextResponse.json({
    content: report?.content ?? "",
    exists: !!report,
    attachmentName: report?.attachment_name ?? null,
    attachmentSize: report?.attachment_size ?? null,
    hasAttachment: !!report?.attachment_name,
    previousReport,
    masterComment: report?.master_comment ?? null,
    isConfirmMasterComment: report?.is_confirm_master_comment ?? false,
    userId: report?.user_id?.toString() ?? null,
    reportId: report?.id?.toString() ?? null,
    userComment: report?.user_comment ?? null,
    isUserComment: report?.is_user_comment ?? false,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const username = (formData.get("username") as string | null)?.trim();
    const content = (formData.get("content") as string | null)?.trim() ?? "";
    const date = formData.get("date") as string | null;
    const removeAttachment = formData.get("removeAttachment") === "true";
    const formUserId = formData.get("userId") as string | null;

    if (!username) {
      return NextResponse.json(
        { error: "팀원을 선택해주세요." },
        { status: 400 },
      );
    }

    const dateKey = date && isValidDateKey(date) ? date : getTodayKey();
    if (!isEditableDate(dateKey)) {
      return NextResponse.json(
        { error: "최근 평일 5일 이내의 날짜만 작성·수정할 수 있습니다." },
        { status: 400 },
      );
    }

    const parsedAttachment = await parseAttachmentFromFormData(formData);
    if (!parsedAttachment.ok) {
      return NextResponse.json(
        { error: parsedAttachment.error },
        { status: 400 },
      );
    }

    // user_id 매핑 (클라이언트에서 넘겼거나, 이름으로 DB 조회)
    let userId: bigint | null = null;
    if (formUserId) {
      try {
        userId = BigInt(formUserId);
      } catch {
        userId = null;
      }
    }
    if (!userId) {
      const foundUser = await prisma.user.findFirst({
        where: { name: username },
        select: { id: true },
      });
      if (foundUser) userId = foundUser.id;
    }

    const formUserComment = formData.has("userComment")
      ? (formData.get("userComment") as string | null)
      : undefined;

    const { start, end } = getDateRange(dateKey);
    const existing = await findReportByDate(username, start, end);

    if (existing) {
      await updateReport(
        existing,
        content,
        parsedAttachment.attachment,
        removeAttachment,
        userId,
        formUserComment,
      );
      return NextResponse.json({
        ok: true,
        id: existing.id.toString(),
        updated: true,
      });
    }

    const createdAt = dateKeyToCreatedAt(dateKey);
    const id = await createReport(
      username,
      content,
      createdAt,
      parsedAttachment.attachment,
      userId,
      formUserComment ?? null,
    );

    return NextResponse.json({
      ok: true,
      id: id.toString(),
      updated: false,
    });
  } catch (e) {
    console.error("Report API error:", e);
    return NextResponse.json(
      { error: "보고서 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
