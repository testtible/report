import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getAiApiUrl, getAiModel } from "@/app/lib/ai";
import { getDaysAgoKey, getTodayKey } from "@/app/lib/dates";

export const maxDuration = 60;

export async function POST() {
  try {
    const today = getTodayKey();
    const tenDaysAgo = getDaysAgoKey(14); // 최근 2주간 (영업일 약 10일)

    const [sy, sm, sd] = tenDaysAgo.split("-").map(Number);
    const [ey, em, ed] = today.split("-").map(Number);
    const startDateTime = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endDateTime = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    // 최근 보고서 수집
    const reports = await prisma.content.findMany({
      where: {
        created_at: {
          gte: startDateTime,
          lte: endDateTime,
        },
        content: { not: null },
      },
      orderBy: { created_at: "desc" },
      take: 25,
      select: { username: true, content: true, created_at: true },
    });

    const validReports = reports.filter(
      (r) => r.content && r.content.trim().length > 0,
    );

    if (validReports.length === 0) {
      return NextResponse.json(
        { error: "분석할 최근 보고서 데이터가 없습니다." },
        { status: 404 },
      );
    }

    // 컨텍스트 길이 조절 (AI 응답 지연 및 타임아웃 방지: 최대 15개, 4,000자)
    let totalLen = 0;
    const finalReports = [];
    for (const r of validReports) {
      const len = r.content?.trim().length || 0;
      if (totalLen + len > 4000 && finalReports.length >= 5) break;
      finalReports.push(r);
      totalLen += len;
    }

    const contextData = finalReports
      .map((r) => {
        const dateStr = r.created_at.toISOString().slice(0, 10);
        return `[작성자: ${r.username} | 일자: ${dateStr}]\n${r.content?.trim()}`;
      })
      .join("\n\n---\n\n");

    const prompt = `
### Role
너는 프로젝트 관리 전문가(PMP)이자 기술 리스크 분석가이다.
사내 업무 보고서를 정밀 분석하여 현재 발생 중이거나 향후 납기·품질에 영향을 줄 수 있는 **잠재적 위험(Risk), 기술적 난제(Blocker), 일정 지연(Delay), 협업 병목, 부품/자재 이슈**를 찾아내라.

### Guidelines
1. 반드시 아래 [보고서 데이터]에 실제 기록된 사실에만 근거해라. 없는 사실을 지어내지 마라.
2. 경미한 일상 업무는 제외하고, **지연 위험, 기술적 문제/불량, 외부 협의 필요, 자재 미확보, 미결정 사항** 등 실제 관심이 필요한 항목 위주로 3~6개 도출해라.
3. 각 리스크마다 심각도를 아래 3단계 중 하나로 분류해라:
   - "CRITICAL": 납기 지연, 핵심 기능 불량, 3일 이상 미해결, 프로젝트 중단 위험
   - "WARNING": 부품 수급 대기, 협업 일정 지연 가능성, 대책 마련 중인 이슈
   - "INFO": 단순 일정 변동 가능성, 추적 관찰이 필요한 특이사항
4. 반드시 아래 JSON 형식으로만 응답해라. 마크다운 따옴표나 기타 설명 없이 유효한 JSON만 출력해라.

### JSON Output Format
{
  "analyzedDateRange": "${tenDaysAgo} ~ ${today}",
  "totalReports": ${finalReports.length},
  "summary": "전체 리스크 현황에 대한 1~2문장 총평",
  "risks": [
    {
      "level": "CRITICAL",
      "title": "리스크 핵심 요약",
      "project": "관련 프로젝트명",
      "member": "관련 팀원 이름",
      "date": "보고 일자 (YYYY-MM-DD)",
      "description": "문제 상황 및 원인에 대한 구체적 설명",
      "actionPlan": "팀장/관리자가 즉시 취해야 할 권장 조치 가이드라인"
    }
  ]
}

### 보고서 데이터
${contextData}
`;

    const ollamaResponse = await fetch(getAiApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getAiModel(),
        prompt,
        stream: true,
        options: {
          num_ctx: 8192,
          num_predict: 1200,
          temperature: 0.2,
        },
      }),
    });

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      const errText = await ollamaResponse.text().catch(() => "");
      console.error("Risk radar Ollama error status:", ollamaResponse.status, errText);
      return NextResponse.json(
        { error: `AI 서버 응답에 실패했습니다. (${ollamaResponse.status})` },
        { status: 500 },
      );
    }

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();
    let rawText = "";
    let buffer = "";

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
            rawText += parsed.response;
          }
          if (parsed.done) {
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    // JSON 블록 파싱 (```json ... ``` 형태나 순수 JSON 처리)
    let jsonStr = rawText.trim();
    if (jsonStr.includes("```json")) {
      jsonStr = jsonStr.split("```json")[1].split("```")[0].trim();
    } else if (jsonStr.includes("```")) {
      jsonStr = jsonStr.split("```")[1].split("```")[0].trim();
    }

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return NextResponse.json({
        ok: true,
        data: parsed,
      });
    } catch {
      // JSON 파싱 실패 시 원문 텍스트라도 반환
      return NextResponse.json({
        ok: true,
        data: {
          analyzedDateRange: `${tenDaysAgo} ~ ${today}`,
          totalReports: validReports.length,
          summary: "최근 보고서 분석 결과입니다.",
          rawText: rawText,
          risks: [],
        },
      });
    }
  } catch (error) {
    console.error("Risk Radar API error:", error);
    return NextResponse.json(
      {
        error: `리스크 분석 중 오류가 발생했습니다: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 },
    );
  }
}
