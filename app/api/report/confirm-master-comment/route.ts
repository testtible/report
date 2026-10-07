import { NextRequest, NextResponse } from "next/server";
import { confirmMasterComment } from "@/app/lib/reportStorage";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "보고서 ID가 필요합니다." },
        { status: 400 },
      );
    }

    let reportId: bigint;
    try {
      reportId = BigInt(id);
    } catch {
      return NextResponse.json(
        { error: "올바르지 않은 보고서 ID 형식입니다." },
        { status: 400 },
      );
    }

    await confirmMasterComment(reportId);

    return NextResponse.json({ ok: true, isConfirmMasterComment: true });
  } catch (error) {
    console.error("Confirm master comment error:", error);
    return NextResponse.json(
      { error: "코멘트 확인 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
