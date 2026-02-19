import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { hashMemberHistoryAuth } from "@/app/lib/auth";

const MEMBER_HISTORY_COOKIE = "member_history_auth";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username?.trim()) {
    return NextResponse.json(
      { error: "username이 필요합니다." },
      { status: 400 },
    );
  }

  // 이력 조회용 비밀번호 검증 쿠키 확인
  const cookie = request.cookies.get(MEMBER_HISTORY_COOKIE);
  const expectedToken =
    process.env.NEXT_PUBLIC_MEMBER_PW !== null
      ? hashMemberHistoryAuth(process.env.NEXT_PUBLIC_MEMBER_PW ?? "")
      : "";

  if (!expectedToken || cookie?.value !== expectedToken) {
    return NextResponse.json(
      { error: "이력 조회 권한이 없습니다." },
      { status: 401 },
    );
  }

  const reports = await prisma.content.findMany({
    where: { username: username.trim() },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      created_at: true,
      content: true,
    },
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id.toString(),
      created_at: r.created_at.toISOString(),
      content: r.content ?? "",
    })),
  });
}
