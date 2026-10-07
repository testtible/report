export async function saveMasterCommentApi(
  reportId: string,
  masterComment: string,
): Promise<{ ok: boolean; masterComment: string | null; error?: string; details?: string }> {
  const res = await fetch("/api/report/master-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: reportId, masterComment }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.details
        ? `${data.error}\n(${data.details})`
        : data.error || "코멘트 저장에 실패했습니다.",
    );
  }
  return data;
}

export async function confirmModificationApi(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/report/confirm-modification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "처리에 실패했습니다.");
  }
  return data;
}
