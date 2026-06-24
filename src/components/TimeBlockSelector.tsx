import { DEFAULT_RESERVATION_BLOCKS } from "../data/settings";
import { addBlocks } from "../lib/date";
import { canSelectTimeRange, getTimeSlots } from "../lib/reservationRules";
import type { AdminBlock, ReservationSession } from "../types/reservation";

type TimeBlockSelectorProps = {
  readonly spaceId: string;
  readonly date: string;
  readonly selectedStartTime: string;
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly onSelectStartTime: (time: string) => void;
};

const slotClass = (status: string): string => {
  switch (status) {
    case "available":
      return "border-[#DDE8D6] bg-white text-[#172014] hover:border-[#77B82A]";
    case "reserved":
      return "cursor-not-allowed border-[#F1C5C2] bg-[#FCEBEA] text-[#C9443E]";
    case "blocked":
      return "cursor-not-allowed border-[#F2D59B] bg-[#FFF6E3] text-[#B76E00]";
    case "selected":
      return "border-[#77B82A] bg-[#E8F5DE] text-[#172014] ring-2 ring-[#77B82A]/20";
    default:
      return "border-[#DDE8D6] bg-white text-[#172014]";
  }
};

export function TimeBlockSelector(props: TimeBlockSelectorProps) {
  const slots = getTimeSlots(props);
  const selectedEndTime = addBlocks(props.selectedStartTime, DEFAULT_RESERVATION_BLOCKS);
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">시간 선택</h2>
          <p className="text-sm text-[#5B6856]">기본 예약 단위는 1시간이며 내부 계산은 30분 블록입니다.</p>
        </div>
        <span className="rounded-full bg-[#F1F8EC] px-3 py-1 text-sm font-bold text-[#5F9820]">
          선택 {props.selectedStartTime}-{selectedEndTime}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {slots.map((slot) => {
          const selectable =
            slot.status === "available" &&
            canSelectTimeRange({
              spaceId: props.spaceId,
              date: props.date,
              selectedStartTime: slot.time,
              sessions: props.sessions,
              adminBlocks: props.adminBlocks,
            });
          return (
            <button
              type="button"
              key={slot.time}
              disabled={!selectable && slot.status !== "selected"}
              onClick={() => onSelectIfAvailable(slot.time, selectable, props.onSelectStartTime)}
              className={`min-h-16 rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-70 ${slotClass(slot.status)}`}
            >
              <span className="block font-bold">{slot.time}</span>
              <span className="block text-xs">{slot.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-white px-2 py-1 text-[#5B6856] ring-1 ring-[#DDE8D6]">가능</span>
        <span className="rounded-full bg-[#E8F5DE] px-2 py-1 text-[#172014]">선택</span>
        <span className="rounded-full bg-[#FCEBEA] px-2 py-1 text-[#C9443E]">예약됨</span>
        <span className="rounded-full bg-[#FFF6E3] px-2 py-1 text-[#B76E00]">관리자 차단</span>
      </div>
    </section>
  );
}

function onSelectIfAvailable(time: string, selectable: boolean, onSelectStartTime: (time: string) => void): void {
  if (selectable) {
    onSelectStartTime(time);
  }
}
