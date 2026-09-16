import { NextRequest, NextResponse } from "next/server";
import { getAiApiUrl, getAiModel } from "@/app/lib/ai";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const date = body?.date || "오늘";
    const reports: Array<{ username: string; content: string }> = body?.reports || [];

    const validReports = reports.filter(
      (r) => r && r.username && r.content && r.content.trim().length > 0
    );

    if (validReports.length === 0) {
      return NextResponse.json(
        { error: "취합할 제출 보고서가 없습니다." },
        { status: 400 }
      );
    }

    const formattedReports = validReports
      .map((r) => `[작성자: ${r.username}]\n${r.content.trim()}`)
      .join("\n\n---\n\n");

    const prompt = `
### Role
너는 사내 일일 업무 보고서를 종합 분석하여, 개별 팀원 중심의 보고서를 "프로젝트 및 업무 단위"로 재분류하고 체계적으로 취합 정리하는 전문 업무 비서이다.

### Guidelines
1. 아래 팀원들의 보고서 내용들을 면밀히 읽고, 공통으로 진행된 프로젝트 또는 업무 카테고리(예: [프로젝트 A], [프로젝트 B / 고객사 이슈], [인프라 및 서버 유지보수], [기타/공통 업무] 등)를 논리적으로 도출해라.
2. 각 프로젝트/카테고리별로 대괄호 제목(예: [프로젝트명/업무명])을 달고, 하위에 참여한 팀원별 세부 업무 내용을 명확히 정리해라.
   - 예시 형태:
     [프로젝트 A 명칭]
     - 홍길동: 결제 모듈 타임아웃 버그 수정 및 배포 완료
     - 김철수: 결제 연동 API 테스트 케이스 작성 및 검증 진행
3. 여러 팀원이 함께 협업하거나 같은 프로젝트를 진행한 경우, 한곳으로 모아 프로젝트의 전체 진행 현황을 파악하기 쉽게 해라.
4. 문장은 군더더기 없이 사람이 읽기 편하게 명사형 종결(예: "~진행함", "~완료", "~예정")을 사용해라.
5. 입력된 보고서 내용에 없는 허위 사실을 지어내지 말고, 실제 보고된 사실에만 근거해라.
6. 인사말이나 잡담("네, 프로젝트별로 취합해 드립니다:" 등)은 일절 쓰지 말고, 오직 프로젝트별 취합 본문만 작성해라.

### [${date}] 제출된 팀원별 보고서 내역:
${formattedReports}

### 프로젝트 단위 취합 정리:
`;

    const response = await fetch(getAiApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getAiModel(),
        prompt,
        stream: false,
        options: {
          num_ctx: 8192,
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("프로젝트별 취합 에러:", errorText);
      return NextResponse.json(
        { error: "AI 서버 응답에 실패했습니다." },
        { status: 500 }
      );
    }

    const data = (await response.json()) as { response?: string };
    const summary = data.response?.trim() || "";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("프로젝트 취합 처리 오류:", error);
    return NextResponse.json(
      { error: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
