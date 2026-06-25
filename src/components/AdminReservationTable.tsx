import { useMemo, useState } from "react";
import { getSessionStatusLabel } from "../lib/displayLabels";
import type { AdminApplication, ReservationSession, Space } from "../types/reservation";

type AdminReservationTableProps = {
  readonly applications: readonly AdminApplication[];
  readonly spaces: readonly Space[];
  readonly readOnly: boolean;
  readonly onDeleteSession: (sessionId: string) => void;
};

type StatusFilter = ReservationSession["status"] | "all";

const defaultVisibleCount = 6;

const statusOptions: readonly { readonly value: StatusFilter; readonly label: string }[] = [
  { value: "all", label: "전체 상태" },
  { value: "requested", label: "신청 요청" },
  { value: "confirmed", label: "예약 확정" },
  { value: "cancelled", label: "취소됨" },
];

export function AdminReservationTable({ applications, spaces, readOnly, onDeleteSession }: AdminReservationTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [applicantFilter, setApplicantFilter] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [meetingFilter, setMeetingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const rows = useMemo<readonly AdminApplication[]>(() => applications, [applications]);

  const filteredRows = rows.filter((row) => {
    const applicantKeyword = applicantFilter.trim();
    const meetingKeyword = meetingFilter.trim();
    const applicantMatches = applicantKeyword.length === 0 || row.applicantName.includes(applicantKeyword);
    const meetingMatches = meetingKeyword.length === 0 || row.meetingName.includes(meetingKeyword);
    const spaceMatches = spaceFilter === "all" || row.spaceId === spaceFilter;
    const dateMatches = dateFilter.length === 0 || row.date === dateFilter;
    const statusMatches = statusFilter === "all" || row.sessionStatus === statusFilter;
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
            {visibleRows.map((application) => {
              return (
                <tr key={application.sessionId} className="border-b border-[#EBF2E7]">
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${application.sessionStatus === "cancelled" ? "bg-[#FCEBEA] text-[#C9443E]" : "bg-[#F1F8EC] text-[#5F9820]"}`}>
                      {getSessionStatusLabel(application.sessionStatus)}
                    </span>
                  </td>
                  <td className="py-3 pr-3 font-bold text-[#172014]">{application.meetingName}</td>
                  <td className="px-3 text-[#5B6856]">
                    {application.applicantName}
                    <span className="block text-xs text-[#819078]">끝자리 {application.phoneLast4 || "없음"}</span>
                  </td>
                  <td className="px-3 font-semibold text-[#172014]">{application.spaceName}</td>
                  <td className="px-3 text-[#5B6856]">{application.date}</td>
                  <td className="px-3 font-semibold text-[#172014]">{application.startTime}-{application.endTime}</td>
                  <td className="px-3 text-[#5B6856]">{application.sessionIndex}</td>
                  <td className="px-3">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => onDeleteSession(application.sessionId)}
                      className="rounded-lg border border-[#F1C5C2] px-2 py-1 text-xs font-bold text-[#C9443E] hover:bg-[#FCEBEA] disabled:cursor-not-allowed disabled:border-[#DDE8D6] disabled:text-[#819078]"
                      title={readOnly ? "Supabase 삭제 연동은 다음 작업에서 처리합니다." : undefined}
                    >
                      {readOnly ? "삭제 미연동" : "삭제"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-[#819078]">아직 신청 내역이 없습니다.</p>
        )}
      </div>
    </section>
  );
}

function toStatusFilter(value: string): StatusFilter {
  return statusOptions.find((option) => option.value === value)?.value ?? "all";
}
