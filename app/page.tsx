"use client";

import { useEffect, useRef, useState } from "react";
import LeaveScheduleModal from "@/app/components/LeaveScheduleModal";
import ReportHistoryModal from "@/app/components/ReportHistoryModal";
import MarkdownView from "@/app/components/MarkdownView";
import {
  formatFileSize,
  MAX_ATTACHMENT_SIZE_LABEL,
  validateAttachmentFile,
} from "@/app/lib/attachments";
import {
  formatDateLabel,
  formatDateWithWeekday,
  getDefaultEditableDate,
  getEditableDateKeys,
  getTodayKey,
} from "@/app/lib/dates";
import { MEMBERS } from "@/app/lib/members";

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedDate, setSelectedDate] = useState(getDefaultEditableDate);
  const [reportContent, setReportContent] = useState("");
  const [isExistingReport, setIsExistingReport] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<
    string | null
  >(null);
  const [existingAttachmentSize, setExistingAttachmentSize] = useState<
    number | null
  >(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [isRefiningAi, setIsRefiningAi] = useState(false);
  const [prevReportContent, setPrevReportContent] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editableDates = getEditableDateKeys();

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = reportContent.substring(start, end);
    const replacement = selected
      ? `${prefix}${selected}${suffix}`
      : `${prefix}${suffix}`;
    const next =
      reportContent.substring(0, start) +
      replacement +
      reportContent.substring(end);
    setReportContent(next);
    setTimeout(() => {
      textarea.focus();
      const newPos = selected
        ? start + replacement.length
        : start + prefix.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertTemplate = () => {
    const template = `### [진행 업무]\n- [x] 주요 완료 작업\n- [ ] 진행 중인 작업\n\n### [이슈 및 특이사항]\n- 특이사항 및 협의 필요 내용 없음\n\n### [내일 예정 사항]\n- 내일 진행할 작업 계획`;
    if (reportContent.trim()) {
      if (
        !confirm(
          "기존 작성 내용 아래에 일일 보고서 추천 양식을 추가하시겠습니까?",
        )
      ) {
        return;
      }
      setReportContent((prev) => `${prev.trim()}\n\n${template}`);
    } else {
      setReportContent(template);
    }
    setActiveTab("write");
  };

  const handleRefineWithAi = async () => {
    if (!reportContent.trim()) {
      alert("정리할 보고 내용을 먼저 작성해주세요.");
      return;
    }
    setIsRefiningAi(true);
    try {
      const res = await fetch("/api/report/refine-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reportContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "AI 정리 요청에 실패했습니다.");
        return;
      }
      setPrevReportContent(reportContent);
      setReportContent(data.refined);
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsRefiningAi(false);
    }
  };

  const handleUndoRefine = () => {
    if (prevReportContent !== null) {
      setReportContent(prevReportContent);
      setPrevReportContent(null);
    }
  };

  const resetAttachmentState = () => {
    setSelectedFile(null);
    setExistingAttachmentName(null);
    setExistingAttachmentSize(null);
    setRemoveAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!selectedMember) {
      setReportContent("");
      setIsExistingReport(false);
      resetAttachmentState();
      return;
    }

    let cancelled = false;
    const loadReport = async () => {
      setIsLoadingContent(true);
      try {
        const res = await fetch(
          `/api/report?username=${encodeURIComponent(selectedMember)}&date=${selectedDate}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setReportContent("");
          setIsExistingReport(false);
          resetAttachmentState();
          return;
        }
        setReportContent(data.content ?? "");
        setIsExistingReport(!!data.exists);
        setSelectedFile(null);
        setRemoveAttachment(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setExistingAttachmentName(data.attachmentName ?? null);
        setExistingAttachmentSize(data.attachmentSize ?? null);
      } catch {
        if (!cancelled) {
          setReportContent("");
          setIsExistingReport(false);
          resetAttachmentState();
        }
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    };

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [selectedMember, selectedDate]);

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

    if (selectedFile) {
      const fileError = validateAttachmentFile(selectedFile);
      if (fileError) {
        alert(fileError);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("username", selectedMember);
      formData.append("content", reportContent.trim());
      formData.append("date", selectedDate);
      if (selectedFile) formData.append("file", selectedFile);
      if (removeAttachment) formData.append("removeAttachment", "true");

      const res = await fetch("/api/report", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? "제출에 실패했습니다.");
        return;
      }
      alert(
        data.updated ? "보고서가 수정되었습니다." : "보고서가 제출되었습니다.",
      );
      setIsExistingReport(true);
      setSelectedFile(null);
      setRemoveAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (selectedFile) {
        setExistingAttachmentName(selectedFile.name);
        setExistingAttachmentSize(selectedFile.size);
      } else if (removeAttachment) {
        setExistingAttachmentName(null);
        setExistingAttachmentSize(null);
      }
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
              {formatDateWithWeekday(selectedDate)}
            </span>
          </h1>
          <p className="text-gray-600">팀장님께 보고할 내용을 작성해주세요</p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 날짜 선택 + 출장·휴가 지정 */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  보고 날짜
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedMember) {
                      alert(
                        "출장 및 휴가를 지정하려면 먼저 팀원을 선택해주세요.",
                      );
                      return;
                    }
                    setLeaveModalOpen(true);
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  출장 및 휴가 지정
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                주말을 제외한 최근 평일 5일 중 날짜를 선택해 작성하거나 수정할
                수 있습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {editableDates.map((dateKey) => {
                  const isSelected = dateKey === selectedDate;
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDate(dateKey)}
                      className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {formatDateLabel(dateKey)}
                    </button>
                  );
                })}
              </div>
            </div>

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
                {MEMBERS.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </div>

            {/* 보고 내용 */}
            <div>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <label
                  htmlFor="content"
                  className="block text-sm font-semibold text-gray-700"
                >
                  보고 내용
                  <span className="ml-2 font-normal text-gray-500">
                    · {formatDateLabel(selectedDate)}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  {selectedMember && isExistingReport && !isLoadingContent && (
                    <span className="text-xs font-medium text-amber-600 mr-1">
                      기존 보고 수정 중
                    </span>
                  )}
                  {prevReportContent !== null && (
                    <button
                      type="button"
                      onClick={handleUndoRefine}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                      title="AI로 다듬기 전 원본 내용으로 복원합니다"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4"
                        />
                      </svg>
                      원본 복원
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRefineWithAi}
                    disabled={
                      isRefiningAi || isLoadingContent || !reportContent.trim()
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="대충 작성한 메모를 사람이 읽기 편한 보고서 형식으로 다듬어줍니다"
                  >
                    {isRefiningAi ? (
                      <>
                        <span className="h-3 w-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                        <span>AI 정리 중...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5 text-indigo-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span>AI 보고 내용 정리</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 마크다운 툴바 및 작성/미리보기 탭 */}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                {/* 서식 단축 버튼들 */}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertMarkdown("**", "**")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="굵게 (**텍스트**)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("*", "*")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-xs italic font-serif text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="기울임 (*텍스트*)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("~~", "~~")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-xs line-through text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="취소선 (~~텍스트~~)"
                  >
                    S
                  </button>
                  <span className="mx-0.5 h-4 w-px bg-gray-200" />
                  <button
                    type="button"
                    onClick={() => insertMarkdown("### ")}
                    className="inline-flex h-7 px-2 items-center justify-center rounded border border-gray-200 bg-white text-[11px] font-bold text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="소제목 (### 제목)"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- ")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="글머리 기호 (- 항목)"
                  >
                    •
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- [ ] ")}
                    className="inline-flex h-7 px-1.5 items-center justify-center gap-1 rounded border border-gray-200 bg-white text-[11px] text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="체크리스트 할 일 (- [ ] 할일)"
                  >
                    <span className="text-gray-400">☐</span> 할일
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- [x] ")}
                    className="inline-flex h-7 px-1.5 items-center justify-center gap-1 rounded border border-gray-200 bg-white text-[11px] text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="완료 체크리스트 (- [x] 완료)"
                  >
                    <span className="text-emerald-600 font-bold">☑</span> 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("`", "`")}
                    className="inline-flex h-7 px-1.5 items-center justify-center rounded border border-gray-200 bg-white font-mono text-[11px] text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="코드 (`코드`)"
                  >
                    &lt;/&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("> ")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="인용구 (> 인용)"
                  >
                    &gt;
                  </button>
                  <span className="mx-0.5 h-4 w-px bg-gray-200" />
                  <button
                    type="button"
                    onClick={insertTemplate}
                    className="inline-flex h-7 px-2 items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50/50 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                    title="기본 일일 보고서 템플릿(진행업무, 이슈, 내일계획) 삽입"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    양식 삽입
                  </button>
                </div>

                {/* 편집 / 미리보기 탭 토글 */}
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveTab("write")}
                    className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                      activeTab === "write"
                        ? "bg-white text-gray-900 shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    ✏️ 작성
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                      activeTab === "preview"
                        ? "bg-indigo-600 text-white shadow-xs font-semibold"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    👁️ 미리보기
                  </button>
                </div>
              </div>

              {activeTab === "write" ? (
                <textarea
                  id="content"
                  ref={contentTextareaRef}
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  rows={12}
                  disabled={isLoadingContent}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-gray-900 placeholder-gray-400 disabled:bg-gray-50 font-sans"
                  placeholder={
                    isLoadingContent
                      ? "불러오는 중..."
                      : selectedDate === getTodayKey()
                        ? "오늘 수행한 업무를 마크다운 서식으로 자유롭게 작성해주세요."
                        : `${formatDateLabel(selectedDate)}에 수행한 업무를 마크다운 서식으로 작성해주세요.`
                  }
                />
              ) : (
                <div className="w-full min-h-[300px] max-h-[500px] overflow-y-auto px-5 py-4 border border-indigo-200 rounded-lg bg-slate-50/50 shadow-inner">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 text-xs text-gray-500">
                    <span className="font-semibold text-indigo-700 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-indigo-600" />
                      마크다운 서식 렌더링 미리보기
                    </span>
                    <span>팀원 및 팀장님께 표시되는 실제 화면입니다</span>
                  </div>
                  {reportContent.trim() ? (
                    <MarkdownView content={reportContent} />
                  ) : (
                    <p className="text-sm text-gray-400 italic py-10 text-center">
                      작성된 내용이 없습니다. '작성' 탭에서 보고 내용을
                      입력해보세요.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-indigo-50/30 border border-indigo-100/90 px-3.5 py-2 text-xs text-gray-700 shadow-2xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs">
                  💡
                </span>
                <span>
                  <span className="font-semibold text-indigo-700">"양식 삽입"</span> 혹은{" "}
                  <span className="font-semibold text-purple-700">"AI 보고 내용 정리"</span> 사용을 권장합니다.
                </span>
              </div>

              {/* 첨부파일 */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  첨부파일
                  <span className="ml-2 font-normal text-gray-500 text-xs">
                    1개 · 최대 {MAX_ATTACHMENT_SIZE_LABEL}
                  </span>
                </label>

                {existingAttachmentName &&
                  !selectedFile &&
                  !removeAttachment && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs text-indigo-700 font-medium">
                          기존 첨부파일
                        </p>
                        <p
                          className="text-sm text-gray-800 truncate"
                          title={existingAttachmentName}
                        >
                          {existingAttachmentName}
                          {existingAttachmentSize
                            ? ` (${formatFileSize(existingAttachmentSize)})`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRemoveAttachment(true)}
                        className="shrink-0 text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                  )}

                {removeAttachment && !selectedFile && (
                  <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    제출 시 기존 첨부파일이 삭제됩니다.
                  </p>
                )}

                {!selectedFile && (
                  <label className="flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer py-6 px-4">
                    <svg
                      className="w-8 h-8 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">
                      클릭하여 파일 선택
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      압축파일 포함 모든 형식
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      disabled={isLoadingContent}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const error = validateAttachmentFile(file);
                        if (error) {
                          alert(error);
                          e.target.value = "";
                          return;
                        }
                        setSelectedFile(file);
                        setRemoveAttachment(false);
                      }}
                    />
                  </label>
                )}

                {selectedFile && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">선택된 파일</p>
                      <p
                        className="text-sm font-medium text-gray-900 truncate"
                        title={selectedFile.name}
                      >
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="shrink-0 text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || isLoadingContent}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
              >
                {isSubmitting
                  ? "저장 중..."
                  : isExistingReport
                    ? "수정하기"
                    : "제출하기"}
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

      <LeaveScheduleModal
        username={selectedMember}
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
      />
    </div>
  );
}
