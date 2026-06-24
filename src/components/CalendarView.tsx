import { formatDateLabel, getCalendarDates } from "../lib/date";

type CalendarViewProps = {
  readonly selectedDate: string;
  readonly onSelectDate: (date: string) => void;
};

export function CalendarView({ selectedDate, onSelectDate }: CalendarViewProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#172014]">날짜 선택</h2>
        <span className="text-xs font-bold text-[#819078]">오늘 기준 14일</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {getCalendarDates().map((date) => (
          <button
            type="button"
            key={date}
            onClick={() => onSelectDate(date)}
            className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
              selectedDate === date
                ? "border-[#77B82A] bg-[#E8F5DE] text-[#172014]"
                : "border-[#DDE8D6] bg-white text-[#5B6856] hover:border-[#77B82A]"
            }`}
          >
            <span className="block font-bold">{formatDateLabel(date)}</span>
            <span className="mt-1 block text-xs">{date}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
