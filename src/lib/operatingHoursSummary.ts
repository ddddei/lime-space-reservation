import { getTimeRangeBetween, toMinutes } from "./date";
import type { OperatingHour } from "../types/reservation";

export const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;
export const allDaysOfWeek = [0, 1, 2, 3, 4, 5, 6] as const;

export const customStartTimeOptions = getTimeRangeBetween("00:00", "24:00");
export const customEndTimeOptions = [...customStartTimeOptions.slice(1), "24:00"];

export const isCustomOperatingHoursRangeInvalid = (startTime: string, endTime: string): boolean =>
  toMinutes(endTime) <= toMinutes(startTime);

const defaultStartTime = "09:00";
const defaultEndTime = "21:00";

export type OperatingHoursShape = {
  readonly startTime: string;
  readonly endTime: string;
  readonly closedDays: ReadonlySet<number>;
  /** true면 "공통 시작/종료 시각 + 휴무 요일" 형태로 손실 없이 표현 가능. */
  readonly isUniform: boolean;
};

/**
 * 요일별 운영시간을 "공통 시작/종료 시각 + 휴무 요일" 형태로 환원한다.
 * 요일마다 시간이 달라 환원 불가능하면 isUniform: false와 함께
 * 가장 흔한 시간대를 초기값으로 반환한다(호출부에서 경고 문구를 노출해야 한다).
 */
export const analyzeOperatingHours = (hours: readonly OperatingHour[]): OperatingHoursShape => {
  const closedDays = new Set(hours.filter((hour) => hour.isClosed).map((hour) => hour.dayOfWeek));
  const openDays = hours.filter((hour) => !hour.isClosed);

  if (openDays.length === 0) {
    return { startTime: defaultStartTime, endTime: defaultEndTime, closedDays, isUniform: true };
  }

  const rangeKey = (hour: OperatingHour) => `${hour.openTime}-${hour.closeTime}`;
  const firstRangeKey = rangeKey(openDays[0]);
  const isUniform = openDays.every((hour) => rangeKey(hour) === firstRangeKey);

  if (isUniform) {
    return { startTime: openDays[0].openTime, endTime: openDays[0].closeTime, closedDays, isUniform: true };
  }

  const counts = new Map<string, number>();
  for (const hour of openDays) {
    const key = rangeKey(hour);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let mostCommonKey = firstRangeKey;
  let mostCommonCount = 0;
  for (const [key, count] of counts) {
    if (count > mostCommonCount) {
      mostCommonKey = key;
      mostCommonCount = count;
    }
  }
  const [startTime, endTime] = mostCommonKey.split("-");
  return { startTime, endTime, closedDays, isUniform: false };
};

export const summarizeOperatingHoursLines = (hours: readonly OperatingHour[]): readonly string[] => {
  const shape = analyzeOperatingHours(hours);
  if (shape.isUniform) {
    const closedLabel = shape.closedDays.size > 0
      ? ` (${[...shape.closedDays].sort((first, second) => first - second).map((day) => `${weekdayLabels[day]} 휴무`).join(", ")})`
      : "";
    return [`매일 ${shape.startTime}~${shape.endTime}${closedLabel}`];
  }
  return [...hours]
    .sort((first, second) => first.dayOfWeek - second.dayOfWeek)
    .map((hour) => hour.isClosed ? `${weekdayLabels[hour.dayOfWeek]} 휴무` : `${weekdayLabels[hour.dayOfWeek]} ${hour.openTime}~${hour.closeTime}`);
};

export const buildCustomOperatingHours = (
  startTime: string,
  endTime: string,
  closedDays: ReadonlySet<number>,
): readonly OperatingHour[] =>
  allDaysOfWeek.map((dayOfWeek) =>
    closedDays.has(dayOfWeek)
      ? { dayOfWeek, openTime: "00:00", closeTime: "00:00", isClosed: true }
      : { dayOfWeek, openTime: startTime, closeTime: endTime, isClosed: false },
  );
