import { LEAVE_TYPES, type LeaveType } from "@/app/lib/members";

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 출장·휴가 지정 가능 범위: 이번 달 1일 ~ 다음 달 말일 */
export function getLeaveSelectableBounds(): { min: string; max: string } {
  const now = new Date();
  const min = new Date(now.getFullYear(), now.getMonth(), 1);
  const max = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return { min: toDateKey(min), max: toDateKey(max) };
}

export function isLeaveSelectableDate(dateKey: string): boolean {
  const { min, max } = getLeaveSelectableBounds();
  return dateKey >= min && dateKey <= max;
}

/** 이번 달·다음 달의 (year, month) 목록 */
export function getLeaveCalendarMonths(): { year: number; month: number }[] {
  const now = new Date();
  const thisMonth = { year: now.getFullYear(), month: now.getMonth() };
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return [
    thisMonth,
    { year: next.getFullYear(), month: next.getMonth() },
  ];
}

/** start ~ end 사이 모든 날짜 (YYYY-MM-DD) */
export function expandDateRange(startKey: string, endKey: string): string[] {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const [from, to] = start <= end ? [start, end] : [end, start];
  const keys: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/** MM-DD 형식 */
function toShortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${m}-${d}`;
}

/** 연속 날짜를 범위 문자열로 (예: 06-05 ~ 07, 06-09) */
export function formatConsecutiveRanges(dateKeys: string[]): string {
  if (dateKeys.length === 0) return "";

  const sorted = [...dateKeys].sort();
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  const flush = () => {
    const [sy, sm, sd] = rangeStart.split("-").map(Number);
    const [, em, ed] = rangeEnd.split("-").map(Number);
    const startFmt = `${String(sm).padStart(2, "0")}-${String(sd).padStart(2, "0")}`;
    if (rangeStart === rangeEnd) {
      ranges.push(startFmt);
    } else if (sy === Number(rangeEnd.split("-")[0]) && sm === em) {
      ranges.push(`${startFmt} ~ ${String(ed).padStart(2, "0")}`);
    } else {
      ranges.push(`${startFmt} ~ ${toShortDate(rangeEnd)}`);
    }
  };

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(rangeEnd);
    prev.setDate(prev.getDate() + 1);
    if (sorted[i] === toDateKey(prev)) {
      rangeEnd = sorted[i];
    } else {
      flush();
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }
  flush();
  return ranges.join(", ");
}

/** 다음 주 월~금 범위 */
export function getNextWeekRange(): { start: Date; end: Date } {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(d);
  monday.setDate(monday.getDate() + daysUntilNextMonday);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { start: monday, end: friday };
}

export type UpcomingLeaveInfo = {
  tripRanges: string;
  vacationRanges: string;
};

export function formatUpcomingLeaveText(info: UpcomingLeaveInfo): string | null {
  const parts: string[] = [];
  if (info.tripRanges) parts.push(`출장(${info.tripRanges})`);
  if (info.vacationRanges) parts.push(`휴가(${info.vacationRanges})`);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** DB 조회 결과 → 멤버별 출장·휴가 범위 텍스트 (출장(06-16) 휴가(06-20) 형식) */
export function buildUpcomingLeaveByMember(
  reports: { username: string; created_at: Date; content: string | null }[],
): Record<string, string | null> {
  const byMember: Record<string, { trip: string[]; vacation: string[] }> = {};

  for (const r of reports) {
    const content = r.content?.trim();
    if (content !== LEAVE_TYPES.TRIP && content !== LEAVE_TYPES.VACATION) {
      continue;
    }
    if (!byMember[r.username]) {
      byMember[r.username] = { trip: [], vacation: [] };
    }
    const key = toDateKey(r.created_at);
    if (content === LEAVE_TYPES.TRIP) {
      byMember[r.username].trip.push(key);
    } else {
      byMember[r.username].vacation.push(key);
    }
  }

  const result: Record<string, string | null> = {};
  for (const [username, data] of Object.entries(byMember)) {
    result[username] = formatUpcomingLeaveText({
      tripRanges: formatConsecutiveRanges(data.trip),
      vacationRanges: formatConsecutiveRanges(data.vacation),
    });
  }
  return result;
}

export function getLeaveTypeColor(type: LeaveType): {
  bg: string;
  text: string;
} {
  if (type === LEAVE_TYPES.TRIP) {
    return { bg: "bg-sky-100", text: "text-sky-800" };
  }
  return { bg: "bg-violet-100", text: "text-violet-800" };
}

export type LeaveEntry = { date: string; type: LeaveType };

/** 연속된 동일 유형 출장·휴가를 범위 단위로 묶기 */
export function groupLeavesIntoRanges(
  leaves: LeaveEntry[],
): { type: LeaveType; startDate: string; endDate: string }[] {
  if (leaves.length === 0) return [];

  const sorted = [...leaves].sort((a, b) => a.date.localeCompare(b.date));
  const groups: { type: LeaveType; startDate: string; endDate: string }[] = [];
  let currentType = sorted[0].type;
  let rangeStart = sorted[0].date;
  let rangeEnd = sorted[0].date;

  const flush = () => {
    groups.push({ type: currentType, startDate: rangeStart, endDate: rangeEnd });
  };

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(rangeEnd);
    prev.setDate(prev.getDate() + 1);
    const isConsecutive = sorted[i].date === toDateKey(prev);
    if (sorted[i].type === currentType && isConsecutive) {
      rangeEnd = sorted[i].date;
    } else {
      flush();
      currentType = sorted[i].type;
      rangeStart = sorted[i].date;
      rangeEnd = sorted[i].date;
    }
  }
  flush();
  return groups;
}
