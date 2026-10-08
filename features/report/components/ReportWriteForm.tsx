"use client";

import MarkdownView from "@/app/components/MarkdownView";
import LeaveScheduleModal from "@/app/components/LeaveScheduleModal";
import ReportHistoryModal from "@/app/components/ReportHistoryModal";
import ReportAiChatModal from "@/app/components/ReportAiChatModal";
import { useReportForm } from "@/features/report/hooks/useReportForm";
import ReportHeader from "@/features/report/components/ReportHeader";
import ReportMemberSelect from "@/features/report/components/ReportMemberSelect";
import MasterCommentNotice from "@/features/report/components/MasterCommentNotice";
import ReportEditorToolbar from "@/features/report/components/ReportEditorToolbar";
import ReportAttachmentUploader from "@/features/report/components/ReportAttachmentUploader";
import UserCommentEditor from "@/features/report/components/UserCommentEditor";
import UnreadMasterCommentModal from "@/features/report/components/UnreadMasterCommentModal";
import UrgentTaskWidget from "@/features/report/components/UrgentTaskWidget";
import Snackbar from "@/app/components/Snackbar";

export default function ReportWriteForm() {
  const { state, refs, actions } = useReportForm();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 sm:py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* 메인 폼 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-100">
          <form onSubmit={actions.handleSubmit} className="space-y-6">
            {/* 날짜 선택 헤더 */}
            <ReportHeader
              selectedDate={state.selectedDate}
              editableDates={state.editableDates}
              selectedMember={state.selectedMember}
              onSelectDate={actions.setSelectedDate}
              onOpenLeaveModal={() => actions.setLeaveModalOpen(true)}
              onOpenAiChatModal={() => actions.setAiChatModalOpen(true)}
            />

            {/* 팀원 선택 */}
            <ReportMemberSelect
              selectedMember={state.selectedMember}
              memberList={state.memberList}
              onSelectMember={actions.setSelectedMember}
              onOpenHistoryModal={() => actions.setHistoryModalOpen(true)}
            />

            {/* 최근 5일 미확인 팀장님 피드백 코멘트 다시 열기 배너 */}
            {state.selectedMember &&
              state.unreadMasterComments.length > 0 &&
              !state.isLoadingContent && (
                <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/95 via-purple-50/70 to-blue-50/90 p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-xs sm:text-sm shadow-2xs">
                      📢
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-indigo-950 truncate">
                        팀장님의 미확인 피드백 코멘트가 {state.unreadMasterComments.length}건 있습니다
                      </p>
                      <p className="text-[11px] text-indigo-700 hidden sm:block">
                        피드백 내용을 모아보고 필요한 경우 요청 코멘트를 바로 남길 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => actions.setIsUnreadModalOpen(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>내용 확인하기</span>
                    <span>→</span>
                  </button>
                </div>
              )}

            {/* 관리자 피드백 / 코멘트 배너 */}
            <MasterCommentNotice
              masterComment={state.masterComment}
              isVisible={!!state.selectedMember && !state.isLoadingContent}
              isConfirmMasterComment={state.isConfirmMasterComment}
              isConfirming={state.isConfirmingMasterComment}
              onConfirmMasterComment={actions.handleConfirmMasterComment}
            />

            {/* 마감 임박 업무 위젯 (D-3 이내 및 지연 업무) */}
            {state.selectedMember && !state.isLoadingContent && (
              <UrgentTaskWidget
                tasks={state.urgentTasks}
                isLoading={state.isLoadingUrgentTasks}
                selectedMember={state.selectedMember}
                errorMessage={state.urgentTasksError}
                onRetry={() =>
                  actions.loadUrgentTasks(
                    state.selectedMember,
                    state.selectedDate,
                  )
                }
                onInsertToContent={actions.handleInsertUrgentTask}
              />
            )}

            {/* 임시 저장본(로컬 백업) 복원 안내 배너 */}
            {state.draftBackup && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>💾</span> 미저장 임시 저장본이 발견되었습니다
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      이전에 작성 중이던 내용({state.draftBackup.savedAt} 자동
                      저장됨)이 있습니다. 불러오시겠습니까?
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={actions.handleRestoreDraft}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      불러오기
                    </button>
                    <button
                      type="button"
                      onClick={actions.handleDiscardDraft}
                      className="px-2 py-1 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 rounded-md transition-colors cursor-pointer"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 보고 내용 작성 영역 */}
            <div>
              <div className="mb-2">
                <ReportEditorToolbar
                  activeTab={state.activeTab}
                  onTabChange={actions.setActiveTab}
                  onInsertFormat={actions.insertFormat}
                  onInsertTemplate={actions.insertTemplate}
                  onRefineWithAi={actions.refineWithAi}
                  onUndoRefine={actions.undoRefine}
                  hasPrevRefineContent={state.hasPrevRefineContent}
                  isRefiningAi={state.isRefiningAi}
                  selectedMember={state.selectedMember}
                  hasContent={!!state.reportContent.trim()}
                  isLoadingContent={state.isLoadingContent}
                  lastSavedTime={state.lastSavedTime}
                  isExistingReport={state.isExistingReport}
                />
              </div>

              {state.activeTab === "write" ? (
                <textarea
                  ref={refs.textareaRef}
                  id="content"
                  rows={12}
                  value={state.reportContent}
                  onChange={(e) => actions.setReportContent(e.target.value)}
                  placeholder={
                    state.selectedMember
                      ? "오늘 진행한 업무 내용을 마크다운으로 작성해주세요."
                      : "팀원을 먼저 선택해주세요."
                  }
                  disabled={!state.selectedMember || state.isLoadingContent}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-y text-gray-900 font-sans text-sm leading-relaxed disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400"
                />
              ) : (
                <div className="w-full min-h-[288px] max-h-[500px] overflow-y-auto px-5 py-4 border border-gray-300 rounded-xl bg-gray-50/50 text-sm leading-relaxed">
                  {state.reportContent.trim() ? (
                    <MarkdownView content={state.reportContent} />
                  ) : (
                    <p className="text-gray-400 text-center py-12">
                      작성된 내용이 없습니다.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 첨부파일 영역 */}
            <ReportAttachmentUploader
              selectedFile={state.selectedFile}
              existingAttachmentName={state.existingAttachmentName}
              existingAttachmentSize={state.existingAttachmentSize}
              removeAttachment={state.removeAttachment}
              fileInputRef={refs.fileInputRef}
              onFileChange={actions.handleFileChange}
              onRemoveNewFile={actions.handleRemoveNewFile}
              onToggleRemoveExisting={actions.setRemoveAttachment}
              disabled={!state.selectedMember || state.isLoadingContent}
            />

            {/* 팀장님께 요청 코멘트 작성 섹션 */}
            {state.selectedMember && !state.isLoadingContent && (
              <UserCommentEditor
                userComment={state.userComment}
                isUserComment={state.isUserComment}
                disabled={state.isSubmitting}
                onSaveUserComment={actions.handleSaveUserComment}
              />
            )}

            {/* 제출 버튼 */}
            <div>
              <button
                type="submit"
                disabled={
                  state.isSubmitting ||
                  !state.selectedMember ||
                  state.isLoadingContent
                }
                className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-base"
              >
                {state.isSubmitting
                  ? "제출 중..."
                  : state.isExistingReport
                    ? "수정하기"
                    : "제출하기"}
              </button>
            </div>
          </form>
        </div>

        {/* 모달 렌더링 */}
        <ReportHistoryModal
          username={state.selectedMember}
          isOpen={state.historyModalOpen}
          onClose={() => actions.setHistoryModalOpen(false)}
        />
        <LeaveScheduleModal
          username={state.selectedMember}
          isOpen={state.leaveModalOpen}
          onClose={() => actions.setLeaveModalOpen(false)}
        />
        <ReportAiChatModal
          isOpen={state.aiChatModalOpen}
          onClose={() => actions.setAiChatModalOpen(false)}
          targetMember={state.selectedMember || null}
        />

        {/* 최근 5일 미확인 관리자 코멘트 팝업 모달 */}
        <UnreadMasterCommentModal
          isOpen={state.isUnreadModalOpen}
          comments={state.unreadMasterComments}
          onConfirm={actions.handleConfirmUnreadMasterComment}
          onReplyUserComment={actions.handleReplyUserComment}
          onClose={() => actions.setIsUnreadModalOpen(false)}
        />

        {/* 안내 스낵바 알림 */}
        <Snackbar
          isOpen={state.snackbar.isOpen}
          message={state.snackbar.message}
          type={state.snackbar.type}
          actionLabel={state.snackbar.actionLabel}
          onAction={state.snackbar.onAction}
          onClose={actions.closeSnackbar}
        />
      </div>
    </div>
  );
}
