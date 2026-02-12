import { NextRequest, NextResponse } from "next/server";
import { hashReadReportAuth, isReadReportPasswordValid } from "@/app/lib/auth";

const COOKIE_NAME = "read_report_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7일

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!isReadReportPasswordValid(password)) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const token = hashReadReportAuth(password);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/read-report",
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch {
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
