import { formatDateLabel } from "../lib/date";
import { maskName, maskPhoneLast4 } from "../lib/masking";
import type { Meeting, ReservationSession, Space } from "../types/reservation";

type PublicReservationListProps = {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
};

export function PublicReservationList({ meetings, sessions, spaces }: PublicReservationListProps) {
  const rows = sessions
    .filter((session) => session.status !== "cancelled")
    .map((session, index) => {
      const meeting = meetings.find((item) => item.id === session.meetingId);
      const space = spaces.find((item) => item.id === session.spaceId);
      return { session, meeting, space, order: index + 1 };
    });
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <h2 className="text-lg font-bold text-[#172014]">공개 예약 현황</h2>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <article key={row.session.id} className="rounded-lg border border-[#EBF2E7] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#172014]">{row.meeting?.meetingName ?? "모임명 없음"}</p>
                <p className="mt-1 text-xs text-[#5B6856]">
                  {row.space?.name ?? "공간 없음"} · {formatDateLabel(row.session.date)} · {row.session.startTime}-{row.session.endTime}
                </p>
                <p className="mt-1 text-xs text-[#819078]">
                  신청자 {maskName(row.meeting?.applicantName ?? "신청자")} {maskPhoneLast4(row.meeting?.phoneLast4 ?? "0000")}
                </p>
              </div>
              <span className="rounded-full bg-[#F1F8EC] px-2 py-1 text-xs font-bold text-[#5F9820]">{row.order}순서</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
