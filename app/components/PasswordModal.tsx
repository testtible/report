"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  targetName?: string;
  targetSubtext?: string;
  targetType?: "member" | "team";
};

export default function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
  title = "비밀번호 확인",
  description,
  targetName,
  targetSubtext,
  targetType = "member",
}: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때 상태 초기화 및 자동 포커스
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setShowPassword(false);
      // 살짝 지연 후 포커스 (애니메이션/렌더링 타이밍 고려)
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC 키 닫기 이벤트 핸들러
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const expectedPw = process.env.NEXT_PUBLIC_MEMBER_PW ?? "";
    const inputPw = password.trim();

    // 비밀번호 검증 (공백 허용 및 트림 비교 모두 고려)
    if (password === expectedPw || (expectedPw && inputPw === expectedPw)) {
      setPassword("");
      setError("");
      onSuccess();
    } else {
      setError("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
      inputRef.current?.select();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm shadow-2xs font-bold">
              🔒
            </span>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
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

        {/* 모달 본문 */}
        <div className="p-6 space-y-4">
          {/* 대상 정보 요약 카드 (팀원/팀 정보) */}
          {targetName && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm shadow-2xs ${
                    targetType === "member"
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600"
                      : "bg-gradient-to-br from-blue-600 to-indigo-600"
                  }`}
                >
                  {targetType === "member" ? targetName.slice(0, 1) : "👥"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-gray-900 truncate">
                    {targetName}
                  </p>
                  {targetSubtext && (
                    <p className="text-xs text-indigo-900/70 font-medium truncate mt-0.5">
                      {targetSubtext}
                    </p>
                  )}
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-700">
                {targetType === "member" ? "작성자 선택" : "팀 조회"}
              </span>
            </div>
          )}

          <p className="text-xs text-gray-500 leading-relaxed text-center">
            {description ||
              "해당 페이지로 이동하려면 비밀번호를 입력해주세요."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="auth-password-input"
                className="block text-xs font-semibold text-gray-700"
              >
                비밀번호
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  title={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showPassword ? (
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
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {error && (
                <p className="text-xs font-medium text-red-600 flex items-center gap-1 pt-1 animate-in fade-in">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              )}
            </div>

            {/* 버튼 영역 */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer"
              >
                확인
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
