import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getAiApiUrl, getAiModel } from "@/app/lib/ai";

export const maxDuration = 60;

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const username = body?.username;

    if (!username || typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "요약할 팀원을 선택해주세요." },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // 1. 해당 팀원의 최근 보고서 5건 조회
    const reports = await prisma.content.findMany({
      where: {
        username: trimmedUsername,
        content: { not: null },
      },
      orderBy: { created_at: "desc" },
      take: 5,
      select: { id: true, created_at: true, content: true },
    });

    const validReports = reports.filter(
      (r) => r.content && r.content.trim().length > 0
    );

    if (validReports.length === 0) {
      return NextResponse.json(
        { error: `${trimmedUsername} 팀원의 최근 제출된 보고서 데이터가 없습니다.` },
        { status: 404 }
      );
    }

    // 오래된 순 -> 최신 순 정렬하여 흐름 파악하기 쉽게 정렬
    const sortedReports = [...validReports].sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime()
    );

    const firstDate = formatDateKey(sortedReports[0].created_at);
    const lastDate = formatDateKey(sortedReports[sortedReports.length - 1].created_at);
    const dateRangeStr =
      firstDate === lastDate ? firstDate : `${firstDate} ~ ${lastDate}`;

    const formattedReports = sortedReports
      .map((r) => {
        const dateKey = formatDateKey(r.created_at);
        return `[보고 일자: ${dateKey}]\n${r.content?.trim()}`;
      })
      .join("\n\n---\n\n");

    const prompt = `
### Role
너는 사내 팀원의 최근 5일치 일일 업무 보고서를 종합 분석하여, 핵심 진행 상황과 주요 성과를 체계적으로 요약해주는 전문 AI 업무 비서이다.
반드시 한국어로 명확하고 전문적인 비즈니스 톤으로 답변해라.

### Guidelines
1. 아래 제공된 [${trimmedUsername} 팀원의 최근 보고 내역]에 근거하여, 핵심 업무를 마크다운(Markdown) 서식으로 구조화하여 요약해라.
2. 최상단 첫 줄에 요약 대상 기간을 명시해라.
   - 형식: 📅 **취합 기간**: ${dateRangeStr} (총 ${sortedReports.length}일치 보고)
3. 대분류는 마크다운 소제목(H3: '### [항목명]')으로 구분해라:
   - '### [주요 완료 업무]': 5일 동안 완료된 핵심 작업들을 마크다운 체크리스트('- [x]')로 요약 정리
   - '### [진행 중 및 연속 업무]': 계속 진행 중이거나 협의 중인 작업을 글머리 기호('-') 또는 '- [ ]'로 요약
   - '### [특이사항 및 이슈]': 발생했던 장애, 이슈, 지연 사항 (없다면 "특이사항 없음"으로 명시)
   - '### [향후 계획]': 보고서에 언급된 향후 예정 작업
4. 중요한 프로젝트명, 시스템 명칭, 수치, 고객사명은 '**텍스트**'로 강조해라.
5. 문장 끝은 간결하고 명확하게 비즈니스 명사형 종결(예: "~완료", "~진행 중", "~예정", "~협의")을 사용해라.
6. 원문에 없는 허위 사실을 지어내지 말고, 실제 보고된 내용에만 충실하게 요약해라.
7. 불필요한 인사말이나 서두(예: "네, 요약해 드립니다:", "아래는 요약 결과입니다")는 일절 쓰지 말고 오직 '마크다운 요약 본문'만 출력해라.

### [${trimmedUsername} 팀원의 최근 보고 내역]
${formattedReports}

### 마크다운 종합 요약:
`;

    // 2. Ollama 스트리밍 호출
    const ollamaResponse = await fetch(getAiApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getAiModel(),
        prompt,
        stream: true,
        options: {
          num_ctx: 8192,
          num_predict: 800,
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

    // 3. Ollama ndjson 스트림을 실시간 텍스트 스트림으로 변환
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
                // 불완전한 json chunk 무시
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
    console.error("팀원 5일치 보고 요약 오류:", error);
    return NextResponse.json(
      { error: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
