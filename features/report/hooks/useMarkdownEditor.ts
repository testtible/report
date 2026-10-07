import { useRef, useState } from "react";
import {
  calculateMarkdownInsert,
  DEFAULT_REPORT_TEMPLATE,
} from "@/utils/markdownUtils";

export function useMarkdownEditor(
  content: string,
  setContent: (value: string | ((prev: string) => string)) => void,
  hasSelectedMember: boolean,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const insertFormat = (prefix: string, suffix: string = "") => {
    if (!hasSelectedMember) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { nextText, nextCursorPos } = calculateMarkdownInsert(
      content,
      { start: textarea.selectionStart, end: textarea.selectionEnd },
      prefix,
      suffix,
    );

    setContent(nextText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursorPos, nextCursorPos);
    }, 0);
  };

  const insertTemplate = () => {
    if (!hasSelectedMember) return;

    if (content.trim()) {
      const confirmAdd = window.confirm(
        "기존 작성 내용 아래에 일일 보고서 추천 양식을 추가하시겠습니까?",
      );
      if (!confirmAdd) return;
      setContent((prev) => `${prev.trim()}\n\n${DEFAULT_REPORT_TEMPLATE}`);
    } else {
      setContent(DEFAULT_REPORT_TEMPLATE);
    }
    setActiveTab("write");
  };

  return {
    textareaRef,
    activeTab,
    setActiveTab,
    insertFormat,
    insertTemplate,
  };
}
