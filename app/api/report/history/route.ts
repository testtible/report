import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username?.trim()) {
    return NextResponse.json(
      { error: "username이 필요합니다." },
      { status: 400 }
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
