import { useState } from "react";
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

export function MyMeetings({ userId, meetings, sessions, spaces, adminBlocks, user, onUpdateSession, onCancelSession }: MyMeetingsProps) {
  const [editingSession, setEditingSession] = useState<EditingSession | undefined>();
  const [pendingCancelSessionId, setPendingCancelSessionId] = useState<string | undefined>();
  const [cancellingSessionId, setCancellingSessionId] = useState<string | undefined>();
  const [cancelError, setCancelError] = useState<string | undefined>();
  const [lastSaveResult, setLastSaveResult] = useState<SaveValidationResult | undefined>();
  const myMeetings = meetings.filter((meeting) => meeting.applicantUserId === userId);
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <h2 className="text-lg font-bold text-[#172014]">내 신청 확인/수정</h2>
      <div className="mt-3 grid gap-3">
        {myMeetings.map((meeting) => {
          const meetingSessions = sessions.filter((session) => session.meetingId === meeting.id && session.status !== "cancelled");
          return (
            <article key={meeting.id} className="rounded-lg border border-[#EBF2E7] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#172014]">{meeting.meetingName}</h3>
                  <p className="text-sm text-[#5B6856]">{meetingSessions.length}개 회차</p>
                </div>
                <span className="rounded-full bg-[#F1F8EC] px-2 py-1 text-xs font-bold text-[#5F9820]">
                  {getMeetingStatusLabel(meeting.status)}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {meetingSessions.map((session) => {
                  const space = spaces.find((item) => item.id === session.spaceId);
                  const isEditing = editingSession?.sessionId === session.id;
                  const editValues = isEditing ? editingSession.values : sessionToEditValues(session);
                  const editSpace = spaces.find((item) => item.id === editValues.spaceId);
                  const editableSpaces = spaces.filter((item) => item.isActive && (item.isPublicVisible || item.id === session.spaceId));
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
                    <div key={session.id} className="rounded-lg bg-[#F7FBF4] p-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[#172014]">
                          {meeting.meetingName} {session.sessionIndex}회차 · {space?.name ?? "공간 없음"} · {session.date} {session.startTime}-{session.endTime}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSession({ sessionId: session.id, values: sessionToEditValues(session) });
                              setLastSaveResult(undefined);
                            }}
                            className="rounded-lg border border-[#DDE8D6] px-2 py-1 text-xs font-bold text-[#5B6856] hover:border-[#77B82A]"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            disabled={cancellingSessionId === session.id}
                            onClick={() => {
                              setPendingCancelSessionId(session.id);
                              setCancelError(undefined);
                            }}
                            className="rounded-lg border border-[#F1C5C2] px-2 py-1 text-xs font-bold text-[#C9443E] hover:bg-[#FCEBEA]"
                          >
                            {cancellingSessionId === session.id ? "취소 중" : "신청 취소"}
                          </button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-3 grid gap-2 rounded-lg border border-[#DDE8D6] bg-white p-3">
                          <select
                            value={editValues.spaceId}
                            onChange={(event) => setEditingSession({ sessionId: session.id, values: { ...editValues, spaceId: event.target.value } })}
                            className="rounded-lg border border-[#DDE8D6] px-3 py-2"
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
                              className="rounded-lg border border-[#DDE8D6] px-3 py-2"
                              aria-label={`${session.sessionIndex}회차 날짜 수정`}
                            >
                              {getCalendarDates().map((date) => (
                                <option key={date} value={date}>{date}</option>
                              ))}
                            </select>
                            <select
                              value={editValues.startTime}
                              onChange={(event) => setEditingSession({ sessionId: session.id, values: { ...editValues, startTime: event.target.value } })}
                              className="rounded-lg border border-[#DDE8D6] px-3 py-2"
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
                              className="rounded-lg bg-[#77B82A] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#5F9820] disabled:bg-[#B9C9AE]"
                            >
                              수정 저장
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSession(undefined);
                                setLastSaveResult(undefined);
                              }}
                              className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-xs font-bold text-[#5B6856]"
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
            void onCancelSession(sessionId).then((result) => {
              setCancellingSessionId(undefined);
              if (result.status === "error") {
                setCancelError(result.message);
              }
            });
          }}
        />
      )}
    </section>
  );
}

function sessionToEditValues(session: ReservationSession): SessionEditValues {
  return {
    spaceId: session.spaceId,
    date: session.date,
    startTime: session.startTime,
  };
}

function ConfirmCancelDialog({ onCancel, onConfirm }: { readonly onCancel: () => void; readonly onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#070A07]/65 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
      <div className="w-full max-w-sm rounded-lg border border-[#DDE8D6] bg-white p-5 shadow-[0_16px_48px_rgba(7,10,7,0.24)]">
        <h3 id="cancel-dialog-title" className="text-lg font-black text-[#172014]">이 신청을 취소하시겠습니까?</h3>
        <p className="mt-2 text-sm leading-6 text-[#5B6856]">이 신청을 취소할까요? 취소된 신청은 목록에서 숨겨지고, 담당자 화면에는 취소됨으로 표시됩니다.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm font-bold text-[#5B6856] hover:border-[#77B82A]"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-[#C9443E] px-3 py-2 text-sm font-extrabold text-white hover:bg-[#A93530]"
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
