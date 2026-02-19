"use client";

import { useEffect, useMemo, useState } from "react";

type ReportItem = {
  id: string;
  created_at: string;
  content: string;
};

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const week = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${y}. ${m}. ${day}. (${week})`;
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  username: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ReportHistoryModal({
  username,
  isOpen,
  onClose,
}: Props) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/member-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error ?? "비밀번호를 확인해주세요.");
        setAuthLoading(false);
        return;
      }
      setAuthorized(true);
      setAuthPassword("");
    } catch {
      setAuthError("네트워크 오류가 발생했습니다.");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !username || !authorized) return;
    let cancelled = false;
    const run = async () => {
      const res = await fetch(
        `/api/report/history?username=${encodeURIComponent(username)}`,
      );
      const data = await res.json();
      if (cancelled) return;
      const list = (data.reports ?? []) as ReportItem[];
      setReports(list);
      if (list.length > 0) {
        const yesterdayKey = getYesterdayKey();
        const yesterdayReport = list.find(
          (r) => toLocalDateKey(r.created_at) === yesterdayKey,
        );
        setSelectedId((yesterdayReport ?? list[0]).id);
      }
      setLoading(false);
    };
    run();
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setReports([]);
        setSelectedId(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, username, authorized]);

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            이전 보고 이력 · {username}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="닫기"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {!authorized ? (
          <div className="flex-1 flex items-center justify-center px-6 py-8">
            <form
              onSubmit={handleAuthSubmit}
              className="w-full max-w-sm space-y-4"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 mb-2 text-center">
                  팀원 이력 조회 비밀번호를 입력하세요
                </p>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  disabled={authLoading}
                />
              </div>
              {authError && (
                <p className="text-sm text-red-600 text-center">{authError}</p>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition-colors"
              >
                {authLoading ? "확인 중..." : "이력 보기"}
              </button>
            </form>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center py-12 text-gray-500">
            불러오는 중...
          </div>
        ) : reports.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-gray-500">
            아직 작성한 보고가 없습니다.
          </div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row min-h-0">
            <div className="sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 overflow-y-auto bg-gray-50/50">
              <div className="p-2 space-y-0.5">
                {reports.map((r) => {
                  const isSelected = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-indigo-100 text-indigo-800 font-medium"
                          : "text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {formatDisplayDate(r.created_at)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 p-4">
              {selectedReport && (
                <>
                  <p className="text-sm text-gray-500 mb-2">
                    {formatDisplayDate(selectedReport.created_at)}
                  </p>
                  <div className="flex-1 overflow-y-auto rounded-xl bg-gray-50 p-4 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedReport.content || "작성된 내용이 없습니다."}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
