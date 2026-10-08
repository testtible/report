import { getTodayKey } from "@/app/lib/dates";

export type UrgentTaskStatus = "overdue" | "today" | "urgent";

export type UrgentTaskItem = {
  id: string;
  reportId?: string;
  taskTitle: string;
  rawText: string;
  dueDate: string; // YYYY-MM-DD
  daysLeft: number; // 0: D-Day, 1: D-1, 2: D-2, 3: D-3, 음수: 지연 (D+N)
  status: UrgentTaskStatus;
  author: string;
  reportDate: string; // YYYY-MM-DD
  isCompleted: boolean;
};

/**
 * 숫자 뒤에 붙어 날짜가 아닌 금액, 수량, 단위, 비율임을 나타내는 접미사 블랙리스트
 * 예: 5.4백만원, 3.5억원, 1.2배, 10.5%, 1.5시간, 2.5천원 등
 */
const FORBIDDEN_AFTER_REGEX =
  /^\s*(?:백만원?|천만원?|만원?|억원?|원(?:\s|$|[,\).])|천원?|달러|엔|유로|won|usd|krw|배(?:\s|$|[,\).])|%|프로|퍼센트|건(?:\s|$|[,\).])|개(?:\s|$|[,\).])|명(?:\s|$|[,\).])|회(?:\s|$|[,\).])|차(?:\s|$|[,\).])|대(?:\s|$|[,\).])|곳(?:\s|$|[,\).])|장(?:\s|$|[,\).])|점(?:\s|$|[,\).])|포인트|p|pt|px|시간|분(?:\s|$|[,\).])|초(?:\s|$|[,\).])|일간|주간|개월|년(?:\s|$|[,\).])|달(?:\s|$|[,\).])|kg|g|km|m|cm|mm|gb|mb|kb|tb|fps|hz|khz|ghz)/i;

/**
 * 텍스트 라인에서 마감일 패턴(M/D, M.D, M월 D일, YYYY-MM-DD 등)을 정밀 감지하고 추출합니다.
 * 단순 소수점(5.4백만원, 1.2배)이나 버전 번호(v1.2) 등은 엄격히 배제합니다.
 */
function parseDateFromLine(
  line: string,
  baseYear: number,
): { dueDateStr: string; year: number; month: number; day: number } | null {
  // 1. 연도가 명시된 날짜: 2026-10-08, 2026.10.08, 2026년 10월 8일, 2026/10/08 등
  const fullDateRegex =
    /(?:^|[^\d])(20\d{2})[.\-/년\s]+(0?[1-9]|1[0-2])[.\-/월\s]+(0?[1-9]|[12]\d|3[01])일?(?!\d)/i;
  const fullMatch = line.match(fullDateRegex);
  if (fullMatch) {
    const after = line.slice((fullMatch.index || 0) + fullMatch[0].length);
    if (!FORBIDDEN_AFTER_REGEX.test(after)) {
      const y = Number(fullMatch[1]);
      const m = Number(fullMatch[2]);
      const d = Number(fullMatch[3]);
      const dueDateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { dueDateStr, year: y, month: m, day: d };
    }
  }

  // 2. 한글 '월'과 '일'이 명시된 형식: 10월 8일, 10월 8일까지 등
  const koreanMdRegex =
    /(?:^|[^\d])(0?[1-9]|1[0-2])\s*월\s*(0?[1-9]|[12]\d|3[01])\s*일(?!\d)/i;
  const korMatch = line.match(koreanMdRegex);
  if (korMatch) {
    const after = line.slice((korMatch.index || 0) + korMatch[0].length);
    if (!FORBIDDEN_AFTER_REGEX.test(after)) {
      const m = Number(korMatch[1]);
      const d = Number(korMatch[2]);
      const dueDateStr = `${baseYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { dueDateStr, year: baseYear, month: m, day: d };
    }
  }

  // 3. 물결표(~)가 붙은 마감 표기: ~10/8, ~ 10/8, ~10.8, ~10.8. 등
  const tildeRegex =
    /~\s*(0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])\.?(?!\d)/i;
  const tildeMatch = line.match(tildeRegex);
  if (tildeMatch) {
    const after = line.slice((tildeMatch.index || 0) + tildeMatch[0].length);
    if (!FORBIDDEN_AFTER_REGEX.test(after)) {
      const m = Number(tildeMatch[1]);
      const d = Number(tildeMatch[2]);
      const dueDateStr = `${baseYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { dueDateStr, year: baseYear, month: m, day: d };
    }
  }

  // 4. 마감/목표 키워드가 뒤에 붙은 표기: 10/8까지, 10/8 마감, 10/8 예정, 10.8까지 등
  const suffixKeywordRegex =
    /(?:^|[^\d])(0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])\s*(?:까지|마감|목표|예정|기한)(?!\d)/i;
  const suffixMatch = line.match(suffixKeywordRegex);
  if (suffixMatch) {
    const m = Number(suffixMatch[1]);
    const d = Number(suffixMatch[2]);
    const dueDateStr = `${baseYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { dueDateStr, year: baseYear, month: m, day: d };
  }

  // 5. 마감/목표 키워드가 앞에 붙은 표기: 마감: 10/8, 목표일: 10/8, 일정: 10.8. 등
  const prefixKeywordRegex =
    /(?:마감|목표|기한|일정|목표일)[\s:]+(0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])\.?(?!\d)/i;
  const prefixMatch = line.match(prefixKeywordRegex);
  if (prefixMatch) {
    const after = line.slice((prefixMatch.index || 0) + prefixMatch[0].length);
    if (!FORBIDDEN_AFTER_REGEX.test(after)) {
      const m = Number(prefixMatch[1]);
      const d = Number(prefixMatch[2]);
      const dueDateStr = `${baseYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { dueDateStr, year: baseYear, month: m, day: d };
    }
  }

  // 6. 괄호 안에 단독으로 감싸진 날짜: (10/8), [10/8], (10.8), [10.8]
  const bracketRegex =
    /[(\[](0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])(?:\s*\([월화수목금토일]\))?[)\]]/i;
  const bracketMatch = line.match(bracketRegex);
  if (bracketMatch) {
    const m = Number(bracketMatch[1]);
    const d = Number(bracketMatch[2]);
    const dueDateStr = `${baseYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { dueDateStr, year: baseYear, month: m, day: d };
  }

  // 7. 요일 또는 끝 점이 명확히 붙은 날짜: 10.8(수), 10/8(수), 10.8.
  const dotOrDayRegex =
    /(?:^|[^\d])(0?[1-9]|1[0-2])[./](0?[1-9]|[12]\d|3[01])(?:(?:\.|\s*\([월화수목금토일]\)))(?!\d)/i;
  const dotOrDayMatch = line.match(dotOrDayRegex);
  if (dotOrDayMatch) {
    const after = line.slice((dotOrDayMatch.index || 0) + dotOrDayMatch[0].length);
    if (!FORBIDDEN_AFTER_REGEX.test(after)) {
      const m = Number(dotOrDayMatch[1]);
      const d = Number(dotOrDayMatch[2]);
      const dueDateStr = `${baseYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { dueDateStr, year: baseYear, month: m, day: d };
    }
  }

  return null;
}

/**
 * 보고서 텍스트에서 마감일이 포함된 업무 목록을 추출합니다.
 */
export function extractTasksFromContent(
  content: string,
  author: string,
  reportDate: string,
  baseDateKey: string = getTodayKey(),
  reportId?: string,
): UrgentTaskItem[] {
  if (!content || !content.trim()) return [];

  const lines = content.split("\n");
  const [by] = baseDateKey.split("-").map(Number);
  const baseDate = new Date(`${baseDateKey}T00:00:00`);
  const tasks: UrgentTaskItem[] = [];

  let currentSection = "";

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // 헤더(#) 라인 감지
    const headerMatch = trimmed.match(/^#{1,6}\s*(.*)/);
    if (headerMatch) {
      currentSection = headerMatch[1].trim();
      continue;
    }

    // 완료 여부 판별:
    // 1) 체크박스 체크: - [x], -[x], -[ x], -[x ], - [ x ] 등
    // 2) 취소선: ~~업무 내용~~
    // 3) 완료 키워드: [완료], (완료), 완료:, ✅
    // 4) 섹션 헤더에 '완료' 또는 'Done' 키워드가 있고 '예정'/'To-do'가 없는 경우
    const isCompletedByText =
      /^[-*+]\s*\[\s*[xX]\s*\]/.test(trimmed) ||
      /^~~.*~~$/.test(trimmed) ||
      /\[완료\]|\(완료\)|^\s*완료\s*[:：]|✅/i.test(trimmed);

    const isCompletedBySection =
      Boolean(currentSection) &&
      /완료|Done|마감됨/i.test(currentSection) &&
      !/예정|진행\s*중|To-?do/i.test(currentSection);

    const isCompleted = isCompletedByText || isCompletedBySection;

    // 날짜 정밀 파싱
    const parsed = parseDateFromLine(trimmed, by);
    if (!parsed) continue;

    // 마감일 계산 (0시 기준)
    const dueDate = new Date(`${parsed.dueDateStr}T00:00:00`);
    if (isNaN(dueDate.getTime())) continue;

    const diffTime = dueDate.getTime() - baseDate.getTime();
    const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // 상태 분류:
    // 음수: 지연 (overdue), 0: 오늘 (today), 1~3: 임박 (urgent)
    let status: UrgentTaskStatus;
    if (daysLeft < 0) {
      status = "overdue";
    } else if (daysLeft === 0) {
      status = "today";
    } else {
      status = "urgent";
    }

    // 업무 내용 정제: 앞의 불릿/체크박스/기호 제거
    let taskTitle = trimmed
      .replace(/^[-*+]\s*(\[\s*[xX]?\s*\]\s*)?/, "") // 불릿 및 체크박스 제거 (- [ ], -[], -[x], -[ x] 등 모두 지원)
      .replace(/^\d+[.)]\s*/, "") // 1. 2) 번호 리스트 제거
      .trim();

    if (!taskTitle) continue;

    tasks.push({
      id: `${author}-${parsed.dueDateStr}-${idx}-${taskTitle.slice(0, 15)}`,
      reportId,
      taskTitle,
      rawText: trimmed,
      dueDate: parsed.dueDateStr,
      daysLeft,
      status,
      author,
      reportDate,
      isCompleted,
    });
  }

  return tasks;
}

/**
 * 3일 이내 마감 업무(D-3, D-2, D-1, 오늘 D-Day) 및 최근 14일 이내 지연(overdue)된 업무만 필터링합니다.
 * - 이미 완료된 업무(!isCompleted) 제외
 * - 14일 이상 오래된 과거 지연 일정(daysLeft < -14) 제외하여 오인식 및 장기 방치 데이터 차단
 */
export function filterUrgentTasks(tasks: UrgentTaskItem[]): UrgentTaskItem[] {
  return (
    tasks
      .filter((t) => !t.isCompleted && t.daysLeft <= 3 && t.daysLeft >= -14)
      .sort((a, b) => {
        // 1. D-Day 기준 오름차순 (지연 -> D-Day -> D-1 -> D-2 -> D-3)
        if (a.daysLeft !== b.daysLeft) {
          return a.daysLeft - b.daysLeft;
        }
        // 2. 마감일자 오름차순
        return a.dueDate.localeCompare(b.dueDate);
      })
  );
}
