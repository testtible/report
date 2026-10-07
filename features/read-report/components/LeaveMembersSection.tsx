import { getLeaveTypeColor } from "@/app/lib/leave";
import type { LeaveType } from "@/app/lib/members";

type LeaveMember = {
  username: string;
  type: string;
};

type Props = {
  leaveMembers: LeaveMember[];
  hasSubmittedReports: boolean;
};

export default function LeaveMembersSection({
  leaveMembers,
  hasSubmittedReports,
}: Props) {
  if (leaveMembers.length === 0) return null;

  return (
    <div className={hasSubmittedReports ? "pt-4 border-t border-gray-200" : ""}>
      <p className="mb-3 text-xs font-medium text-gray-500">출장 · 휴가</p>
      <div className="flex flex-wrap gap-2">
        {leaveMembers.map(({ username, type }) => {
          const colors = getLeaveTypeColor(type as LeaveType);
          return (
            <div
              key={username}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-900">{username}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
              >
                {type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
