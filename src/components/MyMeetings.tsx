import { useState } from "react";
import { DEFAULT_RESERVATION_BLOCKS } from "../data/settings";
import { addBlocks, getCalendarDates, getTimeRange } from "../lib/date";
import { validateReservationSave } from "../lib/reservationRules";
import type { AdminBlock, Meeting, ParticipantUser, ReservationSession, SaveValidationResult, Space } from "../types/reservation";

type MyMeetingsProps = {
  readonly userId: string;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly user: ParticipantUser;
  readonly onUpdateSession: (sessionId: string, values: SessionEditValues) => SaveValidationResult;
  readonly onCancelSession: (sessionId: string) => void;
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
                  <p className="text-sm text-[#5B6856]">{meeting.purpose}</p>
                </div>
                <span className="rounded-full bg-[#F1F8EC] px-2 py-1 text-xs font-bold text-[#5F9820]">{meeting.status}</span>
              </div>
              <div className="mt-3 grid gap-2">
                {meetingSessions.map((session) => {
                  const space = spaces.find((item) => item.id === session.spaceId);
                  const isEditing = editingSession?.sessionId === session.id;
                  const editValues = isEditing ? editingSession.values : sessionToEditValues(session);
                  const editSpace = spaces.find((item) => item.id === editValues.spaceId);
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
                          {session.sessionIndex}회차 · {space?.name ?? "공간 없음"} · {session.date} {session.startTime}-{session.endTime}
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
                            onClick={() => onCancelSession(session.id)}
                            className="rounded-lg border border-[#F1C5C2] px-2 py-1 text-xs font-bold text-[#C9443E] hover:bg-[#FCEBEA]"
                          >
                            삭제
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
                            {spaces.filter((item) => item.isActive).map((item) => (
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
                              {getTimeRange().map((time) => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-xs font-bold text-[#5B6856]">
                            변경 예약 시간: {editValues.startTime}-{addBlocks(editValues.startTime, DEFAULT_RESERVATION_BLOCKS)}
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
