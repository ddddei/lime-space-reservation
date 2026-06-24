import { MAX_DAILY_BLOCKS } from "../data/settings";
import { addBlocks, toMinutes } from "./date";

export type SelectedTimeRange = {
  readonly startTime: string;
  readonly endTime: string;
  readonly blockCount: number;
  readonly durationHours: number;
  readonly label: string;
};

export type ToggleBlockResult = {
  readonly selectedBlockTimes: readonly string[];
  readonly message?: string;
};

export const sortBlockTimes = (times: readonly string[]): readonly string[] =>
  [...times].sort((first, second) => toMinutes(first) - toMinutes(second));

export const getSelectedTimeRange = (selectedBlockTimes: readonly string[]): SelectedTimeRange | undefined => {
  const sortedTimes = sortBlockTimes(selectedBlockTimes);
  if (sortedTimes.length === 0) {
    return undefined;
  }

  const startTime = sortedTimes[0];
  const endTime = addBlocks(sortedTimes[sortedTimes.length - 1], 1);
  const blockCount = sortedTimes.length;
  const durationHours = blockCount / 2;
  return {
    startTime,
    endTime,
    blockCount,
    durationHours,
    label: `${startTime}~${endTime} / ${blockCount}블록 / ${formatDuration(durationHours)}`,
  };
};

export const areContinuousBlocks = (selectedBlockTimes: readonly string[]): boolean => {
  const sortedTimes = sortBlockTimes(selectedBlockTimes);
  return sortedTimes.every((time, index) => index === 0 || addBlocks(sortedTimes[index - 1], 1) === time);
};

export const toggleBlockTime = (currentTimes: readonly string[], time: string): ToggleBlockResult => {
  const hasTime = currentTimes.includes(time);
  const candidate = hasTime ? currentTimes.filter((item) => item !== time) : [...currentTimes, time];

  if (candidate.length > MAX_DAILY_BLOCKS) {
    return {
      selectedBlockTimes: currentTimes,
      message: "하루 최대 4시간(8블록)까지만 선택할 수 있습니다.",
    };
  }

  if (areContinuousBlocks(candidate)) {
    return { selectedBlockTimes: sortBlockTimes(candidate) };
  }

  if (!hasTime) {
    return {
      selectedBlockTimes: [time],
      message: "떨어진 블록을 선택해 새 시간 구간으로 다시 시작했습니다.",
    };
  }

  return {
    selectedBlockTimes: currentTimes,
    message: "선택 시간은 연속되어야 합니다. 양끝 블록부터 해제해 주세요.",
  };
};

const formatDuration = (durationHours: number): string =>
  Number.isInteger(durationHours) ? `${durationHours}시간` : `${Math.floor(durationHours)}시간 30분`;
