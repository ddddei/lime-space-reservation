import type { OperatingHour } from "../types/reservation";

const allDays = [0, 1, 2, 3, 4, 5, 6] as const;

export const createWeeklyHours = (openTime: string, closeTime: string): readonly OperatingHour[] =>
  allDays.map((dayOfWeek) => ({
    dayOfWeek,
    openTime,
    closeTime,
    isClosed: false,
  }));

export const teaPartyHours: readonly OperatingHour[] = [
  { dayOfWeek: 0, openTime: "10:00", closeTime: "19:00", isClosed: false },
  { dayOfWeek: 1, openTime: "00:00", closeTime: "00:00", isClosed: true },
  { dayOfWeek: 2, openTime: "10:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 3, openTime: "10:00", closeTime: "19:00", isClosed: false },
  { dayOfWeek: 4, openTime: "10:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 5, openTime: "10:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 6, openTime: "10:00", closeTime: "21:00", isClosed: false },
];

export const youthBuildingHours = createWeeklyHours("09:00", "21:00");
export const allDayHours = createWeeklyHours("00:00", "24:00");
export const chitChatHours = createWeeklyHours("08:00", "22:00");
