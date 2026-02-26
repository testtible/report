import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { hashMemberHistoryAuth, hashReadReportAuth } from "@/app/lib/auth";

const MEMBER_HISTORY_COOKIE = "member_history_auth";
const READ_REPORT_COOKIE = "read_report_auth";
const AI_API_URL = "http://218.38.151.64:11434/api/generate";

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function refineReport(content: string): Promise<string> {
  try {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        prompt: `
        ### Role
        너는 한국어 전용 비즈니스 보고서 요약 전문가이다.
        반드시 한국어로만 답변하고, 영어는 절대 사용하지 마라.
        
        ### Task
        1. 날짜별로 응답하는 것이 아닌, 전체 내용을 요약해줘.
        2. 마크다운 기호(**, *, #, -)를 절대 사용하지 마라.
        3. 문장의 끝은 명사형으로 간결하게 끝내라.
        4. 중요도가 높은 순서대로 통합하여 정리해라.
        5. 날짜 정보가 있다면 문장 끝에 (2/13) 형태로 포함해라.
        6. 맨 앞에 날짜 범위를 적어줘. (예: [2026-02-17 ~ 2026-02-19])
        
        ### Content
        ${content}

        ### Response (Answer in Korean Only)
        결과:
        `,
        stream: false,
      }),
    });

    const data = (await response.json()) as { response?: string };

    return typeof data.response === "string" ? data.response : content;
  } catch (error) {
    console.error("AI 다듬기 오류:", error);
    return content;
  }
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username?.trim()) {
    return NextResponse.json(
      { error: "username이 필요합니다." },
      { status: 400 },
    );
  }

  const reports = await prisma.content.findMany({
    where: { username: username.trim() },
    orderBy: { created_at: "desc" },
    take: 5,
    select: { created_at: true, content: true },
  });

  if (reports.length === 0) {
    return NextResponse.json({
      raw: "",
      refined: "최근 보고 내역이 없습니다.",
    });
  }

  const rawContent = reports
    .map((r) => {
      const dateKey = formatDateKey(r.created_at);
      const text = r.content?.trim() ?? "(내용 없음)";
      return `[${dateKey}]\n${text}`;
    })
    .join("\n\n---\n\n");

  const refined = await refineReport(rawContent);

  return NextResponse.json({
    raw: rawContent,
    refined,
  });
}
