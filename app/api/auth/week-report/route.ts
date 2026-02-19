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

async function refineReport(
  content: string,
  username: string,
): Promise<string> {
  try {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:latest",
        prompt: `
        너는 대기업의 전문 비서이자 보고서 작성 전문가야.
        아래는 "${username}" 팀원의 최근 업무 내용들이다.
        
        [지시 사항]
        1. 날짜별로 응답하는 것이 아닌, 전체 내용을 요약해라.
        2. 마크다운 기호(**, *, #, -)를 절대 사용하지 마라.
        3. 문장은 명사형으로 간결하게 끝내라.
        4. 중요도가 높은 순서대로 통합하여 정리해라.
        5. 날짜 정보가 있다면 문장 끝에 (2/13) 형태로 포함해라.
        

        보고 내용: ${content}
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
    take: 7,
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

  const refined = await refineReport(rawContent, username.trim());

  return NextResponse.json({
    raw: rawContent,
    refined,
  });
}
