/**
 * 보고서 로컬 임시 저장소(LocalStorage) 관리 유틸리티
 */

export type StoredDraft = {
  content: string;
  savedAt: string;
};

export function getDraftStorageKey(member: string, date: string): string {
  return `aerix_report_draft_${member}_${date}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function saveDraftToStorage(
  member: string,
  date: string,
  content: string,
): StoredDraft | null {
  if (typeof window === "undefined" || !member || !date) return null;
  const key = getDraftStorageKey(member, date);
  const draft: StoredDraft = {
    content,
    savedAt: getCurrentTimeString(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}

export function loadDraftFromStorage(
  member: string,
  date: string,
): StoredDraft | null {
  if (typeof window === "undefined" || !member || !date) return null;
  const key = getDraftStorageKey(member, date);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredDraft;
  } catch {
    return null;
  }
}

export function removeDraftFromStorage(member: string, date: string): void {
  if (typeof window === "undefined" || !member || !date) return;
  const key = getDraftStorageKey(member, date);
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시
  }
}
