export const MEMBERS = [
  "한준기",
  "박상원",
  "김나경",
  "강민석",
  "권혁재",
  "전승기",
] as const;

export type MemberName = (typeof MEMBERS)[number];

export const LEAVE_TYPES = {
  TRIP: "출장",
  VACATION: "휴가",
} as const;

export type LeaveType = (typeof LEAVE_TYPES)[keyof typeof LEAVE_TYPES];

export function isLeaveContent(content: string | undefined): content is LeaveType {
  return content === LEAVE_TYPES.TRIP || content === LEAVE_TYPES.VACATION;
}
