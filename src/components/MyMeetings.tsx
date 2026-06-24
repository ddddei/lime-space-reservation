import type { Meeting, ReservationSession, Space } from "../types/reservation";

type MyMeetingsProps = {
  readonly userId: string;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
  readonly onCancelSession: (sessionId: string) => void;
};

export function MyMeetings({ userId, meetings, sessions, spaces, onCancelSession }: MyMeetingsProps) {
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
                  return (
                    <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F7FBF4] p-2 text-sm">
                      <span className="text-[#172014]">
                        {session.sessionIndex}회차 · {space?.name ?? "공간 없음"} · {session.date} {session.startTime}-{session.endTime}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCancelSession(session.id)}
                        className="rounded-lg border border-[#F1C5C2] px-2 py-1 text-xs font-bold text-[#C9443E] hover:bg-[#FCEBEA]"
                      >
                        삭제
                      </button>
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
