import { useState } from "react";
import { addBlocks } from "../lib/date";
import { getOperatingHoursForDate, getTimeSlots } from "../lib/reservationRules";
import { getHourBlockTimes, getSelectedTimeRange, toggleHourSlot } from "../lib/timeSelection";
import type { AdminBlock, OperatingHour, ReservationSession, TimeSlotStatus } from "../types/reservation";

type TimeBlockSelectorProps = {
  readonly spaceId: string;
  readonly date: string;
  readonly selectedBlockTimes: readonly string[];
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly operatingHours: readonly OperatingHour[];
  readonly onChangeSelectedBlockTimes: (times: readonly string[]) => void;
};

type HourSlot = {
  readonly startTime: string;
  readonly endTime: string;
  readonly status: TimeSlotStatus;
  readonly label: string;
};

const slotClass = (status: TimeSlotStatus): string => {
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
  const [selectionMessage, setSelectionMessage] = useState<string | undefined>();
  const slots = getHourlySlots(getTimeSlots(props));
  const hours = getOperatingHoursForDate(props.date, props.operatingHours);
  const selectedRange = getSelectedTimeRange(props.selectedBlockTimes);
  return (
    <section className="ui-card rounded-2xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">시간 선택</h2>
          <p className="text-sm text-[#5B6856]">
            {hours === undefined || hours.isClosed
              ? "선택한 날짜는 이 공간의 운영일이 아닙니다."
              : `운영시간 ${hours.openTime}-${hours.closeTime}`}
          </p>
        </div>
        <span className="rounded-full bg-[#F1F8EC] px-3 py-1 text-sm font-bold text-[#5F9820]">
          {selectedRange === undefined ? "시간 미선택" : selectedRange.label}
        </span>
      </div>
      <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
        {slots.map((slot) => {
          const selectable = slot.status === "available" || slot.status === "selected";
          return (
            <button
              type="button"
              key={slot.startTime}
              disabled={!selectable}
              onClick={() => {
                const result = toggleHourSlot(props.selectedBlockTimes, slot.startTime);
                props.onChangeSelectedBlockTimes(result.selectedBlockTimes);
                setSelectionMessage(result.message);
              }}
              className={`min-h-16 rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-70 ${slotClass(slot.status)}`}
            >
              <span className="block text-lg font-black">{slot.startTime}</span>
              <span className="block text-xs font-bold">{slot.label}</span>
            </button>
          );
        })}
      </div>
      {slots.length === 0 && (
        <div className="rounded-lg border border-[#F2D59B] bg-[#FFF6E3] p-3 text-sm font-semibold text-[#B76E00]">
          선택한 날짜에는 운영시간이 없어 예약할 수 없습니다.
        </div>
      )}
      {selectedRange !== undefined && (
        <div className="mt-3 rounded-lg bg-[#F7FBF4] p-3 text-sm font-semibold text-[#172014]">
          {selectedRange.label}
        </div>
      )}
      {selectionMessage !== undefined && (
        <div className="mt-3 rounded-lg border border-[#F2D59B] bg-[#FFF6E3] p-3 text-sm font-semibold text-[#B76E00]">
          {selectionMessage}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-white px-2 py-1 text-[#5B6856] ring-1 ring-[#DDE8D6]">선택 가능</span>
        <span className="rounded-full bg-[#E8F5DE] px-2 py-1 text-[#172014]">선택됨</span>
        <span className="rounded-full bg-[#FCEBEA] px-2 py-1 text-[#C9443E]">예약됨</span>
        <span className="rounded-full bg-[#FFF6E3] px-2 py-1 text-[#B76E00]">예약 불가</span>
      </div>
    </section>
  );
}

function getHourlySlots(slots: readonly { readonly time: string; readonly status: TimeSlotStatus }[]): readonly HourSlot[] {
  const slotsByTime = new Map(slots.map((slot) => [slot.time, slot]));
  return slots
    .filter((slot) => Number(slot.time.slice(3, 5)) === 0)
    .map((slot) => {
      const hourBlockTimes = getHourBlockTimes(slot.time);
      const blockSlots = hourBlockTimes.map((time) => slotsByTime.get(time));
      const isCompleteHour = blockSlots.every((blockSlot) => blockSlot !== undefined);
      if (!isCompleteHour) {
        return undefined;
      }
      const statuses = blockSlots.map((blockSlot) => blockSlot?.status);
      const status = getHourStatus(statuses);
      return {
        startTime: slot.time,
        endTime: addBlocks(slot.time, 2),
        status,
        label: getHourLabel(status),
      };
    })
    .filter((slot): slot is HourSlot => slot !== undefined);
}

function getHourStatus(statuses: readonly (TimeSlotStatus | undefined)[]): TimeSlotStatus {
  if (statuses.includes("reserved")) {
    return "reserved";
  }
  if (statuses.includes("blocked")) {
    return "blocked";
  }
  if (statuses.every((status) => status === "selected")) {
    return "selected";
  }
  return "available";
}

function getHourLabel(status: TimeSlotStatus): string {
  switch (status) {
    case "available":
      return "선택 가능";
    case "reserved":
      return "예약됨";
    case "blocked":
      return "예약 불가";
    case "selected":
      return "선택됨";
  }
}
