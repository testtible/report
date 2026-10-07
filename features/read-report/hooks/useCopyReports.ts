import { useState } from "react";
import {
  buildReportClipboardText,
  copyTextToClipboard,
  type ReportToCopy,
} from "@/utils/clipboardUtils";

export function useCopyReports(reports: ReportToCopy[]) {
  const [isCopied, setIsCopied] = useState(false);

  const copyAllReports = async () => {
    if (reports.length === 0) {
      alert("복사할 제출 내역이 없습니다.");
      return;
    }

    const textToCopy = buildReportClipboardText(reports);
    const success = await copyTextToClipboard(textToCopy);

    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      alert("복사에 실패했습니다.");
    }
  };

  return {
    isCopied,
    copyAllReports,
  };
}
