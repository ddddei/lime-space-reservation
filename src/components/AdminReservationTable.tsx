import { useEffect, useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { getSessionStatusLabel } from "../lib/displayLabels";
import type { AdminApplication, ReservationSession, Space } from "../types/reservation";

type AdminReservationTableProps = {
  readonly applications: readonly AdminApplication[];
  readonly spaces: readonly Space[];
  readonly isRefreshing: boolean;
  readonly refreshError?: string;
  readonly onRefresh: () => void;
  readonly onCancelSession: (sessionId: string) => Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }>;
};

type StatusFilter = ReservationSession["status"] | "all";

const defaultVisibleCount = 6;

const statusOptions: readonly { readonly value: StatusFilter; readonly label: string }[] = [
  { value: "all", label: "전체 상태" },
  { value: "requested", label: "신청 요청" },
  { value: "confirmed", label: "예약 확정" },
  { value: "cancelled", label: "취소됨" },
];

export function AdminReservationTable({
  applications,
  spaces,
  isRefreshing,
  refreshError,
  onRefresh,
  onCancelSession,
}: AdminReservationTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [applicantFilter, setApplicantFilter] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [meetingFilter, setMeetingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingCancel, setPendingCancel] = useState<AdminApplication | undefined>();
  const [cancellingSessionId, setCancellingSessionId] = useState<string | undefined>();
  const [cancelError, setCancelError] = useState<string | undefined>();
  const [cancelSuccess, setCancelSuccess] = useState<string | undefined>();

  const rows = useMemo<readonly AdminApplication[]>(
    () => [...applications].sort(compareApplications),
    [applications],
  );

  const filteredRows = rows.filter((row) => {
    const applicantKeyword = applicantFilter.trim();
    const meetingKeyword = meetingFilter.trim();
    const applicantMatches = applicantKeyword.length === 0 || row.applicantName.includes(applicantKeyword);
    const meetingMatches = meetingKeyword.length === 0 || row.meetingName.includes(meetingKeyword);
    const spaceMatches = spaceFilter === "all" || row.spaceId === spaceFilter;
    const dateMatches = dateFilter.length === 0 || row.date === dateFilter;
    const statusMatches = statusFilter === "all" ? row.sessionStatus !== "cancelled" : row.sessionStatus === statusFilter;
    return applicantMatches && meetingMatches && spaceMatches && dateMatches && statusMatches;
  });
  const visibleRows = showAll ? filteredRows : filteredRows.slice(0, defaultVisibleCount);

  return (
    <section className="ui-card min-w-0 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">전체 신청 목록</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            필터 결과 {filteredRows.length}건 중 {visibleRows.length}건 표시
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs"
          >
            <RefreshCw size={14} strokeWidth={2.3} className={isRefreshing ? "animate-spin" : undefined} />
            {isRefreshing ? "새로고침 중" : "새로고침"}
          </button>
          {filteredRows.length > defaultVisibleCount && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs"
            >
              {showAll ? "접기" : "더보기"}
            </button>
          )}
        </div>
      </div>
      {refreshError !== undefined && (
        <div className="mt-3 rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-3 text-sm text-[#C9443E]" role="alert">
          <p className="font-bold">새로고침 실패</p>
          <p className="mt-1">{refreshError}</p>
        </div>
      )}
      {cancelError !== undefined && (
        <div className="mt-3 rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-3 text-sm text-[#C9443E]" role="alert">
          <p className="font-bold">신청 취소 실패</p>
          <p className="mt-1">{cancelError}</p>
        </div>
      )}
      {cancelSuccess !== undefined && (
        <div className="mt-3 rounded-lg border border-[#DDE8D6] bg-[#F1F8EC] p-3 text-sm text-[#178A46]" role="status">
          <p className="font-bold">예약 신청이 취소되었습니다.</p>
          <p className="mt-1">{cancelSuccess}</p>
        </div>
      )}
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_150px]">
        <input
          value={applicantFilter}
          onChange={(event) => {
            setApplicantFilter(event.target.value);
            setShowAll(false);
          }}
          placeholder="신청자"
          className="ui-input text-sm"
        />
        <input
          value={meetingFilter}
          onChange={(event) => {
            setMeetingFilter(event.target.value);
            setShowAll(false);
          }}
          placeholder="모임명"
          className="ui-input text-sm"
        />
        <select
          value={spaceFilter}
          onChange={(event) => {
            setSpaceFilter(event.target.value);
            setShowAll(false);
          }}
          className="ui-input text-sm"
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
          className="ui-input text-sm"
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(toStatusFilter(event.target.value));
            setShowAll(false);
          }}
          className="ui-input text-sm"
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
              const isCancelled = application.sessionStatus === "cancelled";
              const isCancelling = cancellingSessionId === application.sessionId;
              return (
                <tr key={application.sessionId} className="border-b border-[#EBF2E7]">
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${isCancelled ? "bg-[#FCEBEA] text-[#C9443E]" : "bg-[#F1F8EC] text-[#5F9820]"}`}>
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
                      disabled={application.sessionStatus === "cancelled" || cancellingSessionId === application.sessionId}
                      onClick={() => {
                        setPendingCancel(application);
                        setCancelError(undefined);
                        setCancelSuccess(undefined);
                      }}
                      className="ui-button ui-button-danger min-h-8 px-2 py-1 text-xs"
                    >
                      <X size={13} strokeWidth={2.3} />
                      {isCancelling ? "취소 중" : isCancelled ? "취소됨" : "취소"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-[#819078]">현재 표시할 신청 내역이 없습니다.</p>
        )}
      </div>
      {pendingCancel !== undefined && (
        <ConfirmCancelDialog
          application={pendingCancel}
          onClose={() => setPendingCancel(undefined)}
          onConfirm={() => {
            const sessionId = pendingCancel.sessionId;
            setPendingCancel(undefined);
            setCancellingSessionId(sessionId);
            void onCancelSession(sessionId).then((result) => {
              setCancellingSessionId(undefined);
              if (result.status === "error") {
                setCancelError(result.message);
                return;
              }
              setCancelSuccess("전체 신청 목록을 최신 상태로 다시 불러왔습니다.");
            });
          }}
        />
      )}
    </section>
  );
}

function toStatusFilter(value: string): StatusFilter {
  return statusOptions.find((option) => option.value === value)?.value ?? "all";
}

function compareApplications(first: AdminApplication, second: AdminApplication): number {
  if (first.sessionStatus !== second.sessionStatus) {
    return first.sessionStatus === "cancelled" ? 1 : -1;
  }
  if (first.date !== second.date) {
    return second.date.localeCompare(first.date);
  }
  return first.startTime.localeCompare(second.startTime);
}

function ConfirmCancelDialog({
  application,
  onClose,
  onConfirm,
}: {
  readonly application: AdminApplication;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="ui-modal-scrim fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="admin-cancel-dialog-title" onMouseDown={onClose}>
      <div className="ui-modal-panel w-full max-w-sm rounded-2xl p-5" onMouseDown={(event) => event.stopPropagation()}>
        <h3 id="admin-cancel-dialog-title" className="text-lg font-black text-[#172014]">신청 취소</h3>
        <p className="mt-2 text-sm leading-6 text-[#5B6856]">
          {application.meetingName} · {application.spaceName} · {application.date} {application.startTime}-{application.endTime} 신청을 취소할까요?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
