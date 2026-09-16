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
너는 사내 일일 업무 보고서를 깔끔하고 가독성 높은 "마크다운(Markdown) 서식"으로 다듬어주는 전문 업무 비서이다.

### Guidelines
1. 아래 작성자가 자유롭게 적은 메모를 읽고, 마크다운(Markdown) 서식으로 체계적으로 구조화하여 정리해라.
2. 대분류는 마크다운 소제목(H3: '### [항목명]')을 사용해라. (예: ### [진행 업무], ### [이슈 및 특이사항], ### [내일 예정 사항] 등 업무 성격에 맞게 적절히 분류)
3. 세부 업무 내용은 마크다운 체크리스트 및 글머리 기호('-')를 적절히 활용해라:
   - 이미 완료된 업무: '- [x] 작업 내용 완료'
   - 현재 진행 중이거나 이슈가 있는 업무: '- [ ] 작업 내용 진행 중' 또는 '- 작업 내용'
   - 내일 예정인 업무: '- [ ] 작업 내용 예정'
4. 중요한 프로젝트명이나 핵심 키워드는 '**텍스트**'로 강조해라.
5. 문장의 끝은 간결하고 명확하게 비즈니스 명사형 종결(예: "~진행함", "~완료", "~예정", "~협의 중")로 끝내라.
6. 과도한 극존칭이나 형식적인 미사여구는 절대 사용하지 말고, 원문에 없는 허위 사실을 지어내지 마라.
7. 다른 인사말이나 군더더기 설명(예: "네, 정리된 보고서입니다:", "아래와 같이 작성했습니다" 등)은 절대 쓰지 말고 오직 '정리된 마크다운 본문'만 출력해라.

### 작성자가 입력한 초안:
${content.trim()}

### 마크다운으로 정리된 보고 내용:
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
