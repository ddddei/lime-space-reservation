import type { UserLevel } from "../types/reservation";

export const BLOCK_MINUTES = 30;
export const DEFAULT_RESERVATION_BLOCKS = 2;
export const MAX_DAILY_BLOCKS = 8;
export const MAX_MEETING_SESSIONS = 6;
export const OPEN_TIME = "09:00";
export const CLOSE_TIME = "21:00";

export const LEVEL_MAX_BLOCKS: Record<UserLevel, number> = {
  1: 16,
  2: 48,
};
