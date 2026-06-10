import { NextRequest, NextResponse } from "next/server";
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

  return NextResponse.json({
    content: report?.content ?? "",
    exists: !!report,
    attachmentName: report?.attachment_name ?? null,
    attachmentSize: report?.attachment_size ?? null,
    hasAttachment: !!report?.attachment_name,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const username = (formData.get("username") as string | null)?.trim();
    const content = (formData.get("content") as string | null)?.trim() ?? "";
    const date = formData.get("date") as string | null;
    const removeAttachment = formData.get("removeAttachment") === "true";

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

    const { start, end } = getDateRange(dateKey);
    const existing = await findReportByDate(username, start, end);

    if (existing) {
      await updateReport(
        existing,
        content,
        parsedAttachment.attachment,
        removeAttachment,
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
