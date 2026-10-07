import { NextResponse } from "next/server";
import { getUsersFromDb } from "@/app/lib/users";
import { MEMBERS } from "@/app/lib/members";

export async function GET() {
  try {
    const users = await getUsersFromDb();
    if (users.length > 0) {
      return NextResponse.json({ users });
    }
    // DB에 데이터가 없을 경우 기존 MEMBERS 목록으로 폴백
    const fallback = MEMBERS.map((name, index) => ({
      id: String(index + 1),
      name,
    }));
    return NextResponse.json({ users: fallback });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "사용자 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
