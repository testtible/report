import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, content } = body as { username: string; content: string };

    if (!username?.trim()) {
      return NextResponse.json(
        { error: "팀원을 선택해주세요." },
        { status: 400 },
      );
    }

    const created = await prisma.content.create({
      data: {
        username: username.trim(),
        content: content?.trim() ?? "",
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id.toString(),
    });
  } catch (e) {
    console.error("Report API error:", e);
    return NextResponse.json(
      { error: "보고서 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
