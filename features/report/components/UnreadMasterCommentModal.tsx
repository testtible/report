import { useState } from "react";
import type { UnreadMasterCommentItem } from "@/features/report/types/report.types";

type Props = {
  isOpen: boolean;
  comments: UnreadMasterCommentItem[];
  onConfirm: (commentId: string) => Promise<void>;
  onReplyUserComment?: (commentId: string, replyText: string) => Promise<void>;
  onClose: () => void;
};

export default function UnreadMasterCommentModal({
  isOpen,
  comments,
  onConfirm,
  onReplyUserComment,
  onClose,
}: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [sentSuccessIds, setSentSuccessIds] = useState<Record<string, boolean>>(
    {},
  );

  if (!isOpen || comments.length === 0) return null;

  const handleConfirmItem = async (commentId: string) => {
    setConfirmingId(commentId);
    try {
      await onConfirm(commentId);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleStartReply = (item: UnreadMasterCommentItem) => {
    setReplyingId(item.id);
    if (replyInputs[item.id] === undefined) {
      setReplyInputs((prev) => ({
        ...prev,
        [item.id]: item.userComment ?? "",
      }));
    }
  };

  const handleCancelReply = () => {
    setReplyingId(null);
  };

  const handleSendReply = async (commentId: string) => {
    const text = (replyInputs[commentId] ?? "").trim();
    if (!text) {
      alert("요청 코멘트 내용을 입력해주세요.");
      return;
    }
    if (!onReplyUserComment) return;

    setIsSendingReply(true);
    try {
      await onReplyUserComment(commentId, text);
      setSentSuccessIds((prev) => ({ ...prev, [commentId]: true }));
      setReplyingId(null);
      onClose();
    } catch {
      alert("요청 코멘트 전송에 실패했습니다.");
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-indigo-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 px-5 sm:px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-base backdrop-blur-xs">
                📢
              </span>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  팀장님의 피드백 코멘트
                </h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  피드백을 확인하고, 필요한 경우 요청 코멘트를 바로 남길 수
                  있습니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="닫기"
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
        </div>

        {/* 본문 코멘트 목록 */}
        <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto space-y-4">
          {comments.map((item) => {
            const isReplying = replyingId === item.id;
            const isSentSuccess = !!sentSuccessIds[item.id];
            const currentReplyText =
              replyInputs[item.id] ?? item.userComment ?? "";

            return (
              <div
                key={item.id}
                className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5">
                      📅 {item.date} 업무 보고
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {item.username} 님 앞
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    미확인
                  </span>
                </div>

                {/* 팀장님 코멘트 내용 */}
                <div className="rounded-lg bg-white/95 border border-indigo-100 p-3.5 shadow-2xs">
                  <p className="text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                    <span>💬</span> 팀장님 말씀:
                  </p>
                  <p className="text-xs sm:text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {item.masterComment}
                  </p>
                </div>

                {/* 이전에 보낸 요청 코멘트가 있을 경우 표시 */}
                {item.userComment && !isReplying && (
                  <div className="rounded-lg bg-blue-50/80 border border-blue-200/80 p-2.5 text-xs text-gray-700">
                    <span className="font-bold text-blue-900 flex items-center gap-1 mb-0.5">
                      <span>↩️</span> 내가 남겼던 요청사항:
                    </span>
                    <p className="whitespace-pre-wrap pl-4 text-gray-800">
                      {item.userComment}
                    </p>
                  </div>
                )}

                {/* 답장 전송 성공 안내 */}
                {isSentSuccess && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <span>✓</span>
                    <span>
                      팀장님께 요청 코멘트가 전송되었습니다. (팀장님 확인 대기)
                    </span>
                  </div>
                )}

                {/* 요청 코멘트 입력창 (열렸을 때) */}
                {isReplying ? (
                  <div className="space-y-2 rounded-xl bg-white border border-blue-200 p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-900 flex items-center gap-1">
                        <span>💬</span> 팀장님께 요청 코멘트 작성
                      </label>
                      <span className="text-[10px] text-gray-400">
                        전송 시 팀장님께 새로운 요청으로 전달됩니다
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={currentReplyText}
                      onChange={(e) =>
                        setReplyInputs((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="팀장님께 다시 전달할 요청사항이나 답변을 적어주세요."
                      className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-blue-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                      disabled={isSendingReply}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelReply}
                        disabled={isSendingReply}
                        className="px-2.5 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendReply(item.id)}
                        disabled={isSendingReply}
                        className="px-3 py-1 text-xs font-bold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isSendingReply ? "전송 중..." : "팀장님께 전송"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 액션 버튼들 (요청 코멘트 남기기 & 확인 완료) */
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartReply(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      <span>💬</span>
                      <span>
                        {item.userComment
                          ? "요청 코멘트 다시 남기기"
                          : "요청 코멘트 남기기"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConfirmItem(item.id)}
                      disabled={confirmingId === item.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
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
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>
                        {confirmingId === item.id
                          ? "확인 처리 중..."
                          : "확인 완료"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-5 sm:px-6 py-3.5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[11px] text-gray-500">
            * 피드백에 대해 요청 코멘트를 남기면 팀장님께 다시 전달됩니다.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
