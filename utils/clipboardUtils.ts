/**
 * 보고서 텍스트 가공 및 클립보드 복사 유틸리티
 */

export type ReportToCopy = {
  username: string;
  content: string;
};

/**
 * 제출된 보고서 목록을 하나의 텍스트로 합치는 계산 함수
 */
export function buildReportClipboardText(reports: ReportToCopy[]): string {
  return reports
    .map(({ username, content }) => `${username}\n${content}`)
    .join("\n\n");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy clipboard:", err);
    return false;
  }
}
