import { useState } from "react";
import { addBlocks, formatDateLabel, formatDateValue, getTimeRangeBetween } from "../lib/date";
import { getConflictingAdminBlock, getConflictingReservation, getOperatingHoursForDate } from "../lib/reservationRules";
import type { AdminBlock, Meeting, OperatingHour, ReservationSession, Space } from "../types/reservation";

type CalendarViewProps = {
  readonly selectedDate: string;
  readonly selectedSpace: Space;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly onSelectDate: (date: string) => void;
};

type DateMetrics = {
  readonly label: "예약 가능" | "예약 있음" | "예약 불가" | "휴무";
  readonly toneClass: string;
  readonly operatingHours?: OperatingHour;
  readonly totalBlocks: number;
  readonly unavailableBlocks: number;
  readonly reservedMeetingCount: number;
  readonly hasAdminBlock: boolean;
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const seasonMonths = [6, 7] as const;

export function CalendarView(props: CalendarViewProps) {
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(getMonthIndex(props.selectedDate));
  const selectedMetrics = getDateMetrics(props.selectedDate, props.selectedSpace, props.sessions, props.adminBlocks);
  return (
    <section className="ui-card rounded-2xl p-4 md:p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black text-[#5F9820]">날짜 선택</p>
          <h3 className="mt-1 text-xl font-black text-[#172014]">{props.selectedSpace.name}</h3>
        </div>
        <div className="flex rounded-full border border-[#DDE8D6] bg-[#F7FBF4] p-1">
          {seasonMonths.map((monthIndex) => (
            <button
              type="button"
              key={monthIndex}
              onClick={() => setVisibleMonthIndex(monthIndex)}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                visibleMonthIndex === monthIndex ? "bg-[#77B82A] text-white" : "text-[#5B6856] hover:text-[#172014]"
              }`}
            >
              {monthIndex + 1}월
            </button>
          ))}
        </div>
      </div>
      <MonthCalendar monthIndex={visibleMonthIndex} {...props} />
      <SelectedDateSummary
        date={props.selectedDate}
        metrics={selectedMetrics}
        meetings={props.meetings}
        sessions={props.sessions}
        selectedSpaceId={props.selectedSpace.id}
      />
    </section>
  );
}

function MonthCalendar(props: CalendarViewProps & { readonly monthIndex: number }) {
  const dates = getMonthGridDates(2026, props.monthIndex);
  return (
    <div className="rounded-[20px] border border-[#EBF2E7] bg-[#F7FBF4] p-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#819078]">
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {dates.map((date, index) => {
          if (date === undefined) {
            return <div key={`blank-${index}`} className="min-h-14 rounded-xl bg-[#F7FBF4]/60 md:min-h-16" />;
          }
          const metrics = getDateMetrics(date, props.selectedSpace, props.sessions, props.adminBlocks);
          const selected = props.selectedDate === date;
          return (
            <button
              type="button"
              key={date}
              onClick={() => props.onSelectDate(date)}
              className={`min-h-14 rounded-xl border p-2 text-left transition md:min-h-16 ${
                selected ? "border-[#77B82A] bg-[#E8F5DE] ring-2 ring-[#77B82A]/20" : "border-[#DDE8D6] bg-white hover:border-[#77B82A]"
              }`}
              aria-label={`${date} ${metrics.label}`}
            >
              <span className="block text-sm font-black text-[#172014]">{Number(date.slice(8, 10))}</span>
              <span className="mt-2 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${metrics.toneClass}`} aria-hidden="true" />
                {metrics.label !== "예약 가능" && (
                  <span className="truncate text-[10px] font-bold text-[#5B6856]">{shortStatus(metrics.label)}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedDateSummary({
  date,
  metrics,
  meetings,
  sessions,
  selectedSpaceId,
}: {
  readonly date: string;
  readonly metrics: DateMetrics;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly selectedSpaceId: string;
}) {
  const availableBlocks = Math.max(0, metrics.totalBlocks - metrics.unavailableBlocks);
  const operatingText = metrics.operatingHours === undefined || metrics.operatingHours.isClosed
    ? "운영 없음"
    : `${metrics.operatingHours.openTime}-${metrics.operatingHours.closeTime}`;
  const reservedSessions = sessions.filter(
    (session) => session.status !== "cancelled" && session.spaceId === selectedSpaceId && session.date === date,
  );
  return (
    <div className="mt-4 grid gap-3 rounded-[20px] border border-[#DDE8D6] bg-white p-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <SummaryItem label="선택한 날짜" value={formatDateLabel(date)} />
        <SummaryItem label="운영시간" value={operatingText} />
        <SummaryItem label="예약 가능" value={`${availableBlocks / 2}시간`} />
        <SummaryItem label="상태" value={metrics.label} />
      </div>
      {reservedSessions.length > 0 && (
        <div className="rounded-lg bg-[#F7FBF4] p-3">
          <p className="text-xs font-black text-[#5F9820]">이 날 예약된 모임</p>
          <div className="mt-2 grid gap-1.5">
            {reservedSessions.map((session) => {
              const meeting = meetings.find((item) => item.id === session.meetingId);
              return (
                <p key={session.id} className="text-sm font-semibold text-[#172014]">
                  {session.startTime}~{session.endTime} · {meeting?.meetingName ?? "모임명 없음"}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-[#819078]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#172014]">{value}</p>
    </div>
  );
}

function getMonthGridDates(year: number, monthIndex: number): readonly (string | undefined)[] {
  const firstDate = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dates: (string | undefined)[] = Array.from({ length: firstDate.getDay() }, () => undefined);
  for (let day = 1; day <= daysInMonth; day += 1) {
    dates.push(formatDateValue(new Date(year, monthIndex, day)));
  }
  while (dates.length % 7 !== 0) {
    dates.push(undefined);
  }
  return dates;
}

function getDateMetrics(
  date: string,
  space: Space,
  sessions: readonly ReservationSession[],
  adminBlocks: readonly AdminBlock[],
): DateMetrics {
  const operatingHours = getOperatingHoursForDate(date, space.operatingHours);
  if (operatingHours === undefined || operatingHours.isClosed) {
    return createDateMetrics("휴무", "bg-[#819078]", operatingHours, 0, 0, 0, false);
  }

  const blockTimes = getTimeRangeBetween(operatingHours.openTime, operatingHours.closeTime);
  const reservedMeetingCount = sessions.filter((session) => session.status !== "cancelled" && session.spaceId === space.id && session.date === date).length;
  const unavailableBlocks = blockTimes.filter((time) => {
    const blockEnd = addBlocks(time, 1);
    return (
      getConflictingReservation(space.id, date, time, blockEnd, sessions) !== undefined ||
      getConflictingAdminBlock(space.id, date, time, blockEnd, adminBlocks) !== undefined
    );
  }).length;
  const hasAdminBlock = adminBlocks.some((block) => block.isActive && block.spaceId === space.id && block.date === date);

  if (unavailableBlocks >= blockTimes.length) {
    return createDateMetrics("예약 불가", "bg-[#C9443E]", operatingHours, blockTimes.length, unavailableBlocks, reservedMeetingCount, hasAdminBlock);
  }
  if (unavailableBlocks > 0) {
    return createDateMetrics("예약 있음", "bg-[#B76E00]", operatingHours, blockTimes.length, unavailableBlocks, reservedMeetingCount, hasAdminBlock);
  }
  return createDateMetrics("예약 가능", "bg-[#5F9820]", operatingHours, blockTimes.length, unavailableBlocks, reservedMeetingCount, hasAdminBlock);
}

function createDateMetrics(
  label: DateMetrics["label"],
  toneClass: string,
  operatingHours: OperatingHour | undefined,
  totalBlocks: number,
  unavailableBlocks: number,
  reservedMeetingCount: number,
  hasAdminBlock: boolean,
): DateMetrics {
  return { label, toneClass, operatingHours, totalBlocks, unavailableBlocks, reservedMeetingCount, hasAdminBlock };
}

function getMonthIndex(date: string): 6 | 7 {
  return date.slice(5, 7) === "08" ? 7 : 6;
}

function shortStatus(label: DateMetrics["label"]): string {
  switch (label) {
    case "예약 가능":
      return "";
    case "예약 있음":
      return "예약";
    case "예약 불가":
      return "불가";
    case "휴무":
      return "휴무";
  }
}
