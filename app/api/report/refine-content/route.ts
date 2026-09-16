import { NextRequest, NextResponse } from "next/server";
import { getAiApiUrl, getAiModel } from "@/app/lib/ai";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const content = body?.content;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "정리할 보고 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const prompt = `
### Role
너는 사내 일일 업무 보고서를 사람이 읽기 편하게 정리해 주는 AI 비서이다.

### Guidelines
1. 과도한 극존칭이나 형식적인 미사여구(예: "삼가 보고드립니다", "충실히 수행하였습니다" 등)는 절대 사용하지 마라.
2. 팀장님과 동료가 한눈에 쉽게 읽을 수 있도록 깔끔한 개조식(글머리 기호 '-' 사용)과 적절한 줄바꿈으로 정리해라.
3. 두서없이 적힌 메모라도 핵심 업무별(예: 주요 진행 업무, 협의/이슈 사항, 향후 계획 등)로 자연스럽게 묶어라.
4. 문장의 끝은 간결하고 명확하게 명사형 종결(예: "~진행함", "~완료", "~예정", "~협의 중")로 끝내라.
5. 원문에 없는 내용을 임의로 지어내지 말고, 작성자가 쓴 사실에만 기반해서 다듬어라.
6. 다른 인사말이나 군더더기 설명(예: "네, 정리된 보고서입니다:", "아래와 같이 작성했습니다" 등)은 절대 쓰지 말고 오직 '정리된 본문 텍스트'만 출력해라.

### 작성자가 입력한 초안:
${content.trim()}

### 사람이 읽기 편하게 정리된 보고 내용:
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
      const errText = await response.text().catch(() => "");
      console.error("AI 보고서 다듬기 에러:", errText);
      return NextResponse.json(
        { error: "AI 서버 응답에 실패했습니다." },
        { status: 500 }
      );
    }

    const data = (await response.json()) as { response?: string };
    const refined = data.response?.trim() || content;

    return NextResponse.json({ refined });
  } catch (error) {
    console.error("AI 다듬기 처리 오류:", error);
    return NextResponse.json(
      { error: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
