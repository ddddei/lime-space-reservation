import { useMemo, useState } from "react";
import { getSessionStatusLabel } from "../lib/displayLabels";
import type { Meeting, ReservationSession, Space } from "../types/reservation";

type AdminReservationTableProps = {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly spaces: readonly Space[];
  readonly onDeleteSession: (sessionId: string) => void;
};

type StatusFilter = ReservationSession["status"] | "all";

type ReservationRow = {
  readonly session: ReservationSession;
  readonly meeting: Meeting | undefined;
  readonly space: Space | undefined;
};

const defaultVisibleCount = 6;

const statusOptions: readonly { readonly value: StatusFilter; readonly label: string }[] = [
  { value: "all", label: "전체 상태" },
  { value: "requested", label: "신청 요청" },
  { value: "confirmed", label: "예약 확정" },
  { value: "cancelled", label: "취소됨" },
];

export function AdminReservationTable({ meetings, sessions, spaces, onDeleteSession }: AdminReservationTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [applicantFilter, setApplicantFilter] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [meetingFilter, setMeetingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const rows = useMemo<readonly ReservationRow[]>(
    () => sessions.map((session) => ({
      session,
      meeting: meetings.find((item) => item.id === session.meetingId),
      space: spaces.find((item) => item.id === session.spaceId),
    })),
    [meetings, sessions, spaces],
  );

  const filteredRows = rows.filter((row) => {
    const applicantKeyword = applicantFilter.trim();
    const meetingKeyword = meetingFilter.trim();
    const applicantMatches = applicantKeyword.length === 0 || row.meeting?.applicantName.includes(applicantKeyword) === true;
    const meetingMatches = meetingKeyword.length === 0 || row.meeting?.meetingName.includes(meetingKeyword) === true;
    const spaceMatches = spaceFilter === "all" || row.session.spaceId === spaceFilter;
    const dateMatches = dateFilter.length === 0 || row.session.date === dateFilter;
    const statusMatches = statusFilter === "all" || row.session.status === statusFilter;
    return applicantMatches && meetingMatches && spaceMatches && dateMatches && statusMatches;
  });
  const visibleRows = showAll ? filteredRows : filteredRows.slice(0, defaultVisibleCount);

  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">전체 신청 목록</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            필터 결과 {filteredRows.length}건 중 {visibleRows.length}건 표시
          </p>
        </div>
        {filteredRows.length > defaultVisibleCount && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-xs font-extrabold text-[#5B6856] hover:border-[#77B82A]"
          >
            {showAll ? "접기" : "더보기"}
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_150px]">
        <input
          value={applicantFilter}
          onChange={(event) => {
            setApplicantFilter(event.target.value);
            setShowAll(false);
          }}
          placeholder="신청자"
          className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm"
        />
        <input
          value={meetingFilter}
          onChange={(event) => {
            setMeetingFilter(event.target.value);
            setShowAll(false);
          }}
          placeholder="모임명"
          className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm"
        />
        <select
          value={spaceFilter}
          onChange={(event) => {
            setSpaceFilter(event.target.value);
            setShowAll(false);
          }}
          className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm"
        >
          <option value="all">전체 공간</option>
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>{space.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value);
            setShowAll(false);
          }}
          className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(toStatusFilter(event.target.value));
            setShowAll(false);
          }}
          className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
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
            {visibleRows.map(({ session, meeting, space }) => {
              return (
                <tr key={session.id} className="border-b border-[#EBF2E7]">
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${session.status === "cancelled" ? "bg-[#FCEBEA] text-[#C9443E]" : "bg-[#F1F8EC] text-[#5F9820]"}`}>
                      {getSessionStatusLabel(session.status)}
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
        {visibleRows.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-[#819078]">조건에 맞는 신청이 없습니다.</p>
        )}
      </div>
    </section>
  );
}

function toStatusFilter(value: string): StatusFilter {
  return statusOptions.find((option) => option.value === value)?.value ?? "all";
}
