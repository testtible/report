import type {
  ReportFetchResponse,
  ReportSubmitResponse,
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
