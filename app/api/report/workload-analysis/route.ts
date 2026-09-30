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
      take: 30,
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
너는 사내 업무 분석 및 리소스 배분 전문가이다.
최근 일일 보고서들을 정밀 분석하여 팀 전체의 **프로젝트별 업무 비중(%)**과 **팀원별 주요 담당 프로젝트 및 공수 투입 현황**을 도출해라.

### Guidelines
1. 보고서에 등장하는 프로젝트/업무를 3~6개의 핵심 그룹으로 분류해라. (예: "에코프로비엠", "ISDC 시스템", "RIST 댐퍼 설치", "사내 인프라/Git 보안", "기타 연구개발/유지보수")
2. 전체 프로젝트 비중의 합은 반드시 100%가 되도록 정수 퍼센티지를 배분해라.
3. 각 팀원별로 어떤 프로젝트에 가장 많은 비중을 두고 있는지 분석해라.
4. 팀장을 위한 업무 부하 밸런스 및 리소스 인사이트(AI 총평)를 작성해라.
5. 반드시 아래 JSON 형식으로만 응답해라. 마크다운 따옴표나 기타 설명 없이 유효한 JSON만 출력해라.

### JSON Output Format
{
  "analyzedDateRange": "${tenDaysAgo} ~ ${today}",
  "totalReports": ${finalReports.length},
  "summary": "현재 팀의 리소스 배분 현황 요약 (1~2문장)",
  "projects": [
    {
      "name": "프로젝트/업무명",
      "percentage": 30,
      "color": "indigo",
      "description": "해당 프로젝트에서 수행 중인 주요 업무 요약",
      "members": ["참여 팀원1", "참여 팀원2"]
    }
  ],
  "memberWorkloads": [
    {
      "username": "팀원 이름",
      "primaryProject": "가장 집중하고 있는 프로젝트명 (비중 %)",
      "recentFocus": "최근 1~2주간 주력한 작업 내용 요약",
      "workloadStatus": "HIGH"
    }
  ],
  "teamInsights": "팀장 관점에서의 업무 분배 균형성, 특정 인력 과부하 여부, 협업 필요 포인트 조언"
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
      console.error("Workload analysis Ollama error status:", ollamaResponse.status, errText);
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
      return NextResponse.json({
        ok: true,
        data: {
          analyzedDateRange: `${tenDaysAgo} ~ ${today}`,
          totalReports: validReports.length,
          summary: "업무 비중 분석 결과입니다.",
          rawText: rawText,
          projects: [],
          memberWorkloads: [],
        },
      });
    }
  } catch (error) {
    console.error("Workload Analysis API error:", error);
    return NextResponse.json(
      {
        error: `업무 비중 분석 중 오류가 발생했습니다: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 },
    );
  }
}
