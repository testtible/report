import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "보고 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const reportId = BigInt(id);

    // 해당 보고서를 찾아서 created_at 값을 가져옵니다.
    const report = await prisma.content.findUnique({
      where: { id: reportId },
      select: { created_at: true },
    });

    if (!report) {
      return NextResponse.json(
        { error: "보고서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // updated_at을 created_at과 동일하게 설정하여 수정 리스트에서 제외되도록 합니다.
    await prisma.content.update({
      where: { id: reportId },
      data: {
        updated_at: report.created_at,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Confirm modification error:", error);
    return NextResponse.json(
      { error: "처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
