import { addBlocks, formatDateValue, getTimeRangeBetween } from "../lib/date";
import { getConflictingAdminBlock, getConflictingReservation, getOperatingHoursForDate } from "../lib/reservationRules";
import type { AdminBlock, ReservationSession, Space } from "../types/reservation";

type CalendarViewProps = {
  readonly selectedDate: string;
  readonly selectedSpace: Space;
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly onSelectDate: (date: string) => void;
};

type DateStatus = {
  readonly label: string;
  readonly className: string;
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarView(props: CalendarViewProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">월간 예약 현황</h2>
          <p className="text-sm text-[#5B6856]">{props.selectedSpace.name} 기준 예약 상태입니다.</p>
        </div>
        <span className="rounded-full bg-[#F1F8EC] px-3 py-1 text-xs font-bold text-[#5F9820]">선택일 {props.selectedDate}</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {[6, 7].map((monthIndex) => (
          <MonthCalendar key={monthIndex} monthIndex={monthIndex} {...props} />
        ))}
      </div>
    </section>
  );
}

function MonthCalendar(props: CalendarViewProps & { readonly monthIndex: number }) {
  const dates = getMonthGridDates(2026, props.monthIndex);
  const monthLabel = `${props.monthIndex + 1}월`;
  return (
    <div className="rounded-lg border border-[#EBF2E7] p-3">
      <h3 className="mb-3 text-sm font-extrabold text-[#172014]">{monthLabel}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#819078]">
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {dates.map((date, index) => {
          if (date === undefined) {
            return <div key={`blank-${index}`} className="min-h-20 rounded-lg bg-[#F7FBF4]" />;
          }
          const status = getDateStatus(date, props.selectedSpace, props.sessions, props.adminBlocks);
          const selected = props.selectedDate === date;
          return (
            <button
              type="button"
              key={date}
              onClick={() => props.onSelectDate(date)}
              className={`min-h-20 rounded-lg border p-1.5 text-left transition ${
                selected ? "border-[#77B82A] bg-[#E8F5DE] ring-2 ring-[#77B82A]/20" : "border-[#DDE8D6] bg-white hover:border-[#77B82A]"
              }`}
            >
              <span className="block text-sm font-extrabold text-[#172014]">{Number(date.slice(8, 10))}</span>
              <span className={`mt-2 inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold ${status.className}`}>
                {status.label}
              </span>
            </button>
          );
        })}
      </div>
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

function getDateStatus(
  date: string,
  space: Space,
  sessions: readonly ReservationSession[],
  adminBlocks: readonly AdminBlock[],
): DateStatus {
  const hours = getOperatingHoursForDate(date, space.operatingHours);
  if (hours === undefined || hours.isClosed) {
    return { label: "휴무", className: "bg-[#EEF0EA] text-[#5B6856]" };
  }

  const blockTimes = getTimeRangeBetween(hours.openTime, hours.closeTime);
  if (blockTimes.length === 0) {
    return { label: "휴무", className: "bg-[#EEF0EA] text-[#5B6856]" };
  }

  const unavailableBlocks = blockTimes.filter((time) => {
    const blockEnd = addBlocks(time, 1);
    return (
      getConflictingReservation(space.id, date, time, blockEnd, sessions) !== undefined ||
      getConflictingAdminBlock(space.id, date, time, blockEnd, adminBlocks) !== undefined
    );
  }).length;

  if (unavailableBlocks >= blockTimes.length) {
    return { label: "불가", className: "bg-[#FCEBEA] text-[#C9443E]" };
  }
  if (unavailableBlocks >= Math.ceil(blockTimes.length * 0.6)) {
    return { label: "많음", className: "bg-[#FFF6E3] text-[#B76E00]" };
  }
  if (unavailableBlocks > 0) {
    return { label: "일부", className: "bg-[#E8F5DE] text-[#5F9820]" };
  }
  return { label: "가능", className: "bg-[#F1F8EC] text-[#5F9820]" };
}
