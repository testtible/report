import { useEffect, useState } from "react";
import {
  loadDraftFromStorage,
  removeDraftFromStorage,
  saveDraftToStorage,
  type StoredDraft,
} from "@/utils/draftStorage";

export function useReportDraft(
  member: string,
  date: string,
  content: string,
  isLoadingContent: boolean,
) {
  const [draftBackup, setDraftBackup] = useState<StoredDraft | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // 1초 디바운스로 로컬 스토리지에 자동 임시 저장
  useEffect(() => {
    if (!member || isLoadingContent) return;
    if (!content.trim()) return;

    const timer = setTimeout(() => {
      const saved = saveDraftToStorage(member, date, content);
      if (saved) {
        setLastSavedTime(saved.savedAt);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, member, date, isLoadingContent]);

  const checkLocalDraft = (serverContent: string) => {
    const local = loadDraftFromStorage(member, date);
    if (
      local &&
      local.content.trim() &&
      local.content.trim() !== serverContent.trim()
    ) {
      setDraftBackup(local);
      return local;
    } else {
      setDraftBackup(null);
      return null;
    }
  };

  const clearDraft = () => {
    removeDraftFromStorage(member, date);
    setDraftBackup(null);
    setLastSavedTime(null);
  };

  const resetDraftState = () => {
    setDraftBackup(null);
    setLastSavedTime(null);
  };

  return {
    draftBackup,
    lastSavedTime,
    checkLocalDraft,
    clearDraft,
    resetDraftState,
  };
}
