import { useEffect, useState } from "react";
import { CalendarClock, RefreshCw, RotateCcw, X } from "lucide-react";
import { addBlocks, getCalendarDates, getTimeRange } from "../lib/date";
import { getMeetingStatusLabel } from "../lib/displayLabels";
import { validateReservationSave } from "../lib/reservationRules";
import type { SessionActionResult } from "./UserReservationFlow";
import type { AdminBlock, Meeting, ParticipantUser, ReservationSession, SaveValidationResult, Space } from "../types/reservation";

type MyMeetingsProps = {
  readonly userId: string;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly user: ParticipantUser;
  readonly onUpdateSession: (sessionId: string, values: SessionEditValues) => SaveValidationResult;
  readonly onCancelSession: (sessionId: string) => Promise<SessionActionResult>;
  readonly isRefreshing: boolean;
  readonly refreshError?: string;
  readonly onRefresh?: () => Promise<boolean>;
};

export type SessionEditValues = {
  readonly spaceId: string;
  readonly date: string;
  readonly startTime: string;
};

type EditingSession = {
  readonly sessionId: string;
  readonly values: SessionEditValues;
};

export function MyMeetings({
  userId,
  meetings,
  sessions,
  spaces,
  adminBlocks,
  user,
  onUpdateSession,
  onCancelSession,
  isRefreshing,
  refreshError,
  onRefresh,
}: MyMeetingsProps) {
  const [editingSession, setEditingSession] = useState<EditingSession | undefined>();
  const [pendingCancelSessionId, setPendingCancelSessionId] = useState<string | undefined>();
  const [cancellingSessionId, setCancellingSessionId] = useState<string | undefined>();
  const [cancelError, setCancelError] = useState<string | undefined>();
  const [cancelSuccess, setCancelSuccess] = useState<string | undefined>();
  const [showCancelled, setShowCancelled] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState<SaveValidationResult | undefined>();
  const myMeetings = meetings
    .filter((meeting) => meeting.applicantUserId === userId)
    .map((meeting) => ({
      meeting,
      visibleSessions: getVisibleMeetingSessions(meeting.id, sessions, showCancelled),
      activeSessionCount: sessions.filter((session) => session.meetingId === meeting.id && session.status !== "cancelled").length,
    }))
    .filter((item) => item.visibleSessions.length > 0 || (showCancelled && item.meeting.status === "cancelled"))
    .sort((first, second) => second.activeSessionCount - first.activeSessionCount);
  return (
    <section className="ui-card rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">내 신청 확인/수정</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            취소되지 않은 신청을 먼저 표시합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh !== undefined && (
            <button
              type="button"
              onClick={() => {
                setCancelError(undefined);
                setCancelSuccess(undefined);
                void onRefresh();
              }}
              disabled={isRefreshing}
              className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs"
            >
              <RefreshCw size={14} strokeWidth={2.3} className={isRefreshing ? "animate-spin" : undefined} />
              {isRefreshing ? "새로고침 중" : "새로고침"}
            </button>
          )}
          <label className="ui-button ui-button-ghost min-h-9 cursor-pointer px-3 py-2 text-xs">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(event) => setShowCancelled(event.target.checked)}
              className="h-4 w-4 accent-[#77B82A]"
            />
            취소된 신청 보기
          </label>
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        {myMeetings.map(({ meeting, visibleSessions }) => {
          return (
            <article key={meeting.id} className="ui-card-soft rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#172014]">{meeting.meetingName}</h3>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-[#5B6856]">
                    <CalendarClock size={14} strokeWidth={2.3} />
                    {visibleSessions.length}개 회차
                  </p>
                </div>
                <span className="rounded-full bg-[#F1F8EC] px-2 py-1 text-xs font-bold text-[#5F9820]">
                  {getMeetingStatusLabel(meeting.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {visibleSessions.map((session) => {
                  const space = spaces.find((item) => item.id === session.spaceId);
                  const isEditing = editingSession?.sessionId === session.id;
                  const editValues = isEditing ? editingSession.values : sessionToEditValues(session);
                  const editSpace = spaces.find((item) => item.id === editValues.spaceId);
                  const editableSpaces = spaces.filter((item) => item.isActive && (item.isPublicVisible || item.id === session.spaceId));
                  const isCancelled = session.status === "cancelled";
                  const editValidation = validateReservationSave({
                    user,
                    meetingId: meeting.id,
                    spaceId: editValues.spaceId,
                    date: editValues.date,
                    startTime: editValues.startTime,
                    blockCount: session.blockCount,
                    meetings,
                    sessions,
                    adminBlocks,
                    operatingHours: editSpace?.operatingHours ?? [],
                    excludeSessionId: session.id,
                  });
                  return (
                    <div key={session.id} className="rounded-xl bg-[#F7FBF4] p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[#172014]">
                          {meeting.meetingName} {session.sessionIndex}회차 · {space?.name ?? "공간 없음"} · {session.date} {session.startTime}-{session.endTime}
                        </span>
                        {isCancelled ? (
                          <span className="rounded-lg border border-[#F1C5C2] px-2 py-1 text-xs font-bold text-[#C9443E]">취소됨</span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSession({ sessionId: session.id, values: sessionToEditValues(session) });
                                setLastSaveResult(undefined);
                              }}
                              className="ui-button ui-button-ghost min-h-8 px-2 py-1 text-xs"
                            >
                              <RotateCcw size={13} strokeWidth={2.3} />
                              수정
                            </button>
                            <button
                              type="button"
                              disabled={cancellingSessionId === session.id}
                              onClick={() => {
                                setPendingCancelSessionId(session.id);
                                setCancelError(undefined);
                                setCancelSuccess(undefined);
                              }}
                              className="ui-button ui-button-danger min-h-8 px-2 py-1 text-xs"
                            >
                              <X size={13} strokeWidth={2.3} />
                              {cancellingSessionId === session.id ? "취소 중" : "신청 취소"}
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing && (
                        <div className="mt-3 grid gap-2 rounded-xl bg-white p-3">
                          <select
                            value={editValues.spaceId}
                            onChange={(event) => setEditingSession({ sessionId: session.id, values: { ...editValues, spaceId: event.target.value } })}
                            className="ui-input"
                            aria-label={`${session.sessionIndex}회차 공간 수정`}
                          >
                            {editableSpaces.map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <select
                              value={editValues.date}
                              onChange={(event) => setEditingSession({ sessionId: session.id, values: { ...editValues, date: event.target.value } })}
                              className="ui-input"
                              aria-label={`${session.sessionIndex}회차 날짜 수정`}
                            >
                              {getCalendarDates().map((date) => (
                                <option key={date} value={date}>{date}</option>
                              ))}
                            </select>
                            <select
                              value={editValues.startTime}
                              onChange={(event) => setEditingSession({ sessionId: session.id, values: { ...editValues, startTime: event.target.value } })}
                              className="ui-input"
                              aria-label={`${session.sessionIndex}회차 시작 시간 수정`}
                            >
                              {getTimeRange().filter((time) => time.endsWith(":00")).map((time) => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-xs font-bold text-[#5B6856]">
                            변경 예약 시간: {editValues.startTime}-{addBlocks(editValues.startTime, session.blockCount)}
                          </p>
                          {!editValidation.canSave && <ReasonList reasons={editValidation.reasons} />}
                          {lastSaveResult?.canSave === false && <ReasonList reasons={lastSaveResult.reasons} />}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={!editValidation.canSave}
                              onClick={() => {
                                const result = onUpdateSession(session.id, editValues);
                                setLastSaveResult(result);
                                if (result.canSave) {
                                  setEditingSession(undefined);
                                }
                              }}
                              className="ui-button ui-button-primary min-h-9 px-3 py-2 text-xs"
                            >
                              수정 저장
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSession(undefined);
                                setLastSaveResult(undefined);
                              }}
                              className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs"
                            >
                              수정 취소
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
      {myMeetings.length === 0 && (
        <p className="mt-3 rounded-xl bg-[#F7FBF4] p-4 text-center text-sm font-semibold text-[#819078]">
          현재 표시할 신청 내역이 없습니다.
        </p>
      )}
      {cancelSuccess !== undefined && (
        <div className="mt-3 rounded-lg border border-[#DDE8D6] bg-[#F1F8EC] p-3 text-sm text-[#178A46]" role="status">
          <p className="font-bold">예약 신청이 취소되었습니다.</p>
          <p className="mt-1">{cancelSuccess}</p>
        </div>
      )}
      {refreshError !== undefined && (
        <div className="mt-3 rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-3 text-sm text-[#C9443E]" role="alert">
          <p className="font-bold">내 신청 목록 새로고침 실패</p>
          <p className="mt-1">{refreshError}</p>
        </div>
      )}
      {cancelError !== undefined && (
        <div className="mt-3 rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-3 text-sm text-[#C9443E]" role="alert">
          <p className="font-bold">신청 취소 실패</p>
          <p className="mt-1">{cancelError}</p>
        </div>
      )}
      {pendingCancelSessionId !== undefined && (
        <ConfirmCancelDialog
          onCancel={() => setPendingCancelSessionId(undefined)}
          onConfirm={() => {
            const sessionId = pendingCancelSessionId;
            setCancellingSessionId(sessionId);
            setPendingCancelSessionId(undefined);
            void onCancelSession(sessionId).then(async (result) => {
              setCancellingSessionId(undefined);
              if (result.status === "error") {
                setCancelError(result.message);
                return;
              }
              if (onRefresh !== undefined) {
                await onRefresh();
              }
              setCancelSuccess("취소된 시간대는 다시 예약 가능 시간으로 반영됩니다.");
            });
          }}
        />
      )}
    </section>
  );
}

function getVisibleMeetingSessions(
  meetingId: string,
  sessions: readonly ReservationSession[],
  showCancelled: boolean,
): readonly ReservationSession[] {
  return sessions
    .filter((session) => session.meetingId === meetingId && (showCancelled || session.status !== "cancelled"))
    .sort((first, second) => {
      if (first.status !== second.status) {
        return first.status === "cancelled" ? 1 : -1;
      }
      if (first.date !== second.date) {
        return first.date.localeCompare(second.date);
      }
      return first.startTime.localeCompare(second.startTime);
    });
}

function sessionToEditValues(session: ReservationSession): SessionEditValues {
  return {
    spaceId: session.spaceId,
    date: session.date,
    startTime: session.startTime,
  };
}

function ConfirmCancelDialog({ onCancel, onConfirm }: { readonly onCancel: () => void; readonly onConfirm: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="ui-modal-scrim fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title" onMouseDown={onCancel}>
      <div className="ui-modal-panel w-full max-w-sm rounded-2xl p-5" onMouseDown={(event) => event.stopPropagation()}>
        <h3 id="cancel-dialog-title" className="text-lg font-black text-[#172014]">이 신청을 취소하시겠습니까?</h3>
        <p className="mt-2 text-sm leading-6 text-[#5B6856]">이 신청을 취소할까요? 취소된 신청은 목록에서 숨겨지고, 담당자 화면에는 취소됨으로 표시됩니다.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="ui-button ui-button-ghost"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="ui-button ui-button-danger"
          >
            신청 취소
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasonList({ reasons }: { readonly reasons: readonly string[] }) {
  return (
    <div className="rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-2 text-xs text-[#C9443E]">
      <p className="font-bold">수정할 수 없는 이유</p>
      <ul className="mt-1 list-inside list-disc">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}
