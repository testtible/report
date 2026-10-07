import { useState } from "react";

type PrefetchStatus = {
  data: unknown;
  error: unknown;
  isLoading: boolean;
};

export function useAiModals(prefetch: {
  projectSummary: PrefetchStatus;
  riskRadar: PrefetchStatus;
  workload: PrefetchStatus;
}) {
  const [aiChatModalOpen, setAiChatModalOpen] = useState(false);
  const [projectSummaryModalOpen, setProjectSummaryModalOpen] = useState(false);
  const [memberSummaryModalOpen, setMemberSummaryModalOpen] = useState(false);
  const [riskRadarModalOpen, setRiskRadarModalOpen] = useState(false);
  const [workloadModalOpen, setWorkloadModalOpen] = useState(false);
  const [pendingNoticeModalOpen, setPendingNoticeModalOpen] = useState(false);
  const [pendingNoticeMessage, setPendingNoticeMessage] = useState("");

  const showPendingNotice = (message: string) => {
    setPendingNoticeMessage(message);
    setPendingNoticeModalOpen(true);
  };

  const openProjectSummary = (hasSubmittedReports: boolean) => {
    if (!hasSubmittedReports) return;
    if (prefetch.projectSummary.data || prefetch.projectSummary.error) {
      setProjectSummaryModalOpen(true);
      return;
    }
    showPendingNotice("AI가 분석을 진행 중입니다. 잠시만 기다려주세요.");
  };

  const openRiskRadar = () => {
    if (prefetch.riskRadar.data || prefetch.riskRadar.error) {
      setRiskRadarModalOpen(true);
      return;
    }
    showPendingNotice("AI가 분석을 진행 중입니다. 잠시만 기다려주세요.");
  };

  const openWorkload = () => {
    if (prefetch.workload.data || prefetch.workload.error) {
      setWorkloadModalOpen(true);
      return;
    }
    showPendingNotice("AI가 분석을 진행 중입니다. 잠시만 기다려주세요.");
  };

  return {
    state: {
      aiChatModalOpen,
      projectSummaryModalOpen,
      memberSummaryModalOpen,
      riskRadarModalOpen,
      workloadModalOpen,
      pendingNoticeModalOpen,
      pendingNoticeMessage,
    },
    actions: {
      setAiChatModalOpen,
      setProjectSummaryModalOpen,
      setMemberSummaryModalOpen,
      setRiskRadarModalOpen,
      setWorkloadModalOpen,
      setPendingNoticeModalOpen,
      openProjectSummary,
      openRiskRadar,
      openWorkload,
    },
  };
}
