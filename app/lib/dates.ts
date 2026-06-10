/** 오늘 날짜를 YYYY-MM-DD (로컬) */
export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 주어진 YYYY-MM-DD의 00:00 ~ 23:59 (로컬) */
export function getDateRange(dateKey: string): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

export function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 주말 제외, 최근 평일 5일 (오늘이 평일이면 오늘 포함) */
export function getEditableDateKeys(): string[] {
  const keys: string[] = [];
  const d = new Date();
  while (keys.length < 5) {
    if (isWeekday(d)) {
      keys.push(toDateKey(d));
    }
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

/** 기본 선택 날짜 (오늘이 평일이면 오늘, 주말이면 가장 최근 평일) */
export function getDefaultEditableDate(): string {
  return getEditableDateKeys()[0];
}

/** 오늘 제외, 편집 가능한 과거 평일 4일 */
export function getPastEditableDateKeys(): string[] {
  return getEditableDateKeys().slice(1);
}

export function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isEditableDate(dateKey: string): boolean {
  return getEditableDateKeys().includes(dateKey);
}

/** 보고서 저장 시 사용할 created_at (과거 일자는 해당일 정오) */
export function dateKeyToCreatedAt(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (dateKey === getTodayKey()) {
    return new Date();
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const week = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  if (dateKey === getTodayKey() && isWeekday(date)) return `오늘 (${week})`;
  return `${m}/${d} (${week})`;
}

/** 제목 등에 표시할 날짜 + 요일 (예: 2026-06-10 (화)) */
export function formatDateWithWeekday(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const week = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} (${week})`;
}
