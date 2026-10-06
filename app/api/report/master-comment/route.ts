import { NextRequest, NextResponse } from "next/server";
import { updateMasterComment } from "@/app/lib/reportStorage";

export async function POST(request: NextRequest) {
  try {
    const { id, masterComment } = await request.json();
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

    const commentValue =
      typeof masterComment === "string" ? masterComment.trim() : null;

    await updateMasterComment(reportId, commentValue || null);

    return NextResponse.json({
      ok: true,
      masterComment: commentValue || null,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Master comment save error:", error);
    return NextResponse.json(
      {
        error: "코멘트 저장 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
