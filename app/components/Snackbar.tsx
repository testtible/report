"use client";

import { useEffect } from "react";

export type SnackbarType = "success" | "info" | "warning" | "error";

type Props = {
  isOpen: boolean;
  message: string;
  type?: SnackbarType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
};

export default function Snackbar({
  isOpen,
  message,
  type = "success",
  duration = 3500,
  actionLabel,
  onAction,
  onClose,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const styleConfig = {
    success: {
      bg: "bg-emerald-600/95 border-emerald-500 text-white shadow-emerald-500/20",
      icon: (
        <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      badgeBg: "bg-emerald-500",
    },
    info: {
      bg: "bg-blue-600/95 border-blue-500 text-white shadow-blue-500/20",
      icon: (
        <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badgeBg: "bg-blue-500",
    },
    warning: {
      bg: "bg-amber-600/95 border-amber-500 text-white shadow-amber-500/20",
      icon: (
        <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      badgeBg: "bg-amber-500",
    },
    error: {
      bg: "bg-rose-600/95 border-rose-500 text-white shadow-rose-500/20",
      icon: (
        <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      badgeBg: "bg-rose-500",
    },
  }[type];

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto select-none"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-md ${styleConfig.bg}`}
      >
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-2xs ${styleConfig.badgeBg}`}
        >
          {styleConfig.icon}
        </div>
        <p className="tracking-tight whitespace-nowrap leading-none pr-1">
          {message}
        </p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={() => {
              onAction();
              onClose();
            }}
            className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] sm:text-xs font-bold transition-colors cursor-pointer border border-white/20"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-1 p-0.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="닫기"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
