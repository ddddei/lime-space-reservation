import type { Meeting, ReservationSession, Space } from "../types/reservation";

type AdminReservationTableProps = {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
  readonly onDeleteSession: (sessionId: string) => void;
};

export function AdminReservationTable({ meetings, sessions, spaces, onDeleteSession }: AdminReservationTableProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <h2 className="text-lg font-bold text-[#172014]">전체 신청 목록</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#DDE8D6] text-xs text-[#5B6856]">
              <th className="py-2 pr-3">상태</th>
              <th className="py-2 pr-3">모임</th>
              <th className="px-3">신청자</th>
              <th className="px-3">공간</th>
              <th className="px-3">날짜</th>
              <th className="px-3">시간</th>
              <th className="px-3">회차</th>
              <th className="px-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const meeting = meetings.find((item) => item.id === session.meetingId);
              const space = spaces.find((item) => item.id === session.spaceId);
              return (
                <tr key={session.id} className="border-b border-[#EBF2E7]">
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${session.status === "cancelled" ? "bg-[#FCEBEA] text-[#C9443E]" : "bg-[#F1F8EC] text-[#5F9820]"}`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3 font-bold text-[#172014]">{meeting?.meetingName ?? "모임 없음"}</td>
                  <td className="px-3 text-[#5B6856]">
                    {meeting?.applicantName ?? "신청자 없음"}
                    <span className="block text-xs text-[#819078]">끝자리 {meeting?.phoneLast4 ?? "0000"}</span>
                  </td>
                  <td className="px-3 font-semibold text-[#172014]">{space?.name ?? "공간 없음"}</td>
                  <td className="px-3 text-[#5B6856]">{session.date}</td>
                  <td className="px-3 font-semibold text-[#172014]">{session.startTime}-{session.endTime}</td>
                  <td className="px-3 text-[#5B6856]">{session.sessionIndex}</td>
                  <td className="px-3">
                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      className="rounded-lg border border-[#F1C5C2] px-2 py-1 text-xs font-bold text-[#C9443E] hover:bg-[#FCEBEA]"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
