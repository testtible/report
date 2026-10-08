"use client";

import { useMemo } from "react";
import type {
  DepartmentItem,
  DivisionItem,
  TeamItem,
  UserOrgItem,
} from "@/features/report/types/report.types";
import type { MemberReport } from "@/app/lib/attachments";
import { isLeaveContent } from "@/app/lib/members";
import { formatOrgBreadcrumb } from "@/app/lib/organizationUtils";

type Props = {
  team: TeamItem;
  users: UserOrgItem[];
  departments?: DepartmentItem[];
  divisions?: DivisionItem[];
  reportsByMember: Record<string, MemberReport>;
  onChangeTeamClick: () => void;
};

export default function TeamCurrentBar({
  team,
  users,
  departments = [],
  divisions = [],
  reportsByMember,
  onChangeTeamClick,
}: Props) {
  const teamIdNum = Number(team.id);
  const teamUsers = useMemo(
    () => users.filter((u) => u.teamId === teamIdNum),
    [users, teamIdNum],
  );

  const dept = useMemo(
    () => departments.find((d) => Number(d.id) === team.departmentId),
    [departments, team.departmentId],
  );

  const div = useMemo(
    () => (dept ? divisions.find((dv) => Number(dv.id) === dept.divisionId) : undefined),
    [divisions, dept],
  );

  // 중복 제거된 빵부스러기 경로
  const breadcrumb = useMemo(
    () => formatOrgBreadcrumb(div?.name, dept?.name, team.name),
    [div?.name, dept?.name, team.name],
  );

  const { submittedCount, leaveCount, unsubmittedUsernames } = useMemo(() => {
    let sub = 0;
    let leave = 0;
    const unsubmitted: string[] = [];

    teamUsers.forEach((u) => {
      const rep = reportsByMember[u.name];
      if (rep && rep.content.trim()) {
        if (isLeaveContent(rep.content.trim())) {
          leave++;
        } else {
          sub++;
        }
      } else {
        unsubmitted.push(u.name);
      }
    });

    return {
      submittedCount: sub,
      leaveCount: leave,
      unsubmittedUsernames: unsubmitted,
    };
  }, [teamUsers, reportsByMember]);

  const totalCount = teamUsers.length;
  const rate =
    totalCount > 0
      ? Math.round(((submittedCount + leaveCount) / totalCount) * 100)
      : 0;

  return (
    <div className="space-y-2">
      {/* 1. 현재 선택된 팀 정보 카드 & 팀 변경 액션 버튼 */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/30 to-blue-50/50 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-2xs">
            👥
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-extrabold text-gray-900 tracking-tight">
                {team.name}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                선택된 팀
              </span>
            </div>
            <p className="text-xs text-indigo-900/80 font-medium truncate mt-0.5">
              🏢 {breadcrumb}
            </p>
          </div>
        </div>

        {/* 통계 뱃지 + 팀 변경 버튼 */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 shadow-2xs">
            <span>총원</span>
            <span className="font-bold text-gray-900">{totalCount}명</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>제출</span>
            <span className="font-bold text-emerald-700">
              {submittedCount}명
            </span>
          </span>

          {leaveCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 border border-sky-200 text-sky-800 shadow-2xs">
              <span>휴가</span>
              <span className="font-bold text-sky-700">{leaveCount}명</span>
            </span>
          )}

          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800">
            {rate}%
          </span>

          {/* 팀 변경 버튼 */}
          <button
            type="button"
            onClick={onChangeTeamClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="다른 팀으로 변경하기 위해 팀 목록 화면으로 돌아갑니다"
          >
            <span>⇄</span>
            <span>팀 변경</span>
          </button>
        </div>
      </div>

      {/* 2. 미제출 인원 알림 배너 (있을 때만 표시) */}
      {unsubmittedUsernames.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2 text-xs flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-rose-900 font-medium">
            <span className="text-rose-600 font-bold">⚠️ 미제출 인원:</span>
            <span className="font-bold text-rose-950">
              {unsubmittedUsernames.join(", ")}
            </span>
            <span className="text-[11px] text-rose-700">
              ({unsubmittedUsernames.length}명 작성 대기 중)
            </span>
          </div>
          <span className="text-[11px] text-rose-600 font-medium">
            작성 완료 시 현황에 실시간 반영됩니다
          </span>
        </div>
      )}
    </div>
  );
}
