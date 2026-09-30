import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { MEMBERS } from "@/app/lib/members";
import { getAiApiUrl, getAiModel } from "@/app/lib/ai";
import {
  getMonthsAgoKey,
  getTodayKey,
  validateDateRange,
} from "@/app/lib/dates";

export const maxDuration = 60;

// 키워드 추출 시 제외할 불용어
const STOP_WORDS = new Set([
  "알려줘", "알려", "요약해줘", "요약", "정리해줘", "정리", "어떤", "누구야",
  "누구", "언제", "어디", "무엇", "있어", "있나요", "했어", "했나요",
  "보고서", "내용", "관련", "대해", "대해서", "최근", "오늘", "어제",
  "작업", "업무", "사항", "현황", "진행", "결과", "부탁해", "확인해줘",
  "대한", "모두", "전부", "질문", "답변", "부탁",
]);

function extractSearchKeywords(text: string): string[] {
  const cleaned = text.replace(/[^\w가-힣\s]/g, " ");
  const tokens = cleaned.split(/\s+/);
  const keywords: string[] = [];

  for (const token of tokens) {
    const word = token.trim();
    if (word.length >= 2 && !STOP_WORDS.has(word)) {
      keywords.push(word);
    }
  }

  return Array.from(new Set(keywords));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const question = body?.question;
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "질문 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();

    // 기간 설정: 기본값 1개월 전 ~ 오늘, 최대 3개월
    const today = getTodayKey();
    const defaultStart = getMonthsAgoKey(1);
    const startDate =
      body?.startDate && typeof body.startDate === "string"
        ? body.startDate
        : defaultStart;
    const endDate =
      body?.endDate && typeof body.endDate === "string"
        ? body.endDate
        : today;

    const validation = validateDateRange(startDate, endDate, 3);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "기간 설정이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const startDateTime = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endDateTime = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    // 1. 질문에서 팀원 이름 탐색
    const matchedMember = MEMBERS.find((m) => trimmedQuestion.includes(m));

    // 2. 질문에서 핵심 검색 키워드 추출
    const keywords = extractSearchKeywords(trimmedQuestion);

    type ReportItem = {
      username: string;
      content: string | null;
      created_at: Date;
    };

    let matchedReports: ReportItem[] = [];

    if (matchedMember) {
      // 1순위: 특정 팀원 언급 시 지정된 기간 내에서 해당 팀원의 보고서 최신순 조회
      matchedReports = await prisma.content.findMany({
        where: {
          username: matchedMember,
          content: { not: null },
          created_at: {
            gte: startDateTime,
            lte: endDateTime,
          },
        },
        orderBy: { created_at: "desc" },
        take: 15,
        select: { username: true, content: true, created_at: true },
      });
    } else if (keywords.length > 0) {
      // 2순위: 키워드가 있으면 지정된 기간 내에서 해당 키워드를 포함하는 보고서 검색
      matchedReports = await prisma.content.findMany({
        where: {
          created_at: {
            gte: startDateTime,
            lte: endDateTime,
          },
          OR: keywords.map((kw) => ({
            content: { contains: kw, mode: "insensitive" },
          })),
        },
        orderBy: { created_at: "desc" },
        take: 15,
        select: { username: true, content: true, created_at: true },
      });
    }

    // 3. 만약 검색 결과가 4개 미만이면, 지정 기간 내 최신 보고서로 보충 (팀 전체 현황 파악 목적)
    if (matchedReports.length < 4) {
      const recentReports = await prisma.content.findMany({
        where: {
          content: { not: null },
          created_at: {
            gte: startDateTime,
            lte: endDateTime,
          },
        },
        orderBy: { created_at: "desc" },
        take: 10,
        select: { username: true, content: true, created_at: true },
      });

      const existingKeys = new Set(
        matchedReports.map((r) => `${r.username}-${r.created_at.getTime()}`)
      );

      for (const r of recentReports) {
        const key = `${r.username}-${r.created_at.getTime()}`;
        if (!existingKeys.has(key)) {
          matchedReports.push(r);
          existingKeys.add(key);
        }
        if (matchedReports.length >= 10) break;
      }
    }

    // 유효한 본문이 있는 보고서만 필터링
    const validReports = matchedReports.filter(
      (r) => r.content && r.content.trim().length > 0
    );

    if (validReports.length === 0) {
      return NextResponse.json(
        {
          error: `설정하신 기간(${startDate} ~ ${endDate}) 내에 조회 가능한 보고서 데이터가 없습니다.`,
        },
        { status: 404 }
      );
    }

    // 최신순 정렬
    validReports.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime()
    );

    // 프롬프트 컨텍스트 생성 (빠른 실시간 생성을 위해 최대 3,500자로 조절)
    let totalLen = 0;
    const finalReports: ReportItem[] = [];
    for (const r of validReports) {
      const len = r.content?.trim().length || 0;
      if (totalLen + len > 3500 && finalReports.length >= 3) break;
      finalReports.push(r);
      totalLen += len;
    }

    const contextData = finalReports
      .map((r) => {
        const dateStr = r.created_at.toISOString().slice(0, 10);
        return `[작성자: ${r.username} | 보고일자: ${dateStr}]\n${r.content?.trim()}`;
      })
      .join("\n\n---\n\n");

    const prompt = `
### Role
너는 사내 업무 보고서를 기반으로 질문에 답변하는 스마트 AI 업무 비서이다.
반드시 한국어로 친절하고 명확하게 비즈니스 톤으로 답변해라.

### Guidelines
1. 반드시 아래 [사내 보고서 데이터 (조회 기간: ${startDate} ~ ${endDate})]에 기록된 실제 내용에만 기반해서 답변해라.
2. 설정된 기간(${startDate} ~ ${endDate}) 내 데이터에 없는 내용은 절대 거짓으로 지어내지 마라. 내용이 없다면 "설정된 기간(${startDate} ~ ${endDate}) 내의 보고서 기록에서는 해당 내용을 찾을 수 없습니다."라고 분명하게 밝혀라.
3. 답변할 때는 관련 팀원의 이름과 보고 날짜(예: 9월 12일)를 함께 언급하여 근거를 명확히 제시해라.
4. 한눈에 읽기 편하도록 간결하고 가독성 좋은 개조식(글머리 기호) 또는 단락으로 정리해라.

### 사내 보고서 데이터 (조회 기간: ${startDate} ~ ${endDate})
${contextData}

### 팀장님 질문
${trimmedQuestion}

### 답변:
`;

    // 4. Ollama 스트리밍 호출
    const ollamaResponse = await fetch(getAiApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getAiModel(),
        prompt,
        stream: true,
        options: {
          num_ctx: 8192,
          num_predict: 600,
          temperature: 0.3,
        },
      }),
    });

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      const errorText = await ollamaResponse.text().catch(() => "");
      console.error("Ollama API Error:", errorText);
      return NextResponse.json(
        { error: "사내 AI 서버 응답에 실패했습니다." },
        { status: 500 }
      );
    }

    // 5. Ollama ndjson 스트림을 파싱하여 실시간 텍스트 스트림으로 변환
    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const textStream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  controller.enqueue(encoder.encode(parsed.response));
                }
                if (parsed.done) {
                  controller.close();
                  return;
                }
              } catch {
                // 파싱 실패한 불완전한 chunk는 무시
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("AI 질의 처리 오류:", error);
    return NextResponse.json(
      {
        error: `서버 내부 오류가 발생했습니다: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
