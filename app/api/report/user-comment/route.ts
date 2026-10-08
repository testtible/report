import { NextRequest, NextResponse } from "next/server";
import { updateUserComment } from "@/app/lib/reportStorage";

export async function POST(request: NextRequest) {
  try {
    const { id, userComment } = await request.json();
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

    const trimmedComment =
      typeof userComment === "string" ? userComment.trim() : null;

    await updateUserComment(
      reportId,
      trimmedComment && trimmedComment.length > 0 ? trimmedComment : null,
    );

    return NextResponse.json({
      ok: true,
      userComment: trimmedComment,
      isUserComment: false,
    });
  } catch (error) {
    console.error("Update user comment error:", error);
    return NextResponse.json(
      { error: "요청 코멘트 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
