"use client";

import { useMemo, useState } from "react";
import type {
  DepartmentItem,
  DivisionItem,
  TeamItem,
  UserOrgItem,
} from "@/features/report/types/report.types";
import type { MemberReport } from "@/app/lib/attachments";
import { isLeaveContent } from "@/app/lib/members";
import { getDeduplicatedOrgPath } from "@/app/lib/organizationUtils";

type Props = {
  teams: TeamItem[];
  users: UserOrgItem[];
  departments?: DepartmentItem[];
  divisions?: DivisionItem[];
  reportsByMember: Record<string, MemberReport>;
  currentTeamId?: string;
  onSelectTeam: (teamId: string) => void;
  onCancelChange?: () => void;
};

// 팀별 아바타 색상 팔레트
const TEAM_GRADIENTS = [
  "from-indigo-600 to-purple-600",
  "from-blue-600 to-indigo-600",
  "from-teal-600 to-emerald-600",
  "from-purple-600 to-pink-600",
  "from-amber-600 to-orange-600",
  "from-rose-600 to-red-600",
  "from-cyan-600 to-blue-600",
];

function getTeamGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TEAM_GRADIENTS.length;
  return TEAM_GRADIENTS[index];
}

export default function TeamSelectionLanding({
  teams,
  users,
  departments = [],
  divisions = [],
  reportsByMember,
  currentTeamId,
  onSelectTeam,
  onCancelChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivisionFilter, setSelectedDivisionFilter] =
    useState<string>("ALL");

  // 각 팀별 상세 정보 및 통계 계산
  const teamItemsWithStats = useMemo(() => {
    return teams.map((team) => {
      const teamIdNum = Number(team.id);
      const teamUsers = users.filter((u) => u.teamId === teamIdNum);
      const dept = departments.find((d) => Number(d.id) === team.departmentId);
      const div = dept
        ? divisions.find((dv) => Number(dv.id) === dept.divisionId)
        : undefined;

      // 중복 제거된 소속 경로 (예: 구매본부 > 구매팀)
      const pathParts = getDeduplicatedOrgPath(
        div?.name,
        dept?.name,
        team.name,
      );
      const groupHeaderParts = getDeduplicatedOrgPath(div?.name, dept?.name);

      let submittedCount = 0;
      let leaveCount = 0;
      const unsubmittedUsernames: string[] = [];

      teamUsers.forEach((u) => {
        const rep = reportsByMember[u.name];
        if (rep && rep.content.trim()) {
          if (isLeaveContent(rep.content.trim())) {
            leaveCount++;
          } else {
            submittedCount++;
          }
        } else {
          unsubmittedUsernames.push(u.name);
        }
      });

      const totalCount = teamUsers.length;
      const rate =
        totalCount > 0
          ? Math.round(((submittedCount + leaveCount) / totalCount) * 100)
          : 0;

      return {
        team,
        teamId: String(team.id),
        teamName: team.name,
        departmentId: dept?.id,
        departmentName: dept?.name || "",
        divisionId: div?.id,
        divisionName: div?.name || "",
        pathParts,
        groupHeaderParts,
        groupKey: `${div?.name || "기타"}__${dept?.name || "부서"}`,
        breadcrumb: pathParts.join(" › "),
        users: teamUsers,
        totalCount,
        submittedCount,
        leaveCount,
        unsubmittedCount: unsubmittedUsernames.length,
        unsubmittedUsernames,
        rate,
      };
    });
  }, [teams, users, departments, divisions, reportsByMember]);

  // 필터 탭용 부문 목록 추출
  const availableDivisions = useMemo(() => {
    const divNames = new Set<string>();
    teamItemsWithStats.forEach((t) => {
      if (t.divisionName) divNames.add(t.divisionName);
    });
    return Array.from(divNames);
  }, [teamItemsWithStats]);

  // 검색 및 부문 필터링 적용
  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teamItemsWithStats.filter((t) => {
      if (
        selectedDivisionFilter !== "ALL" &&
        t.divisionName !== selectedDivisionFilter
      ) {
        return false;
      }
      if (!q) return true;
      const matchTeam = t.teamName.toLowerCase().includes(q);
      const matchDept = t.departmentName.toLowerCase().includes(q);
      const matchDiv = t.divisionName.toLowerCase().includes(q);
      return matchTeam || matchDept || matchDiv;
    });
  }, [teamItemsWithStats, searchQuery, selectedDivisionFilter]);

  // 부문/부서별 계층 그룹화
  const groupedSections = useMemo(() => {
    type DeptGroup = {
      groupKey: string;
      divisionName: string;
      departmentName: string;
      headerParts: string[];
      teams: typeof teamItemsWithStats;
    };

    const groupMap = new Map<string, DeptGroup>();

    filteredTeams.forEach((item) => {
      if (!groupMap.has(item.groupKey)) {
        groupMap.set(item.groupKey, {
          groupKey: item.groupKey,
          divisionName: item.divisionName,
          departmentName: item.departmentName,
          headerParts: item.groupHeaderParts,
          teams: [],
        });
      }
      groupMap.get(item.groupKey)!.teams.push(item);
    });

    return Array.from(groupMap.values());
  }, [filteredTeams]);

  // 현재 선택된 팀명 (취소/뒤로가기 배너용)
  const currentTeamName = useMemo(() => {
    if (!currentTeamId) return null;
    return teamItemsWithStats.find((t) => t.teamId === currentTeamId)?.teamName;
  }, [currentTeamId, teamItemsWithStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 상단 네비게이션: 팀 변경 모드일 때 돌아가기 버튼 */}
        {currentTeamId && currentTeamName && onCancelChange && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancelChange}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-2xs cursor-pointer"
            >
              <span>←</span>
              <span>
                보고서 현황으로 돌아가기 (
                <span className="text-indigo-600">{currentTeamName}</span>)
              </span>
            </button>
            <span className="text-xs text-gray-400">
              선택 시 즉시 해당 팀 현황으로 이동합니다
            </span>
          </div>
        )}

        {/* 메인 히어로 배너 */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
            <span>📋</span>
            <span>AERIX 일일 업무 보고 현황</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            조회할 팀을 선택해주세요
          </h1>

          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
            원하시는 팀을 클릭하면 해당 팀의 일일 업무 보고 및 AI 분석 현황을 바로 확인하실 수 있습니다.
            <br />
            <span className="text-xs text-indigo-600 font-medium">
              💡 팀별 제출 현황 및 미제출 인원을 한눈에 확인하고 피드백을 전달할 수 있습니다.
            </span>
          </p>

          {/* 스마트 검색창 */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="팀명, 부서, 본부로 검색 (예: 연구개발팀, 영업본부...)"
                className="w-full pl-11 pr-10 py-3.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-indigo-500 rounded-2xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="검색어 지우기"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-300">
                    ✕
                  </span>
                </button>
              )}
            </div>

            {/* 부문별 퀵 필터 칩 */}
            {availableDivisions.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedDivisionFilter("ALL")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    selectedDivisionFilter === "ALL"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  전체 ({teams.length})
                </button>
                {availableDivisions.map((divName) => {
                  const count = teamItemsWithStats.filter(
                    (t) => t.divisionName === divName,
                  ).length;
                  const isSelected = selectedDivisionFilter === divName;
                  return (
                    <button
                      key={divName}
                      type="button"
                      onClick={() => setSelectedDivisionFilter(divName)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {divName} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 결과 없을 때 빈 화면 */}
        {filteredTeams.length === 0 && (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center space-y-3">
            <span className="text-3xl">🔍</span>
            <p className="text-base font-bold text-gray-800">
              일치하는 팀을 찾을 수 없습니다
            </p>
            <p className="text-xs text-gray-500">
              &quot;{searchQuery}&quot; 검색어 또는 선택한 부문 필터를 다시 확인해주세요.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedDivisionFilter("ALL");
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              검색 초기화
            </button>
          </div>
        )}

        {/* 계층별 팀 카드 섹션 (MemberSelectionLanding 스타일) */}
        {groupedSections.map((group) => (
          <div
            key={group.groupKey}
            className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden transition-all hover:shadow-md"
          >
            {/* 계층 경로 헤더 (중복 제거된 Breadcrumb) */}
            <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs shadow-2xs font-bold">
                  🏢
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-800 truncate">
                  {group.headerParts.map((part, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      {idx > 0 && <span className="text-gray-300">›</span>}
                      <span
                        className={
                          idx === group.headerParts.length - 1
                            ? "text-gray-800 font-bold"
                            : "text-gray-500"
                        }
                      >
                        {part}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                {group.teams.length}개 팀
              </span>
            </div>

            {/* 팀 카드 그리드 */}
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {group.teams.map((t) => {
                const isCurrent = currentTeamId === t.teamId;
                const gradientClass = getTeamGradient(t.teamName);

                return (
                  <button
                    key={t.teamId}
                    type="button"
                    onClick={() => onSelectTeam(t.teamId)}
                    className={`group relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/30 shadow-xs"
                        : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    {/* 상단: 팀 아바타 + 팀명 + 소속 경로 */}
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientClass} text-white font-bold text-sm shadow-2xs group-hover:scale-105 transition-transform`}
                        >
                          👥
                        </div>

                        <div className="min-w-0">
                          <p className="text-base font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                            {t.teamName}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {t.breadcrumb}
                          </p>
                        </div>
                      </div>

                      <span className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all text-sm font-bold pt-1">
                        →
                      </span>
                    </div>

                    {/* 하단: 제출 통계 뱃지 및 상태 */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 w-full flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                          총 {t.totalCount}명
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          제출 {t.submittedCount}명
                        </span>

                        {t.leaveCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            휴가 {t.leaveCount}명
                          </span>
                        )}

                        {t.unsubmittedCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            미제출 {t.unsubmittedCount}명
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0">
                        {t.rate}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
