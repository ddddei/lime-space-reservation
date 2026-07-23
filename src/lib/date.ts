import { BLOCK_MINUTES, CLOSE_TIME, OPEN_TIME } from "../data/settings";

const minutesPerHour = 60;

export const toMinutes = (time: string): number => {
  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  return hour * minutesPerHour + minute;
};

export const toTime = (minutes: number): string => {
  const hour = Math.floor(minutes / minutesPerHour);
  const minute = minutes % minutesPerHour;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const addBlocks = (time: string, blockCount: number): string =>
  toTime(toMinutes(time) + blockCount * BLOCK_MINUTES);

export const getBlockCount = (startTime: string, endTime: string): number =>
  Math.max(0, (toMinutes(endTime) - toMinutes(startTime)) / BLOCK_MINUTES);

export const getTimeRange = (): readonly string[] => {
  return getTimeRangeBetween(OPEN_TIME, CLOSE_TIME);
};

export const getTimeRangeBetween = (openTime: string, closeTime: string): readonly string[] => {
  const slots: string[] = [];
  for (let minute = toMinutes(openTime); minute < toMinutes(closeTime); minute += BLOCK_MINUTES) {
    slots.push(toTime(minute));
  }
  return slots;
};

export const rangesOverlap = (
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean => toMinutes(firstStart) < toMinutes(secondEnd) && toMinutes(secondStart) < toMinutes(firstEnd);

export const formatDateLabel = (date: string): string =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00+09:00`));

const kstTodayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const getTodayDateValue = (): string => kstTodayFormatter.format(new Date());

export const getCalendarDates = (baseDate = getTodayDateValue(), days = 183): readonly string[] => {
  const dates: string[] = [];
  const base = new Date(`${baseDate}T00:00:00+09:00`);
  for (let index = 0; index < days; index += 1) {
    const next = new Date(base);
    next.setDate(base.getDate() + index);
    dates.push(formatDateValue(next));
  }
  return dates;
};

export const getDayOfWeek = (date: string): number => new Date(`${date}T00:00:00+09:00`).getDay();

export const formatDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
