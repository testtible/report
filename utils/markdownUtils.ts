/**
 * 마크다운 에디터 서식 및 텍스트 조작 관련 순수 계산 함수
 */

export const DEFAULT_REPORT_TEMPLATE = `### [진행 업무]
- [x] 주요 완료 작업
- [ ] 진행 중인 작업

### [이슈 및 특이사항]
- 특이사항 및 협의 필요 내용 없음

### [내일 예정 사항]
- 내일 진행할 작업 계획`;

export type TextSelectionRange = {
  start: number;
  end: number;
};

export type MarkdownInsertResult = {
  nextText: string;
  nextCursorPos: number;
};

/**
 * 텍스트의 특정 선택 영역에 마크다운 접두사/접미사를 삽입하고 새로운 커서 위치를 계산합니다.
 */
export function calculateMarkdownInsert(
  source: string,
  range: TextSelectionRange,
  prefix: string,
  suffix: string = "",
): MarkdownInsertResult {
  const { start, end } = range;
  const selected = source.substring(start, end);
  const replacement = selected
    ? `${prefix}${selected}${suffix}`
    : `${prefix}${suffix}`;

  const nextText =
    source.substring(0, start) + replacement + source.substring(end);

  const nextCursorPos = selected
    ? start + replacement.length
    : start + prefix.length;

  return { nextText, nextCursorPos };
}
