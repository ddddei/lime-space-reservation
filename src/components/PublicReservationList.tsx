import { formatDateLabel } from "../lib/date";
import { maskName, maskPhoneLast4 } from "../lib/masking";
import type { Meeting, ReservationSession, Space } from "../types/reservation";

type PublicReservationListProps = {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
  readonly selectedSpaceId?: string;
  readonly selectedDate?: string;
};

export function PublicReservationList({ meetings, sessions, spaces, selectedSpaceId, selectedDate }: PublicReservationListProps) {
  const publicSpaceIds = new Set(spaces.filter((space) => space.isActive && space.isPublicVisible).map((space) => space.id));
  const rows = sessions
    .filter((session) => session.status !== "cancelled" && publicSpaceIds.has(session.spaceId))
    .map((session, index) => {
      const meeting = meetings.find((item) => item.id === session.meetingId);
      const space = spaces.find((item) => item.id === session.spaceId);
      return { session, meeting, space, order: index + 1 };
    });
  const selectedRows = rows.filter((row) => row.session.spaceId === selectedSpaceId && row.session.date === selectedDate);
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <h2 className="text-lg font-bold text-[#172014]">공개 예약 현황</h2>
      {selectedSpaceId !== undefined && selectedDate !== undefined && (
        <div className="mt-3 rounded-lg bg-[#F7FBF4] p-3">
          <p className="text-sm font-extrabold text-[#172014]">
            선택 조건: {selectedSpace?.name ?? "공간 없음"} · {formatDateLabel(selectedDate)}
          </p>
          {selectedRows.length === 0 ? (
            <p className="mt-1 text-xs font-semibold text-[#5B6856]">이 날짜에 공개 예약된 모임이 없습니다.</p>
          ) : (
            <div className="mt-2 grid gap-2">
              {selectedRows.map((row) => (
                <ReservationRow key={row.session.id} row={row} />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <ReservationRow key={row.session.id} row={row} />
        ))}
      </div>
    </section>
  );
}

type ReservationRowData = {
  readonly session: ReservationSession;
  readonly meeting: Meeting | undefined;
  readonly space: Space | undefined;
  readonly order: number;
};

function ReservationRow({ row }: { readonly row: ReservationRowData }) {
  return (
    <article className="rounded-lg border border-[#EBF2E7] bg-white p-3">
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
  );
}
