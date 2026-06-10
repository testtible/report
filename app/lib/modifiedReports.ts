import {
  dateToKey,
  formatDateWithWeekday,
  getDateRange,
  getPastEditableDateKeys,
} from "@/app/lib/dates";
import { LEAVE_TYPES } from "@/app/lib/members";

const MODIFIED_THRESHOLD_MS = 60_000;

export type ModifiedReportItem = {
  username: string;
  reportDate: string;
  content: string;
  updatedAt: string;
};

export function buildModifiedReportList(
  reports: {
    username: string;
    created_at: Date;
    updated_at: Date;
    content: string | null;
  }[],
): ModifiedReportItem[] {
  const pastDateKeys = new Set(getPastEditableDateKeys());
  if (pastDateKeys.size === 0) return [];

  const items: ModifiedReportItem[] = [];

  for (const report of reports) {
    const reportDate = dateToKey(report.created_at);
    if (!pastDateKeys.has(reportDate)) continue;

    const content = report.content?.trim() ?? "";
    if (
      !content ||
      content === LEAVE_TYPES.TRIP ||
      content === LEAVE_TYPES.VACATION
    ) {
      continue;
    }

    const isModified =
      report.updated_at.getTime() - report.created_at.getTime() >
      MODIFIED_THRESHOLD_MS;
    if (!isModified) continue;

    items.push({
      username: report.username,
      reportDate,
      content,
      updatedAt: report.updated_at.toISOString(),
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getPastEditableDateRange(): { start: Date; end: Date } {
  const pastKeys = getPastEditableDateKeys();
  if (pastKeys.length === 0) {
    const today = getDateRange(dateToKey(new Date()));
    return { start: today.start, end: today.end };
  }
  const oldest = pastKeys[pastKeys.length - 1];
  const newest = pastKeys[0];
  return {
    start: getDateRange(oldest).start,
    end: getDateRange(newest).end,
  };
}

export function formatModifiedReportDate(reportDate: string): string {
  return formatDateWithWeekday(reportDate);
}
