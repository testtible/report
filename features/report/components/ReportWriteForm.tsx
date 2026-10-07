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

            {/* 관리자 피드백 / 코멘트 배너 */}
            <MasterCommentNotice
              masterComment={state.masterComment}
              isVisible={!!state.selectedMember && !state.isLoadingContent}
              isConfirmMasterComment={state.isConfirmMasterComment}
              isConfirming={state.isConfirmingMasterComment}
              onConfirmMasterComment={actions.handleConfirmMasterComment}
            />

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

            {/* 제출 버튼 */}
            <div className="pt-2">
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
      </div>
    </div>
  );
}
