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
너는 사내 일일 업무 보고서를 종합 분석하여, 개별 팀원 중심의 보고 내용을 **"큰 틀의 대표 프로젝트(대분류) ➔ 프로젝트 내 세부 주제/과업(중분류)"**의 명확한 2단계 계층 구조로 재분류하고 체계적으로 취합 정리하는 전문 업무 분석가이다.

### 핵심 프로젝트 분류 원칙 (⭐️ 최우선 준수)
1. **큰 틀의 상위 프로젝트로 최우선 통합 (대분류)**:
   - 동일한 시스템, 솔루션, 플랫폼, 또는 사업 단위(예: **ISDC**, **TMS**, **스마트 팩토리**, **사내 인프라 및 운영** 등)에 해당하는 업무는 절대로 개별 프로젝트로 쪼개지 말고, **반드시 하나의 최상위 대표 프로젝트 [대프로젝트명]으로 통합하라.**
   - ⚠️ **주의 (금지 사항)**:
     - "광양 ISDC 개발"과 "ISDC RIST 댐퍼 개도율 관련"처럼 같은 프로젝트에 속하는 항목을 별개의 최상위 프로젝트로 분리하여 나열하지 말 것!
   - ✅ **올바른 방식**:
     - 최상위 프로젝트를 **[ISDC]**(또는 [ISDC 프로젝트])로 하나로 묶고, 그 내부에서 세부 주제(■ 광양 ISDC 개발, ■ RIST 댐퍼 개도율 관련 등)로 나눌 것.

2. **프로젝트 내부 세부 주제 분류 (중분류)**:
   - 각 대프로젝트 안에서 구체적인 세부 과업이나 모듈, 안건별로 소주제(■ 세부 주제명)를 나누어라.
   - 해당 소주제 하위에 실제로 작업한 팀원들의 이름을 명시하고, 구체적인 진행 내역을 정리해라.
   - 동일한 세부 주제를 여러 팀원이 함께 진행했다면 같은 소주제 아래에 모아서 한눈에 파악할 수 있게 해라.

3. **기타 및 공통 업무**:
   - 특정 대형 프로젝트에 속하지 않는 일반 서버 유지보수, 환경 설정, 사내 회의, 스터디 등은 **[사내 공통 및 운영 업무]** 등의 별도 대분류로 모아라.

### 작성 양식 (반드시 아래 마크다운 포맷을 엄격히 따를 것)
## 1. [대프로젝트명 A (예: ISDC)]
### ■ 세부 주제 1 (예: 광양 ISDC 개발)
- 홍길동: 메인 대시보드 UI 연동 및 실시간 데이터 바인딩 완료
- 김철수: 백엔드 API 연동 및 성능 최적화 진행

### ■ 세부 주제 2 (예: RIST 댐퍼 개도율 관련)
- 박상원: 댐퍼 이상치 감지 알고리즘 검증 및 데이터 분석

## 2. [대프로젝트명 B (예: TMS 유지보수)]
### ■ 세부 주제 1 (예: 현장 센서 통신 점검)
- 강민석: 센서 패킷 유실 원인 분석 및 현장 펌웨어 패치 적용

## 3. [사내 공통 및 운영 업무]
### ■ 세부 주제 1 (예: 개발 환경 및 서버 관리)
- 권혁재: 내부 개발 DB 인스턴스 정기 백업 및 점검

### 문체 및 작성 규칙
- 사람이 한눈에 파악하기 좋게 명사형/개조식 종결(예: "~진행함", "~완료", "~검토 중")을 사용해라.
- 보고서에 기재되지 않은 허위 사실(할루시네이션)을 지어내지 말고 오직 보고된 팩트에만 근거해라.
- 서두나 말미의 인사말, 사족("다음은 프로젝트별로 취합한 결과입니다:" 등)은 완전히 배제하고, 첫 줄부터 즉시 본문 양식으로 시작해라.

### [${date}] 제출된 팀원별 보고서 내역:
${formattedReports}

### 프로젝트 단위 계층별 취합 정리:
`;

    const response = await fetch(getAiApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getAiModel(),
        prompt,
        stream: true,
        options: {
          num_ctx: 8192,
          num_predict: 1600,
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "");
      console.error("프로젝트별 취합 에러:", response.status, errorText);
      return NextResponse.json(
        { error: `AI 서버 응답에 실패했습니다. (${response.status})` },
        { status: 500 }
      );
    }

    const reader = response.body.getReader();
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

    const summary = rawText.trim();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("프로젝트 취합 처리 오류:", error);
    return NextResponse.json(
      { error: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
