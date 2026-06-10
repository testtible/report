import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  dateKeyToCreatedAt,
  getDateRange,
  getTodayKey,
  isEditableDate,
  isValidDateKey,
} from "@/app/lib/dates";

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
  const report = await prisma.content.findFirst({
    where: {
      username: username.trim(),
      created_at: { gte: start, lte: end },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    content: report?.content ?? "",
    exists: !!report,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, content, date } = body as {
      username: string;
      content: string;
      date?: string;
    };

    if (!username?.trim()) {
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

    const { start, end } = getDateRange(dateKey);
    const existing = await prisma.content.findFirst({
      where: {
        username: username.trim(),
        created_at: { gte: start, lte: end },
      },
      orderBy: { created_at: "desc" },
    });

    if (existing) {
      await prisma.$executeRaw`
        UPDATE content
        SET content = ${content?.trim() ?? ""}, updated_at = NOW()
        WHERE id = ${existing.id}
      `;
      return NextResponse.json({
        ok: true,
        id: existing.id.toString(),
        updated: true,
      });
    }

    const createdAt = dateKeyToCreatedAt(dateKey);
    const created = await prisma.content.create({
      data: {
        username: username.trim(),
        content: content?.trim() ?? "",
        created_at: createdAt,
      },
    });
    await prisma.$executeRaw`
      UPDATE content SET updated_at = ${createdAt} WHERE id = ${created.id}
    `;

    return NextResponse.json({
      ok: true,
      id: created.id.toString(),
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
