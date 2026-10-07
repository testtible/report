import { useState } from "react";
import { saveMasterCommentApi } from "@/features/read-report/services/readReportApiService";

export function useMasterComment() {
  const [commentOverrides, setCommentOverrides] = useState<Record<string, string>>({});
  const [editingCommentMember, setEditingCommentMember] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);

  const startEditComment = (username: string, initialComment: string) => {
    setEditingCommentMember(username);
    setCommentInput(initialComment);
  };

  const cancelEditComment = () => {
    setEditingCommentMember(null);
    setCommentInput("");
  };

  const saveComment = async (reportId: string, username: string) => {
    setIsSavingComment(true);
    try {
      await saveMasterCommentApi(reportId, commentInput);
      setCommentOverrides((prev) => ({
        ...prev,
        [username]: commentInput.trim(),
      }));
      setEditingCommentMember(null);
      setCommentInput("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.";
      alert(message);
    } finally {
      setIsSavingComment(false);
    }
  };

  const getEffectiveComment = (
    username: string,
    initialComment: string | null | undefined,
  ): string => {
    if (username in commentOverrides) {
      return commentOverrides[username];
    }
    return initialComment ?? "";
  };

  return {
    editingCommentMember,
    commentInput,
    isSavingComment,
    setCommentInput,
    startEditComment,
    cancelEditComment,
    saveComment,
    getEffectiveComment,
  };
}
