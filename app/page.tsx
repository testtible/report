"use client";

import { useState } from "react";
import ReportHistoryModal from "@/app/components/ReportHistoryModal";

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const members = ["한준기", "박상원", "김나경", "강민석", "권혁재", "이상혁"];

  // 현재 날짜를 YYYY-MM-DD 형식으로 가져오기
  const currentDate = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert("팀원을 선택해주세요.");
      return;
    }
    if (!reportContent.trim()) {
      alert("보고 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: selectedMember,
          content: reportContent.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? "제출에 실패했습니다.");
        return;
      }
      alert("보고서가 제출되었습니다.");
      setSelectedMember("");
      setReportContent("");
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            일일 보고서{" "}
            <span className="text-2xl font-normal text-gray-600">
              {currentDate}
            </span>
          </h1>
          <p className="text-gray-600">팀장님께 보고할 내용을 작성해주세요</p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 팀원 선택 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="member"
                  className="block text-sm font-semibold text-gray-700"
                >
                  팀원 선택
                </label>
                {selectedMember && (
                  <button
                    type="button"
                    onClick={() => setHistoryModalOpen(true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors cursor-pointer"
                  >
                    이전 보고 내용 보러가기
                  </button>
                )}
              </div>
              <select
                id="member"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 appearance-none cursor-pointer hover:border-gray-400"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                  paddingRight: "2.5rem",
                }}
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

            {/* 보고 내용 */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                보고 내용
              </label>
              <textarea
                id="content"
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-gray-900 placeholder-gray-400"
                placeholder="오늘 수행한 업무를 작성해주세요."
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isSubmitting ? "제출 중..." : "제출하기"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ReportHistoryModal
        username={selectedMember}
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </div>
  );
}
