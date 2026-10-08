import { MEMBERS } from "@/app/lib/members";
import { formatOrgBreadcrumb } from "@/app/lib/organizationUtils";
import type { UserOrgItem } from "@/features/report/types/report.types";

type Props = {
  selectedMember: string;
  onSelectMember: (member: string) => void;
  onOpenHistoryModal: () => void;
  memberList?: readonly string[] | string[];
  selectedMemberOrg?: UserOrgItem;
  onChangeMemberClick?: () => void;
};

export default function ReportMemberSelect({
  selectedMember,
  onSelectMember,
  onOpenHistoryModal,
  memberList,
  selectedMemberOrg,
  onChangeMemberClick,
}: Props) {
  const members = memberList && memberList.length > 0 ? memberList : MEMBERS;

  const affiliationText = selectedMemberOrg
    ? formatOrgBreadcrumb(
        selectedMemberOrg.divisionName,
        selectedMemberOrg.departmentName,
        selectedMemberOrg.teamName,
      )
    : null;

  return (
    <div className="space-y-2">
      {/* 1. 작성자 정보 & 변경 액션 카드 */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/30 to-blue-50/50 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* 아바타 */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-2xs">
            {selectedMember ? selectedMember.slice(0, 1) : "?"}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-extrabold text-gray-900 tracking-tight">
                {selectedMember || "작성자 미선택"}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                작성자
              </span>
            </div>
            {affiliationText ? (
              <p className="text-xs text-indigo-900/80 font-medium truncate mt-0.5">
                🏢 {affiliationText}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                소속 정보가 설정되어 있지 않습니다
              </p>
            )}
          </div>
        </div>

        {/* 우측 액션 버튼: 팀원 변경 + 이전 보고 이력 */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {onChangeMemberClick && (
            <button
              type="button"
              onClick={onChangeMemberClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="조직도 화면에서 작성자를 다시 선택합니다"
            >
              <span>⇄</span>
              <span>팀원 변경</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!selectedMember) {
                alert("이력을 보려면 먼저 팀원을 선택해주세요.");
                return;
              }
              onOpenHistoryModal();
            }}
            disabled={!selectedMember}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
              selectedMember
                ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 cursor-pointer"
                : "border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
            title={
              selectedMember
                ? `${selectedMember} 님의 이전 보고 목록을 확인합니다`
                : "팀원을 먼저 선택해주세요"
            }
          >
            <svg
              className="w-3.5 h-3.5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>이전 보고 이력</span>
          </button>
        </div>
      </div>

      {/* 2. 빠른 선택 셀렉트 박스 (간단 드롭다운 백업) */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>빠른 전환 드롭다운:</span>
        <select
          id="member-quick-select"
          value={selectedMember}
          onChange={(e) => onSelectMember(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 hover:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="" disabled>
            직접 선택
          </option>
          {members.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
