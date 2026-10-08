import type {
  OrganizationResponse,
  ReportFetchResponse,
  ReportSubmitResponse,
  UnreadMasterCommentItem,
  UnreadUserCommentItem,
  UserItem,
} from "@/features/report/types/report.types";

export async function fetchMemberReport(
  username: string,
  date: string,
): Promise<ReportFetchResponse> {
  const res = await fetch(
    `/api/report?username=${encodeURIComponent(username)}&date=${date}`,
  );
  const data = (await res.json()) as ReportFetchResponse;
  if (!res.ok) {
    throw new Error(data.error || "보고서 조회에 실패했습니다.");
  }
  return data;
}

export async function postMemberReport(
  formData: FormData,
): Promise<ReportSubmitResponse> {
  const res = await fetch("/api/report", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as ReportSubmitResponse;
  if (!res.ok) {
    throw new Error(data.error || "보고서 제출에 실패했습니다.");
  }
  return data;
}

export async function confirmMasterCommentApi(
  reportId: string,
): Promise<{ ok: boolean; isConfirmMasterComment: boolean }> {
  const res = await fetch("/api/report/confirm-master-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: reportId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "코멘트 확인 처리에 실패했습니다.");
  }
  return data;
}

export async function fetchUsersApi(): Promise<UserItem[]> {
  const res = await fetch("/api/users");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "사용자 목록 조회에 실패했습니다.");
  }
  return data.users;
}

export async function postUserCommentApi(
  reportId: string,
  userComment: string,
): Promise<{ ok: boolean; userComment: string | null; isUserComment: boolean }> {
  const res = await fetch("/api/report/user-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: reportId, userComment }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "요청 코멘트 저장에 실패했습니다.");
  }
  return data;
}

export async function confirmUserCommentApi(
  reportId: string,
): Promise<{ ok: boolean; isUserComment: boolean }> {
  const res = await fetch("/api/report/confirm-user-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: reportId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "요청 코멘트 확인 처리에 실패했습니다.");
  }
  return data;
}

export async function fetchUnreadMasterCommentsApi(
  username: string,
): Promise<UnreadMasterCommentItem[]> {
  const res = await fetch(
    `/api/report/unread-master-comments?username=${encodeURIComponent(username)}`,
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "미확인 관리자 코멘트 조회에 실패했습니다.");
  }
  return data.unreadComments ?? [];
}

export async function fetchUnreadUserCommentsApi(): Promise<
  UnreadUserCommentItem[]
> {
  const res = await fetch("/api/report/unread-user-comments");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "미확인 팀원 요청 코멘트 조회에 실패했습니다.");
  }
  return data.unreadUserComments ?? [];
}

export type UrgentTasksApiResponse = {
  urgentTasks: import("@/features/report/utils/deadlineParser").UrgentTaskItem[];
  hasError?: boolean;
  errorMessage?: string;
};

export async function fetchUrgentTasksApi(
  username?: string,
  date?: string,
): Promise<UrgentTasksApiResponse> {
  const params = new URLSearchParams();
  if (username) params.append("username", username);
  if (date) params.append("date", date);

  const res = await fetch(`/api/report/urgent-tasks?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    return {
      urgentTasks: [],
      hasError: true,
      errorMessage: data.error || "임박한 업무 조회에 실패했습니다.",
    };
  }
  if (data.hasError) {
    return {
      urgentTasks: [],
      hasError: true,
      errorMessage: data.error || "사내 AI 분석에 실패했습니다.",
    };
  }
  return {
    urgentTasks: data.urgentTasks ?? [],
    hasError: false,
  };
}

export async function fetchOrganizationApi(): Promise<OrganizationResponse> {
  const res = await fetch("/api/organization");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "조직 정보 조회에 실패했습니다.");
  }
  return data;
}



