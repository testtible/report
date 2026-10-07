import { useState } from "react";

export function useAiRefine(
  content: string,
  setContent: (value: string) => void,
  hasSelectedMember: boolean,
) {
  const [isRefiningAi, setIsRefiningAi] = useState(false);
  const [prevReportContent, setPrevReportContent] = useState<string | null>(
    null,
  );

  const refineWithAi = async () => {
    if (!hasSelectedMember) return;
    if (!content.trim()) {
      alert("정리할 보고 내용을 먼저 작성해주세요.");
      return;
    }

    setIsRefiningAi(true);
    try {
      const res = await fetch("/api/report/refine-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "AI 정리 요청에 실패했습니다.");
        return;
      }
      setPrevReportContent(content);
      setContent(data.refined);
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsRefiningAi(false);
    }
  };

  const undoRefine = () => {
    if (prevReportContent !== null) {
      setContent(prevReportContent);
      setPrevReportContent(null);
    }
  };

  const resetRefineState = () => {
    setPrevReportContent(null);
    setIsRefiningAi(false);
  };

  return {
    isRefiningAi,
    prevReportContent,
    refineWithAi,
    undoRefine,
    resetRefineState,
  };
}
