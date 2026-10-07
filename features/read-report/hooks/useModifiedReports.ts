import { useState } from "react";
import type { ModifiedReportItem } from "@/app/lib/modifiedReports";
import { confirmModificationApi } from "@/features/read-report/services/readReportApiService";

export function useModifiedReports(initialReports: ModifiedReportItem[]) {
  const [reports, setReports] = useState(initialReports);
  const [detailModalItem, setDetailModalItem] =
    useState<ModifiedReportItem | null>(null);

  const confirmModification = async (id: string) => {
    const ok = window.confirm(
      "이 보고서의 수정을 확인 완료 처리하시겠습니까?\n리스트에서 제외됩니다.",
    );
    if (!ok) return;

    try {
      await confirmModificationApi(id);
      setReports((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "처리에 실패했습니다.";
      alert(message);
    }
  };

  return {
    reports,
    detailModalItem,
    setDetailModalItem,
    confirmModification,
  };
}
