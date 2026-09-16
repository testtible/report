/**
 * 사내 AI (Ollama) 환경변수 및 공통 설정
 */
export function getAiApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_AI_URL ||
    process.env.AI_URL ||
    "http://localhost:11434/api/generate"
  );
}

export function getAiModel(): string {
  return (
    process.env.NEXT_PUBLIC_AI_MODEL ||
    process.env.AI_MODEL ||
    "qwen2.5:14b"
  );
}
