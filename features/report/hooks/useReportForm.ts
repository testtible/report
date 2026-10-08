import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  fetchUnreadMasterCommentsApi,
  fetchUrgentTasksApi,
  fetchUsersApi,
  postMemberReport,
  postUserCommentApi,
} from "@/features/report/services/reportApiService";
import { useReportDraft } from "@/features/report/hooks/useReportDraft";
import { useMarkdownEditor } from "@/features/report/hooks/useMarkdownEditor";
import { useAiRefine } from "@/features/report/hooks/useAiRefine";
import type { UrgentTaskItem } from "@/features/report/utils/deadlineParser";
import type {
  PreviousReport,
  UnreadMasterCommentItem,
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

  // 미확인 관리자 코멘트 팝업 상태 (팀원 선택 시)
  const [unreadMasterComments, setUnreadMasterComments] = useState<
    UnreadMasterCommentItem[]
  >([]);
  const [isUnreadModalOpen, setIsUnreadModalOpen] = useState(false);

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

  // 팀원 요청 코멘트 상태
  const [userComment, setUserComment] = useState<string | null>(null);
  const [isUserComment, setIsUserComment] = useState(false);

  // 스낵바 알림 상태
  const [snackbar, setSnackbar] = useState<{
    isOpen: boolean;
    message: string;
    type?: "success" | "info" | "warning" | "error";
    actionLabel?: string;
    onAction?: () => void;
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showSnackbar = useCallback(
    (
      message: string,
      type: "success" | "info" | "warning" | "error" = "success",
      actionLabel?: string,
      onAction?: () => void,
    ) => {
      setSnackbar({ isOpen: true, message, type, actionLabel, onAction });
    },
    [],
  );

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // 마감 임박 업무 상태 (D-3 이내)
  const [urgentTasks, setUrgentTasks] = useState<UrgentTaskItem[]>([]);
  const [isLoadingUrgentTasks, setIsLoadingUrgentTasks] = useState(false);
  const [urgentTasksError, setUrgentTasksError] = useState<string | null>(null);
  const urgentTaskRequestIdRef = useRef<number>(0);

  const loadUrgentTasks = useCallback(async (member: string, date: string) => {
    if (!member) {
      setUrgentTasks([]);
      setIsLoadingUrgentTasks(false);
      setUrgentTasksError(null);
      return;
    }

    const currentReqId = ++urgentTaskRequestIdRef.current;
    setIsLoadingUrgentTasks(true);
    setUrgentTasksError(null);
    setUrgentTasks([]); // 팀원 변경 즉시 이전 팀원의 목록 초기화

    try {
      const res = await fetchUrgentTasksApi(member, date);
      // 도중에 팀원이 다른 사람으로 바뀌었으면 이전 응답 무시
      if (urgentTaskRequestIdRef.current !== currentReqId) return;

      if (res.hasError) {
        setUrgentTasksError(res.errorMessage || "AI 분석에 실패했습니다.");
        setUrgentTasks([]);
      } else {
        setUrgentTasks(res.urgentTasks);
        setUrgentTasksError(null);
      }
    } catch (err) {
      if (urgentTaskRequestIdRef.current !== currentReqId) return;
      console.error("Failed to load urgent tasks:", err);
      setUrgentTasksError("마감 임박 업무 분석 중 오류가 발생했습니다.");
      setUrgentTasks([]);
    } finally {
      if (urgentTaskRequestIdRef.current === currentReqId) {
        setIsLoadingUrgentTasks(false);
      }
    }
  }, []);

  // 팀원 또는 날짜 변경 시 마감 임박 업무 로드
  useEffect(() => {
    if (selectedMember && selectedDate) {
      loadUrgentTasks(selectedMember, selectedDate);
    } else {
      setUrgentTasks([]);
      setIsLoadingUrgentTasks(false);
      setUrgentTasksError(null);
    }
  }, [selectedMember, selectedDate, loadUrgentTasks]);

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

  // 팀원 선택 시 최근 5일(주말 제외) 미확인 관리자 코멘트 확인
  useEffect(() => {
    if (!selectedMember) {
      setUnreadMasterComments([]);
      setIsUnreadModalOpen(false);
      return;
    }

    let cancelled = false;
    fetchUnreadMasterCommentsApi(selectedMember)
      .then((items) => {
        if (!cancelled && items && items.length > 0) {
          setUnreadMasterComments(items);
          setIsUnreadModalOpen(true);
        }
      })
      .catch((err) => {
        console.error("Failed to check unread master comments:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMember]);

  // 1분(60초)마다 팀장님의 새로운 피드백 코멘트 도착 여부 refetch 체크
  useEffect(() => {
    if (!selectedMember) return;

    const intervalId = setInterval(async () => {
      try {
        // 1. 최근 5일 미확인 관리자 코멘트 목록 refetch
        const latestUnread = await fetchUnreadMasterCommentsApi(selectedMember);
        setUnreadMasterComments((prev) => {
          const prevIds = new Set(prev.map((c) => c.id));
          const hasNewComment = latestUnread.some((c) => !prevIds.has(c.id));

          if (hasNewComment) {
            showSnackbar(
              "📢 팀장님의 새로운 피드백 코멘트가 도착했습니다!",
              "info",
              "확인하기 →",
              () => setIsUnreadModalOpen(true),
            );
            setIsUnreadModalOpen(true);
          }
          return latestUnread;
        });

        // 2. 현재 선택된 날짜의 보고서 코멘트 상태도 최신 동기화 (작성 중인 텍스트 내용은 유지)
        if (selectedDate) {
          const latestReport = await fetchMemberReport(
            selectedMember,
            selectedDate,
          );
          if (latestReport) {
            setMasterComment((prevMaster) => {
              if (
                latestReport.masterComment &&
                latestReport.masterComment !== prevMaster
              ) {
                showSnackbar(
                  "💬 팀장님이 현재 보고서에 새 피드백 코멘트를 남기셨습니다.",
                  "info",
                );
              }
              return latestReport.masterComment ?? null;
            });
            setIsConfirmMasterComment(!!latestReport.isConfirmMasterComment);
            setUserComment(latestReport.userComment ?? null);
            setIsUserComment(!!latestReport.isUserComment);
          }
        }
      } catch (err) {
        console.error("1분 주기 관리자 코멘트 refetch 오류:", err);
      }
    }, 60 * 1000); // 1분 (60,000ms)

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedMember, selectedDate, showSnackbar]);

  // 팀원 및 날짜 변경 시 보고서 로드
  useEffect(() => {
    if (!selectedMember) {
      setReportContent("");
      setIsExistingReport(false);
      setReportId(null);
      setPreviousReportData(null);
      setMasterComment(null);
      setIsConfirmMasterComment(false);
      setUserComment(null);
      setIsUserComment(false);
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
        setUserComment(data.userComment ?? null);
        setIsUserComment(!!data.isUserComment);

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
          setUserComment(null);
          setIsUserComment(false);
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
      if (userComment !== null) formData.append("userComment", userComment.trim());

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
      setIsUserComment(false);
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
      showSnackbar("팀장님의 피드백 코멘트를 확인 완료했습니다.", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "코멘트 확인 처리에 실패했습니다.";
      alert(message);
    } finally {
      setIsConfirmingMasterComment(false);
    }
  };

  // 팀원 요청 코멘트 저장
  const handleSaveUserComment = async (comment: string) => {
    const trimmed = comment.trim();
    if (reportId) {
      await postUserCommentApi(reportId, trimmed);
      // 팀원이 요청 코멘트를 남겼으면 팀장님의 피드백 코멘트를 확인한 것이므로 자동 확인 처리
      if (masterComment && !isConfirmMasterComment) {
        try {
          await confirmMasterCommentApi(reportId);
          setIsConfirmMasterComment(true);
        } catch (e) {
          console.error("Failed to auto confirm master comment:", e);
        }
      }
    }
    setUserComment(trimmed.length > 0 ? trimmed : null);
    setIsUserComment(false);
    if (trimmed.length > 0) {
      showSnackbar("팀장님께 요청 코멘트가 정상적으로 전송되었습니다.", "success");
    }
  };

  // 미확인 관리자 코멘트 모달 개별 확인 처리
  const handleConfirmUnreadMasterComment = async (commentId: string) => {
    await confirmMasterCommentApi(commentId);
    setUnreadMasterComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId);
      if (next.length === 0) {
        setIsUnreadModalOpen(false);
      }
      return next;
    });
    if (reportId === commentId) {
      setIsConfirmMasterComment(true);
    }
    showSnackbar("팀장님의 피드백 코멘트를 확인 완료했습니다.", "success");
  };

  // 미확인 관리자 코멘트 모달에서 팀장님께 요청 코멘트 답장 전송
  const handleReplyUserComment = async (
    commentId: string,
    replyText: string,
  ) => {
    // 1. 요청 코멘트 전송
    await postUserCommentApi(commentId, replyText);

    // 2. 팀장님의 피드백 코멘트 자동 확인 완료 처리
    try {
      await confirmMasterCommentApi(commentId);
    } catch (e) {
      console.error("Failed to auto confirm master comment:", e);
    }

    // 3. 미확인 관리자 코멘트 목록에서 제거 및 모달 창 자동 닫기
    setUnreadMasterComments((prev) => prev.filter((c) => c.id !== commentId));
    setIsUnreadModalOpen(false);

    // 4. 현재 선택된 보고서 상태 동기화
    if (reportId === commentId) {
      setUserComment(replyText);
      setIsUserComment(false);
      setIsConfirmMasterComment(true);
    }

    // 5. 스낵바 안내 UI 표시
    showSnackbar("팀장님께 요청 코멘트가 정상적으로 전송되었습니다.", "success");
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

  // 마감 임박 업무를 본문 체크리스트로 자동 삽입
  const handleInsertUrgentTask = useCallback(
    (task: UrgentTaskItem) => {
      const taskLine = `- [ ] ${task.taskTitle} (~${task.dueDate})`;
      setReportContent((prev) => {
        if (!prev || !prev.trim()) {
          return taskLine;
        }
        return `${prev.trimEnd()}\n${taskLine}`;
      });
      showSnackbar(`"${task.taskTitle}" 업무가 본문에 삽입되었습니다.`, "success");
    },
    [showSnackbar],
  );

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
      userComment,
      isUserComment,
      unreadMasterComments,
      isUnreadModalOpen,
      urgentTasks,
      isLoadingUrgentTasks,
      urgentTasksError,
      editableDates,
      draftBackup: draft.draftBackup,
      lastSavedTime: draft.lastSavedTime,
      activeTab: editor.activeTab,
      isRefiningAi: aiRefine.isRefiningAi,
      hasPrevRefineContent: aiRefine.prevReportContent !== null,
      snackbar,
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
      handleSaveUserComment,
      handleConfirmUnreadMasterComment,
      handleReplyUserComment,
      setIsUnreadModalOpen,
      handleRestoreDraft,
      handleDiscardDraft,
      handleInsertUrgentTask,
      loadUrgentTasks,
      insertFormat: editor.insertFormat,
      insertTemplate: editor.insertTemplate,
      setActiveTab: editor.setActiveTab,
      refineWithAi: aiRefine.refineWithAi,
      undoRefine: aiRefine.undoRefine,
      closeSnackbar,
      showSnackbar,
    },
  };
}
