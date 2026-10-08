import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  dateToKey,
  getDateRange,
  getTodayKey,
  isValidDateKey,
} from "@/app/lib/dates";
import { getAiApiUrl, getAiModel } from "@/app/lib/ai";
import type { UrgentTaskItem } from "@/features/report/utils/deadlineParser";

export const dynamic = "force-dynamic";

interface WeekdayInfo {
  date: string; // YYYY-MM-DD
  dayName: string; // 월요일, 화요일, ...
  label: string; // 오늘(기준일), 저번주 금요일 등
}

/**
 * 기준일로부터 이전 평일(주말 제외) 3일을 정확하게 계산
 * 예: 10월 8일(목) -> 10/8(목, 오늘/기준일), 10/7(수), 10/6(화)
 * 예: 10월 5일(월) -> 10/5(월, 오늘/기준일), 10/2(금), 10/1(목)
 */
function getThreeWeekdaysDetail(baseDateStr: string): WeekdayInfo[] {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const result: WeekdayInfo[] = [];
  const [y, m, d] = baseDateStr.split("-").map(Number);
  const curr = new Date(y, m - 1, d);

  while (result.length < 3) {
    const day = curr.getDay();
    if (day !== 0 && day !== 6) {
      // 주말(일=0, 토=6) 제외
      const yStr = curr.getFullYear();
      const mStr = String(curr.getMonth() + 1).padStart(2, "0");
      const dStr = String(curr.getDate()).padStart(2, "0");
      const dateKey = `${yStr}-${mStr}-${dStr}`;
      const isBase = result.length === 0;
      const label = isBase ? "오늘 / 기준일" : "";

      result.push({
        date: dateKey,
        dayName: `${dayNames[day]}요일`,
        label,
      });
    }
    curr.setDate(curr.getDate() - 1);
  }

  return result;
}

interface RawAiTask {
  taskTitle: string;
  dueDate: string;
  rawText?: string;
  reportDate?: string;
}

/** Ollama AI 호출 (타임아웃 60초, 1회 재시도 포함 총 2회 시도) */
async function callOllamaAnalysis(
  prompt: string,
  maxAttempts: number = 2,
): Promise<RawAiTask[] | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 타임아웃

    try {
      const response = await fetch(getAiApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: getAiModel(),
          prompt,
          stream: false,
          format: "json",
          options: {
            num_ctx: 4096,
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(
          `[UrgentTasks AI] Attempt ${attempt} failed with status: ${response.status}`,
        );
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return null;
      }

      const data = (await response.json()) as { response?: string };
      if (!data.response) {
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return null;
      }

      let parsed: { tasks?: RawAiTask[] } | RawAiTask[];
      try {
        parsed = JSON.parse(data.response.trim());
      } catch {
        // 코드 블록 백틱 제거 후 재파싱
        const cleanJson = data.response
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsed = JSON.parse(cleanJson);
      }

      const rawTasks = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.tasks)
          ? parsed.tasks
          : [];

      return rawTasks;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(
        `[UrgentTasks AI] Attempt ${attempt} encountered error:`,
        err instanceof Error ? err.message : String(err),
      );
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
    }
  }

  return null;
}

function normalizeText(s: string): string {
  return s
    .replace(/-\s*\[[ xX]\]/g, "")
    .replace(/[~`'"()[\]{}#*_\-+=:,./\\]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** 보고서들에서 - [x] 체크되거나 완료 표시된 모든 업무 텍스트를 수집 */
function extractCompletedNorms(
  reports: { content: string | null }[],
): Set<string> {
  const norms = new Set<string>();
  for (const r of reports) {
    if (!r.content) continue;
    for (const line of r.content.split("\n")) {
      const trimmed = line.trim();
      if (
        /-\s*\[[xX]\]/.test(trimmed) ||
        /\[완료\]|\(완료\)/.test(trimmed) ||
        /완료(?:됨|완료|함)/.test(trimmed)
      ) {
        const text = trimmed
          .replace(/-\s*\[[xX]\]/, "")
          .replace(/\[완료\]|\(완료\)/, "")
          .trim();
        const norm = normalizeText(text);
        if (norm.length >= 2) norms.add(norm);
      }
    }
  }
  return norms;
}

/**
 * 보고서 본문에서 완료된 업무 및 하위 업무가 모두 완료된 섹션을 사전 제거하여
 * AI에게 미완료 업무만 제공
 */
function cleanReportForAi(
  content: string,
  completedNorms: Set<string>,
): string {
  const lines = content.split("\n");
  const sections: { header: string; lines: string[] }[] = [];
  let currentHeader = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,4}\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      if (currentHeader || currentLines.length > 0) {
        sections.push({ header: currentHeader, lines: currentLines });
      }
      currentHeader = trimmed;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeader || currentLines.length > 0) {
    sections.push({ header: currentHeader, lines: currentLines });
  }

  const keptSections: string[] = [];
  for (const sec of sections) {
    const trimmedHeader = sec.header.trim();
    // 공통 메타 섹션 제외
    if (
      trimmedHeader === "### [진행 업무]" ||
      trimmedHeader === "## [진행 업무]" ||
      trimmedHeader === "### [내일 예정 사항]" ||
      trimmedHeader === "## [내일 예정 사항]" ||
      trimmedHeader === "### [이슈 및 특이사항]" ||
      trimmedHeader === "## [이슈 및 특이사항]" ||
      trimmedHeader === "### [차주 예정 사항]" ||
      trimmedHeader === "## [차주 예정 사항]" ||
      trimmedHeader.includes("완료한 업무") ||
      trimmedHeader.includes("완료된 업무")
    ) {
      continue;
    }

    const keptLines: string[] = [];
    for (const line of sec.lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // 완료 체크 표시 제외
      if (/-\s*\[[xX]\]/.test(trimmed) || /\[완료\]|\(완료\)/.test(trimmed)) {
        continue;
      }

      // 이미 완료된 업무 셋과 일치/포함 시 제외
      const norm = normalizeText(trimmed);
      let isCompleted = false;
      for (const comp of completedNorms) {
        if (norm.includes(comp) || comp.includes(norm)) {
          isCompleted = true;
          break;
        }
      }
      if (isCompleted) continue;
      keptLines.push(line);
    }

    // 하위 작업이 모두 완료되어 남은 작업이 없는 섹션은 헤더까지 제거
    if (keptLines.length > 0) {
      keptSections.push(
        sec.header ? `${sec.header}\n${keptLines.join("\n")}` : keptLines.join("\n"),
      );
    }
  }

  return keptSections.join("\n\n");
}

/** 출처 텍스트에 목표 날짜(MM-DD, M/D 등)가 실제로 언급되어 있는지 검증 */
function hasDateMentionInSource(dueDate: string, text: string): boolean {
  const parts = dueDate.split("-");
  if (parts.length !== 3) return false;
  const [_, mm, dd] = parts;
  const m = String(Number(mm));
  const d = String(Number(dd));
  const regexes = [
    new RegExp(`${mm}[-/.]${dd}`),
    new RegExp(`${m}[-/.]${d}`),
    new RegExp(`${m}월\\s*${d}일`),
    new RegExp(`~\\s*${mm}[-/.]${dd}`),
    new RegExp(`~\\s*${m}[-/.]${d}`),
  ];
  return regexes.some((r) => r.test(text));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const username = (
      searchParams.get("username") || searchParams.get("member")
    )?.trim();
    const dateParam = searchParams.get("date");
    const baseDateKey =
      dateParam && isValidDateKey(dateParam) ? dateParam : getTodayKey();

    // 팀원이 지정되지 않은 경우 빈 목록 반환
    if (!username) {
      return NextResponse.json({
        baseDate: baseDateKey,
        totalCount: 0,
        urgentTasks: [],
      });
    }

    // 1. [로직 사전 계산] 기준일 포함 최근 평일 3일 일자 계산
    const weekdays = getThreeWeekdaysDetail(baseDateKey);
    const targetDates = weekdays.map((w) => w.date);
    const oldestDate = targetDates[targetDates.length - 1];
    const { start: startDate } = getDateRange(oldestDate);
    const { end: endDate } = getDateRange(baseDateKey);

    // 2. 평일 3일간의 해당 팀원 보고서 DB 조회
    const reports = await prisma.$queryRaw<
      {
        id: bigint;
        username: string;
        content: string | null;
        created_at: Date;
      }[]
    >`
      SELECT id, username, content, created_at
      FROM content
      WHERE username = ${username}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND content IS NOT NULL
      ORDER BY created_at ASC
    `;

    const validReports = reports.filter((r) => r.content && r.content.trim());
    if (validReports.length === 0) {
      return NextResponse.json({
        baseDate: baseDateKey,
        totalCount: 0,
        urgentTasks: [],
      });
    }

    // 3. 완료된 항목 사전 수집 및 보고서 전처리 (완료된 업무 및 빈 헤더 제거)
    const completedNorms = extractCompletedNorms(validReports);

    // 날짜 순서를 과거 -> 최신으로 정렬하여 AI에게 제공
    const chronologicalWeekdays = [...weekdays].reverse();

    const formattedReports = chronologicalWeekdays
      .map((w) => {
        const matchingReports = validReports.filter((r) => {
          const reportDateStr = dateToKey(r.created_at);
          return reportDateStr === w.date;
        });

        if (matchingReports.length === 0) {
          return `### [${w.date} (${w.dayName})]\n(작성된 보고서 없음)`;
        }

        const cleanedContent = matchingReports
          .map((r) => cleanReportForAi(r.content || "", completedNorms))
          .filter(Boolean)
          .join("\n\n");

        return `### [${w.date} (${w.dayName})]\n${cleanedContent || "(진행 중인 미완료 업무 없음)"}`;
      })
      .join("\n\n---\n\n");

    // 4. Ollama AI 분석 프롬프트
    const prompt = `당신은 사내 일일 업무 보고서 분석 AI입니다.
아래 데이터는 최근 일일 보고서에서 이미 완료된 업무(- [x], 완료 표시)를 사전에 모두 제거한 **미완료 업무 목록**입니다.
이 목록에서 기준 일자('${baseDateKey}') 기준 '마감 임박 업무'와 '최근 지연 업무'를 추출하십시오.

### 분석 기준 일자: ${baseDateKey} (${weekdays[0]?.dayName || "오늘"})

### 추출 규칙:
1. 대상 업무:
   - 본문 항목이나 소제목에 명시적 마감 날짜(예: '~10-07', '~10-08', '10/8까지', '10월 8일' 등)가 존재하는 미완료 업무만 추출하십시오.
   - 기준일(${baseDateKey})로부터 3일 이내에 도래하는 마감 업무 (D-Day, D-1, D-2, D-3)
   - 기준일 이전 마감일이지만 아직 완료되지 않은 최근 지연 업무 (최근 7일 이내 지연)
2. 엄격한 제외 규칙:
   - 마감일(~MM-DD, ~MM/DD 등)이 전혀 기재되어 있지 않은 일반 업무는 절대로 추출하지 마십시오. 마감일을 임의로 생성하거나 기준일로 조작하지 마십시오.
   - 금액(예: 5.4백만원, 35백만원), 비율/배수(1.2배, 10%), 버전(v1.2)은 날짜가 아니므로 절대 마감일로 추출하지 마십시오.
   - 이미 완료되었거나 완료 표시된 항목은 절대 추출하지 마십시오.

### 미완료 보고서 데이터:
${formattedReports}

### 응답 형식:
반드시 아래 JSON 형식으로만 응답하십시오 (해당되는 마감 업무가 없다면 "tasks": [] 빈 배열을 반환하십시오):
{
  "tasks": [
    {
      "taskTitle": "업무 명칭 (간결하게 요약)",
      "dueDate": "YYYY-MM-DD",
      "rawText": "보고서 내 원문 문장"
    }
  ]
}`;

    // 5. Ollama AI 백그라운드 호출 (최대 2회 시도, 실패 시 null)
    const rawAiTasks = await callOllamaAnalysis(prompt, 2);

    if (rawAiTasks === null) {
      return NextResponse.json({
        baseDate: baseDateKey,
        totalCount: 0,
        urgentTasks: [],
        hasError: true,
        error: "사내 AI 서버 응답 시간(60초)을 초과했거나 분석에 실패했습니다.",
      });
    }

    // 6. 결과 정제 및 이중 검증 (완료 여부 확인 & 날짜 날조 방지)
    const baseDate = new Date(`${baseDateKey}T00:00:00`);
    const processedTasks: UrgentTaskItem[] = [];
    const seenTitles = new Set<string>();

    for (const raw of rawAiTasks) {
      if (!raw.taskTitle || !raw.dueDate) continue;

      // YYYY-MM-DD 형식 유효성 확인
      const cleanDueDate = raw.dueDate.trim();
      const dueDateObj = new Date(`${cleanDueDate}T00:00:00`);
      if (isNaN(dueDateObj.getTime())) continue;

      // 정확한 D-Day 계산
      const diffTime = dueDateObj.getTime() - baseDate.getTime();
      const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // D-3 이내 도래 및 최근 7일 이내 지연만 허용
      if (daysLeft > 3 || daysLeft < -7) continue;

      // 사후 검증 1: 완료된 업무 필터링
      const normTitle = normalizeText(raw.taskTitle);
      const normRaw = normalizeText(raw.rawText || "");
      let isCompleted = false;
      for (const comp of completedNorms) {
        if (comp.length < 2) continue;
        if (
          normTitle.includes(comp) ||
          comp.includes(normTitle) ||
          normRaw.includes(comp) ||
          comp.includes(normRaw)
        ) {
          isCompleted = true;
          break;
        }
      }
      if (isCompleted) continue;

      // 사후 검증 2: 마감일 허위 생성(Hallucination) 방지
      const hasDate =
        hasDateMentionInSource(cleanDueDate, raw.rawText || "") ||
        hasDateMentionInSource(cleanDueDate, raw.taskTitle) ||
        hasDateMentionInSource(cleanDueDate, formattedReports);
      if (!hasDate) continue;

      // 중복 방지 (동일 업무 및 마감일)
      const dedupeKey = `${cleanDueDate}::${normTitle}`;
      if (seenTitles.has(dedupeKey)) continue;
      seenTitles.add(dedupeKey);

      const status =
        daysLeft < 0 ? "overdue" : daysLeft === 0 ? "today" : "urgent";

      processedTasks.push({
        id: `${username}-${cleanDueDate}-${processedTasks.length}-${raw.taskTitle.slice(0, 10)}`,
        taskTitle: raw.taskTitle.trim(),
        rawText: raw.rawText?.trim() || raw.taskTitle.trim(),
        dueDate: cleanDueDate,
        daysLeft,
        status,
        author: username,
        reportDate: cleanDueDate,
        isCompleted: false,
      });
    }

    // D-Day 오름차순 정렬 (지연 -> D-Day -> D-1 -> D-2 -> D-3)
    processedTasks.sort((a, b) => {
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return a.dueDate.localeCompare(b.dueDate);
    });

    return NextResponse.json({
      baseDate: baseDateKey,
      totalCount: processedTasks.length,
      urgentTasks: processedTasks,
      hasError: false,
    });
  } catch (error) {
    console.warn("Urgent tasks AI route error:", error);
    return NextResponse.json({
      baseDate: getTodayKey(),
      totalCount: 0,
      urgentTasks: [],
      hasError: true,
      error: "마감 임박 업무 분석 처리 중 오류가 발생했습니다.",
    });
  }
}
