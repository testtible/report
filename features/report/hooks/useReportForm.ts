import { useEffect, useMemo, useRef, useState } from "react";
import {
  getDefaultEditableDate,
  getEditableDateKeys,
  isValidDateKey,
} from "@/app/lib/dates";
import { validateAttachmentFile } from "@/app/lib/attachments";
import { MEMBERS } from "@/app/lib/members";
import {
  confirmMasterCommentApi,
  fetchMemberReport,
  fetchUsersApi,
  postMemberReport,
} from "@/features/report/services/reportApiService";
import { useReportDraft } from "@/features/report/hooks/useReportDraft";
import { useMarkdownEditor } from "@/features/report/hooks/useMarkdownEditor";
import { useAiRefine } from "@/features/report/hooks/useAiRefine";
import type {
  PreviousReport,
  UserItem,
} from "@/features/report/types/report.types";

export function useReportForm() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedDate, setSelectedDate] = useState(getDefaultEditableDate);
  const [reportContent, setReportContent] = useState("");
  const [isExistingReport, setIsExistingReport] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 제어 상태
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [aiChatModalOpen, setAiChatModalOpen] = useState(false);

  // 첨부파일 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<
    string | null
  >(null);
  const [existingAttachmentSize, setExistingAttachmentSize] = useState<
    number | null
  >(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 직전 보고서, 마스터 코멘트 & 확인 상태
  const [reportId, setReportId] = useState<string | null>(null);
  const [previousReportData, setPreviousReportData] =
    useState<PreviousReport | null>(null);
  const [masterComment, setMasterComment] = useState<string | null>(null);
  const [isConfirmMasterComment, setIsConfirmMasterComment] = useState(false);
  const [isConfirmingMasterComment, setIsConfirmingMasterComment] =
    useState(false);

  const editableDates = getEditableDateKeys();

  // 사용자 목록 불러오기 (DB user 테이블 연동)
  useEffect(() => {
    let cancelled = false;
    fetchUsersApi()
      .then((data) => {
        if (!cancelled && data && data.length > 0) {
          setUsers(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const memberList = useMemo(() => {
    return users.length > 0 ? users.map((u) => u.name) : [...MEMBERS];
  }, [users]);

  // 하위 전문 훅들
  const draft = useReportDraft(
    selectedMember,
    selectedDate,
    reportContent,
    isLoadingContent,
  );
  const editor = useMarkdownEditor(
    reportContent,
    setReportContent,
    !!selectedMember,
  );
  const aiRefine = useAiRefine(
    reportContent,
    setReportContent,
    !!selectedMember,
  );

  const resetAttachmentState = () => {
    setSelectedFile(null);
    setExistingAttachmentName(null);
    setExistingAttachmentSize(null);
    setRemoveAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 팀원 및 날짜 변경 시 보고서 로드
  useEffect(() => {
    if (!selectedMember) {
      setReportContent("");
      setIsExistingReport(false);
      setReportId(null);
      setPreviousReportData(null);
      setMasterComment(null);
      setIsConfirmMasterComment(false);
      draft.resetDraftState();
      aiRefine.resetRefineState();
      resetAttachmentState();
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoadingContent(true);
      try {
        const data = await fetchMemberReport(selectedMember, selectedDate);
        if (cancelled) return;

        const serverContent = data.content ?? "";
        setIsExistingReport(!!data.exists);
        setReportId(data.reportId ?? null);
        resetAttachmentState();
        setExistingAttachmentName(data.attachmentName ?? null);
        setExistingAttachmentSize(data.attachmentSize ?? null);
        setPreviousReportData(data.previousReport ?? null);
        setMasterComment(data.masterComment ?? null);
        setIsConfirmMasterComment(!!data.isConfirmMasterComment);

        // 로컬 임시 저장본 확인
        const localDraft = draft.checkLocalDraft(serverContent);

        // 새 보고서 작성 시 직전 보고 내용 불러오기 안내
        if (!data.exists) {
          if (localDraft && localDraft.content.trim()) {
            setReportContent(serverContent);
          } else if (data.previousReport && data.previousReport.content) {
            const shouldLoad = window.confirm(
              `'${selectedMember}' 님의 직전 보고 내용(${data.previousReport.date})을 불러와서 작성을 시작하시겠습니까?`,
            );
            if (shouldLoad) {
              setReportContent(data.previousReport.content);
            } else {
              setReportContent(serverContent);
            }
          } else {
            setReportContent(serverContent);
          }
        } else {
          setReportContent(serverContent);
        }
      } catch {
        if (!cancelled) {
          setReportContent("");
          setIsExistingReport(false);
          setReportId(null);
          setMasterComment(null);
          setIsConfirmMasterComment(false);
          resetAttachmentState();
        }
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedMember, selectedDate]);

  // 첨부파일 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateAttachmentFile(file);
    if (error) {
      alert(error);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setRemoveAttachment(false);
  };

  const handleRemoveNewFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert("팀원을 선택해주세요.");
      return;
    }
    if (!reportContent.trim()) {
      alert("보고 내용을 입력해주세요.");
      return;
    }

    if (selectedFile) {
      const fileError = validateAttachmentFile(selectedFile);
      if (fileError) {
        alert(fileError);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("username", selectedMember);
      formData.append("content", reportContent.trim());
      formData.append("date", selectedDate);
      if (selectedFile) formData.append("file", selectedFile);
      if (removeAttachment) formData.append("removeAttachment", "true");

      // 사용자 ID 매핑
      const selectedUser = users.find((u) => u.name === selectedMember);
      if (selectedUser) {
        formData.append("userId", selectedUser.id);
      }

      const data = await postMemberReport(formData);

      alert(
        data.updated ? "보고서가 수정되었습니다." : "보고서가 제출되었습니다.",
      );

      draft.clearDraft();
      setIsExistingReport(true);
      if (data.id) {
        setReportId(data.id);
      }
      if (selectedFile) {
        setExistingAttachmentName(selectedFile.name);
        setExistingAttachmentSize(selectedFile.size);
      } else if (removeAttachment) {
        setExistingAttachmentName(null);
        setExistingAttachmentSize(null);
      }
      setSelectedFile(null);
      setRemoveAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "제출에 실패했습니다.";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 마스터 코멘트 확인 완료 처리
  const handleConfirmMasterComment = async () => {
    if (!reportId) return;
    setIsConfirmingMasterComment(true);
    try {
      await confirmMasterCommentApi(reportId);
      setIsConfirmMasterComment(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "코멘트 확인 처리에 실패했습니다.";
      alert(message);
    } finally {
      setIsConfirmingMasterComment(false);
    }
  };

  // 임시 저장본 복원
  const handleRestoreDraft = () => {
    if (!draft.draftBackup) return;
    setReportContent(draft.draftBackup.content);
    draft.resetDraftState();
  };

  const handleDiscardDraft = () => {
    draft.clearDraft();
  };

  return {
    state: {
      users,
      memberList,
      selectedMember,
      selectedDate,
      reportContent,
      reportId,
      isExistingReport,
      isLoadingContent,
      isSubmitting,
      historyModalOpen,
      leaveModalOpen,
      aiChatModalOpen,
      selectedFile,
      existingAttachmentName,
      existingAttachmentSize,
      removeAttachment,
      previousReportData,
      masterComment,
      isConfirmMasterComment,
      isConfirmingMasterComment,
      editableDates,
      draftBackup: draft.draftBackup,
      lastSavedTime: draft.lastSavedTime,
      activeTab: editor.activeTab,
      isRefiningAi: aiRefine.isRefiningAi,
      hasPrevRefineContent: aiRefine.prevReportContent !== null,
    },
    refs: {
      fileInputRef,
      textareaRef: editor.textareaRef,
    },
    actions: {
      setSelectedMember,
      setSelectedDate,
      setReportContent,
      setHistoryModalOpen,
      setLeaveModalOpen,
      setAiChatModalOpen,
      setRemoveAttachment,
      handleFileChange,
      handleRemoveNewFile,
      handleSubmit,
      handleConfirmMasterComment,
      handleRestoreDraft,
      handleDiscardDraft,
      insertFormat: editor.insertFormat,
      insertTemplate: editor.insertTemplate,
      setActiveTab: editor.setActiveTab,
      refineWithAi: aiRefine.refineWithAi,
      undoRefine: aiRefine.undoRefine,
    },
  };
}
