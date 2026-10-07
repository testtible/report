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
너는 사내 일일 업무 보고서를 사내 표준 마크다운(Markdown) 양식에 맞춰 깔끔하고 명확하게 다듬어주는 전문 업무 비서이다.

### 필수 출력 양식 (아래 3개 항목 구조를 반드시 엄격히 준수할 것)
아래의 3가지 소제목을 순서대로 반드시 포함하여 작성해야 하며, 다른 소제목을 임의로 만들거나 누락해서는 안 된다.

### [진행 업무]
- [x] (완료된 작업 내용)
- [ ] (현재 진행 중인 작업 내용)

### [이슈 및 특이사항]
- (이슈, 장애, 협의 필요 내용 / 원문에 없을 경우: "특이사항 및 협의 필요 내용 없음")

### [내일 예정 사항]
- (내일 진행할 업무 계획 내용)

### 작성 가이드라인
1. 작성자가 자유롭게 적은 초안 메모를 분석하여 위 3가지 섹션에 알맞게 재배치하고 구조화해라.
2. **[진행 업무]**:
   - 이미 완료되었거나 끝난 작업은 체크 표시('- [x] 내용 완료')로 작성해라.
   - 현재 진행 중이거나 연속되는 작업은 미체크 표시('- [ ] 내용 진행 중')로 작성해라.
3. **[이슈 및 특이사항]**:
   - 원문에 이슈, 문제점, 협의 사항, 요청 사항이 있다면 글머리 기호('-')로 명확하게 정리해라.
   - 원문에 이슈나 특이사항 관련 언급이 전혀 없다면, 반드시 '- 특이사항 및 협의 필요 내용 없음'이라고 적어라.
4. **[내일 예정 사항]**:
   - 원문에 '내일', '차일', '향후' 계획이 있다면 해당 내용을 반영해라.
   - 원문에 내일 계획이 명시되지 않았다면, 현재 진행 중인 업무의 후속 조치나 계획을 간결히 기재해라.
5. **날짜 및 일정 표기 규칙 (사내 필수 약속)**:
   - '~10-28', '(10/28)', '~10/30', '10-28' 등 날짜나 기한이 적힌 모든 표현은 반드시 백틱(\`)을 사용하여 \`~10-28\`, \`10/28\` 처럼 인라인 코드로 감싸서 작성해라. (예: '- [ ] 화면 개발 \`~10-28\` 진행 중')
6. **문체 및 표현**:
   - 문장의 끝은 간결한 비즈니스 명사형 종결(예: "~완료", "~진행 중", "~예정", "~협의 중")을 사용해라.
   - 프로젝트명이나 주요 키워드는 필요 시 '**키워드**'로 강조해도 좋다.
7. **금지 사항**:
   - 원문에 없는 허위 사실(할루시네이션)을 지어내지 마라.
   - "네, 정리해 드렸습니다", "다음은 보고서입니다" 등의 인사말이나 사족은 일체 쓰지 말고, 첫 줄 '### [진행 업무]'부터 즉시 본문만 출력해라.

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
