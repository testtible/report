import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  dateKeyToCreatedAt,
  getDateRange,
  isValidDateKey,
} from "@/app/lib/dates";
import {
  expandDateRange,
  getLeaveSelectableBounds,
  isLeaveSelectableDate,
} from "@/app/lib/leave";
import { LEAVE_TYPES, type LeaveType } from "@/app/lib/members";

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username?.trim()) {
    return NextResponse.json(
      { error: "팀원을 선택해주세요." },
      { status: 400 },
    );
  }

  const { min, max } = getLeaveSelectableBounds();
  const { start } = getDateRange(min);
  const { end } = getDateRange(max);

  const reports = await prisma.content.findMany({
    where: {
      username: username.trim(),
      created_at: { gte: start, lte: end },
      content: { in: [LEAVE_TYPES.TRIP, LEAVE_TYPES.VACATION] },
    },
    orderBy: { created_at: "asc" },
    select: { created_at: true, content: true },
  });

  const leaves = reports.map((r) => ({
    date: toDateKey(r.created_at),
    type: r.content as LeaveType,
  }));

  return NextResponse.json({ leaves });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, type, startDate, endDate, dates, excludeWeekends } =
      body as {
        username: string;
        type: LeaveType;
        startDate?: string;
        endDate?: string;
        dates?: string[];
        excludeWeekends?: boolean;
      };

    if (!username?.trim()) {
      return NextResponse.json(
        { error: "팀원을 선택해주세요." },
        { status: 400 },
      );
    }

    if (type !== LEAVE_TYPES.TRIP && type !== LEAVE_TYPES.VACATION) {
      return NextResponse.json(
        { error: "출장 또는 휴가를 선택해주세요." },
        { status: 400 },
      );
    }

    let dateKeys: string[] = [];
    if (Array.isArray(dates) && dates.length > 0) {
      dateKeys = dates.filter(isValidDateKey);
    } else if (
      startDate &&
      endDate &&
      isValidDateKey(startDate) &&
      isValidDateKey(endDate)
    ) {
      const allDates = expandDateRange(startDate, endDate);
      dateKeys = excludeWeekends
        ? allDates.filter((d) => {
            const [y, m, day] = d.split("-").map(Number);
            const dow = new Date(y, m - 1, day).getDay();
            return dow !== 0 && dow !== 6;
          })
        : allDates;
    } else {
      return NextResponse.json(
        { error: "유효한 기간을 선택해주세요." },
        { status: 400 },
      );
    }

    if (dateKeys.length === 0) {
      return NextResponse.json(
        { error: "지정할 수 있는 유효한 날짜가 없습니다 (주말 제외 등)." },
        { status: 400 },
      );
    }

    for (const dateKey of dateKeys) {
      if (!isLeaveSelectableDate(dateKey)) {
        return NextResponse.json(
          { error: "이번 달·다음 달 범위 내에서만 지정할 수 있습니다." },
          { status: 400 },
        );
      }
    }

    let created = 0;
    let updated = 0;

    for (const dateKey of dateKeys) {
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
          UPDATE content SET content = ${type}, updated_at = NOW()
          WHERE id = ${existing.id}
        `;
        updated++;
      } else {
        const createdAt = dateKeyToCreatedAt(dateKey);
        const record = await prisma.content.create({
          data: {
            username: username.trim(),
            content: type,
            created_at: createdAt,
          },
        });
        await prisma.$executeRaw`
          UPDATE content SET updated_at = ${createdAt} WHERE id = ${record.id}
        `;
        created++;
      }
    }

    return NextResponse.json({
      ok: true,
      count: dateKeys.length,
      created,
      updated,
    });
  } catch (e) {
    console.error("Leave API error:", e);
    return NextResponse.json(
      { error: "출장·휴가 지정 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { username, startDate, endDate, dates } = body as {
      username: string;
      startDate?: string;
      endDate?: string;
      dates?: string[];
    };

    if (!username?.trim()) {
      return NextResponse.json(
        { error: "팀원을 선택해주세요." },
        { status: 400 },
      );
    }

    let dateKeys: string[] = [];
    if (Array.isArray(dates) && dates.length > 0) {
      dateKeys = dates.filter(isValidDateKey);
    } else if (
      startDate &&
      endDate &&
      isValidDateKey(startDate) &&
      isValidDateKey(endDate)
    ) {
      dateKeys = expandDateRange(startDate, endDate);
    } else {
      return NextResponse.json(
        { error: "유효한 기간 또는 날짜를 선택해주세요." },
        { status: 400 },
      );
    }

    if (dateKeys.length === 0) {
      return NextResponse.json(
        { error: "유효한 기간을 선택해주세요." },
        { status: 400 },
      );
    }

    for (const dateKey of dateKeys) {
      if (!isLeaveSelectableDate(dateKey)) {
        return NextResponse.json(
          { error: "이번 달·다음 달 범위 내에서만 취소할 수 있습니다." },
          { status: 400 },
        );
      }
    }

    let deleted = 0;

    for (const dateKey of dateKeys) {
      const { start, end } = getDateRange(dateKey);
      const existing = await prisma.content.findFirst({
        where: {
          username: username.trim(),
          created_at: { gte: start, lte: end },
          content: { in: [LEAVE_TYPES.TRIP, LEAVE_TYPES.VACATION] },
        },
        orderBy: { created_at: "desc" },
      });

      if (existing) {
        await prisma.content.delete({ where: { id: existing.id } });
        deleted++;
      }
    }

    if (deleted === 0) {
      return NextResponse.json(
        { error: "선택한 기간에 취소할 출장·휴가가 없습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, count: deleted });
  } catch (e) {
    console.error("Leave cancel API error:", e);
    return NextResponse.json(
      { error: "출장·휴가 취소 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
