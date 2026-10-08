"use client";

import { useMemo, useState } from "react";
import { getDeduplicatedOrgPath } from "@/app/lib/organizationUtils";
import type {
  OrgDivisionNode,
  UserOrgItem,
} from "@/features/report/types/report.types";

type Props = {
  hierarchy: OrgDivisionNode[];
  users: UserOrgItem[];
  unassignedUsers?: UserOrgItem[];
  isLoading?: boolean;
  currentMember?: string;
  onSelectMember: (memberName: string) => void;
  onCancelChange?: () => void;
};

// 이름별 아바타 색상 팔레트
const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-600",
  "from-indigo-600 to-purple-600",
  "from-purple-600 to-pink-600",
  "from-emerald-600 to-teal-600",
  "from-cyan-600 to-blue-600",
  "from-amber-600 to-orange-600",
  "from-rose-600 to-red-600",
  "from-violet-600 to-purple-700",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export default function MemberSelectionLanding({
  hierarchy,
  users,
  unassignedUsers = [],
  isLoading = false,
  currentMember,
  onSelectMember,
  onCancelChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivisionFilter, setSelectedDivisionFilter] =
    useState<string>("ALL");

  // 유저가 존재하는 부문 목록 추출 (필터 탭용)
  const availableDivisions = useMemo(() => {
    const divNames = new Set<string>();
    users.forEach((u) => {
      if (u.divisionName) divNames.add(u.divisionName);
    });
    return Array.from(divNames);
  }, [users]);

  // 검색 및 부문 필터링이 적용된 유저 목록
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      // 부문 필터
      if (
        selectedDivisionFilter !== "ALL" &&
        u.divisionName !== selectedDivisionFilter
      ) {
        return false;
      }
      // 검색어 필터
      if (!q) return true;
      const matchName = u.name.toLowerCase().includes(q);
      const matchTeam = u.teamName?.toLowerCase().includes(q);
      const matchDept = u.departmentName?.toLowerCase().includes(q);
      const matchDiv = u.divisionName?.toLowerCase().includes(q);
      return matchName || matchTeam || matchDept || matchDiv;
    });
  }, [users, searchQuery, selectedDivisionFilter]);

  // 필터링된 유저들을 계층 구조로 그룹화 (division > department > team)
  const groupedSections = useMemo(() => {
    // 필터링된 유저 ID 세트
    const filteredUserIds = new Set(filteredUsers.map((u) => u.id));

    type TeamGroup = {
      teamId: string;
      teamName: string;
      departmentName: string;
      divisionName: string;
      breadcrumb: string;
      pathParts: string[];
      users: UserOrgItem[];
    };

    const groups: TeamGroup[] = [];

    // hierarchy 트리를 순회하며 팀별로 그룹화
    hierarchy.forEach((div) => {
      div.departments.forEach((dept) => {
        dept.teams.forEach((t) => {
          // 해당 팀에 속한 필터링 통과 유저들
          const teamUsers = t.users
            .filter((u) => filteredUserIds.has(u.id))
            .map((u) => {
              const fullUser = users.find((fu) => fu.id === u.id);
              return fullUser || { id: u.id, name: u.name, teamId: u.teamId };
            });

          if (teamUsers.length > 0) {
            const pathParts = getDeduplicatedOrgPath(div.name, dept.name, t.name);
            groups.push({
              teamId: t.id,
              teamName: t.name,
              departmentName: dept.name,
              divisionName: div.name,
              breadcrumb: pathParts.join(" › "),
              pathParts,
              users: teamUsers,
            });
          }
        });
      });
    });

    // 소속 미지정 유저들
    const filteredUnassigned = unassignedUsers.filter((u) =>
      filteredUserIds.has(u.id),
    );

    return { groups, filteredUnassigned };
  }, [hierarchy, users, filteredUsers, unassignedUsers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 상단 네비게이션 / 뒤로가기 버튼 (팀원 변경 모드일 때만 표시) */}
        {currentMember && onCancelChange && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancelChange}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-2xs cursor-pointer"
            >
              <span>←</span>
              <span>
                보고서 작성으로 돌아가기 (
                <span className="text-indigo-600">{currentMember}</span>)
              </span>
            </button>
            <span className="text-xs text-gray-400">
              선택 시 즉시 작성자가 변경됩니다
            </span>
          </div>
        )}

        {/* 메인 히어로 배너 */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
            <span>📋</span>
            <span>AERIX 일일 업무 보고</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            보고서 작성자를 선택해주세요
          </h1>

          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
            본인의 이름을 클릭하면 일일 업무 보고서 작성 화면으로 즉시 연결됩니다.
            <br />
            <span className="text-xs text-indigo-600 font-medium">
              💡 한 번 선택하면 브라우저에 자동 기억되어 다음 접속 시 바로 보고서가 열립니다.
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
                placeholder="이름, 부문, 부서, 팀명으로 검색 (예: 권혁재, 연구개발팀...)"
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
                  전체 ({users.length})
                </button>
                {availableDivisions.map((divName) => {
                  const count = users.filter(
                    (u) => u.divisionName === divName,
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

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
            <p className="text-sm text-gray-500 font-medium">
              조직도 및 팀원 정보를 불러오는 중입니다...
            </p>
          </div>
        )}

        {/* 결과 없을 때 빈 화면 */}
        {!isLoading && filteredUsers.length === 0 && (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center space-y-3">
            <span className="text-3xl">🔍</span>
            <p className="text-base font-bold text-gray-800">
              일치하는 팀원을 찾을 수 없습니다
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

        {/* 계층별 팀원 카드 섹션 (제안 4번 방식) */}
        {!isLoading &&
          groupedSections.groups.map((group) => (
            <div
              key={group.teamId}
              className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden transition-all hover:shadow-md"
            >
              {/* 계층 경로 헤더 (Breadcrumb) */}
              <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs shadow-2xs font-bold">
                    🏢
                  </span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-800 truncate">
                    {group.pathParts.map((part, idx) => (
                      <span key={idx} className="flex items-center gap-1.5">
                        {idx > 0 && <span className="text-gray-300">›</span>}
                        <span
                          className={
                            idx === group.pathParts.length - 1
                              ? "text-indigo-700 font-bold"
                              : idx === 0
                                ? "text-gray-500"
                                : "text-gray-600"
                          }
                        >
                          {part}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                  {group.users.length}명
                </span>
              </div>

              {/* 팀원 카드 그리드 */}
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.users.map((user) => {
                  const isCurrent = currentMember === user.name;
                  const gradientClass = getAvatarGradient(user.name);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => onSelectMember(user.name)}
                      className={`group relative flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/30 shadow-xs"
                          : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 hover:shadow-md hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* 아바타 원 */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradientClass} text-white font-bold text-sm shadow-2xs group-hover:scale-105 transition-transform`}
                        >
                          {user.name.slice(0, 1)}
                        </div>

                        {/* 이름 및 부서명 */}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                            {user.name}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {group.teamName}
                          </p>
                        </div>
                      </div>

                      {/* 진입 화살표 또는 현재 선택 뱃지 */}
                      <div className="shrink-0 pl-2">
                        {isCurrent ? (
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">
                            선택됨
                          </span>
                        ) : (
                          <span className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all text-sm font-bold">
                            →
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {/* 소속 미지정 유저 섹션 (있을 경우 안전하게 표시) */}
        {!isLoading && groupedSections.filteredUnassigned.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">
                  📁 기타 / 소속 미지정
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {groupedSections.filteredUnassigned.length}명
              </span>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {groupedSections.filteredUnassigned.map((user) => {
                const isCurrent = currentMember === user.name;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onSelectMember(user.name)}
                    className={`group relative flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/30"
                        : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-600 text-white font-bold text-sm">
                        {user.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-gray-400">소속 없음</p>
                      </div>
                    </div>
                    <span className="text-gray-300 group-hover:text-indigo-600 text-sm font-bold">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
