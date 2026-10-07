import { MEMBERS } from "@/app/lib/members";

type Props = {
  selectedMember: string;
  onSelectMember: (member: string) => void;
  onOpenHistoryModal: () => void;
  memberList?: readonly string[] | string[];
};

export default function ReportMemberSelect({
  selectedMember,
  onSelectMember,
  onOpenHistoryModal,
  memberList,
}: Props) {
  const members = memberList && memberList.length > 0 ? memberList : MEMBERS;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="member"
          className="block text-sm font-semibold text-gray-700"
        >
          팀원 선택
        </label>
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
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
            selectedMember
              ? "text-indigo-600 hover:text-indigo-800 cursor-pointer"
              : "text-gray-400 cursor-not-allowed"
          }`}
          title={
            selectedMember
              ? `${selectedMember} 님의 이전 보고 목록을 확인합니다`
              : "팀원을 먼저 선택해주세요"
          }
        >
          <svg
            className="w-4 h-4"
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
          이전 보고 이력
        </button>
      </div>
      <select
        id="member"
        value={selectedMember}
        onChange={(e) => onSelectMember(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-gray-900 cursor-pointer text-sm"
      >
        <option value="" disabled>
          선택
        </option>
        {members.map((member) => (
          <option key={member} value={member}>
            {member}
          </option>
        ))}
      </select>
    </div>
  );
}
