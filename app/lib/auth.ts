import { createHmac } from "crypto";

const READ_REPORT_COOKIE_SALT = "read-report-auth-v1";
const MEMBER_HISTORY_COOKIE_SALT = "member-history-auth-v1";

/** read-report 페이지 인증 쿠키 값 생성 (서버 전용) */
export function hashReadReportAuth(password: string): string {
  return createHmac("sha256", READ_REPORT_COOKIE_SALT)
    .update(password)
    .digest("hex");
}

export function isReadReportPasswordValid(input: string): boolean {
  const expected = process.env.NEXT_PUBLIC_PW ?? "";
  return expected !== "" && input === expected;
}

/** 팀원 이력 모달 접근용 쿠키 값 생성 (서버 전용) */
export function hashMemberHistoryAuth(password: string): string {
  return createHmac("sha256", MEMBER_HISTORY_COOKIE_SALT)
    .update(password)
    .digest("hex");
}

export function isMemberPasswordValid(input: string): boolean {
  const expected = process.env.NEXT_PUBLIC_MEMBER_PW ?? "";
  return expected !== "" && input === expected;
}
