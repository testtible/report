import type {
  ReportFetchResponse,
  ReportSubmitResponse,
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
