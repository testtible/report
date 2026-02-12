import { createHmac } from "crypto";

const COOKIE_SALT = "read-report-auth-v1";

/** read-report 인증 쿠키 값 생성 (서버 전용) */
export function hashReadReportAuth(password: string): string {
  return createHmac("sha256", COOKIE_SALT).update(password).digest("hex");
}

export function isReadReportPasswordValid(input: string): boolean {
  const expected = process.env.NEXT_PUBLIC_PW ?? "";
  return expected !== "" && input === expected;
}
