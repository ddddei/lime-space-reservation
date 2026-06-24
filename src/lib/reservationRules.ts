import { DEFAULT_RESERVATION_BLOCKS, MAX_DAILY_BLOCKS, MAX_MEETING_SESSIONS } from "../data/settings";
import { addBlocks, getBlockCount, getDayOfWeek, getTimeRangeBetween, rangesOverlap, toMinutes } from "./date";
import { getChecklistLabels } from "./permissions";
import type {
  AdminBlock,
  EligibilityResult,
  Meeting,
  OperatingHour,
  ParticipantUser,
  ReservationSession,
  SaveValidationResult,
  TimeSlot,
} from "../types/reservation";

type SessionContext = {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
};

type SlotContext = {
  readonly spaceId: string;
  readonly date: string;
  readonly selectedBlockTimes: readonly string[];
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly operatingHours: readonly OperatingHour[];
};

type SaveValidationInput = {
  readonly user: ParticipantUser;
  readonly meetingId: string;
  readonly spaceId: string;
  readonly date: string;
  readonly startTime: string;
  readonly blockCount: number;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly operatingHours: readonly OperatingHour[];
  readonly excludeSessionId?: string;
};

const activeSessions = (
  sessions: readonly ReservationSession[],
  excludeSessionId?: string,
): readonly ReservationSession[] =>
  sessions.filter((session) => session.status !== "cancelled" && session.id !== excludeSessionId);

export const getUserUsedBlocks = (userId: string, context: SessionContext): number => {
  const meetingIds = context.meetings
    .filter((meeting) => meeting.applicantUserId === userId)
    .map((meeting) => meeting.id);
  return activeSessions(context.sessions)
    .filter((session) => meetingIds.includes(session.meetingId))
    .reduce((total, session) => total + session.blockCount, 0);
};

export const getEligibility = (
  user: ParticipantUser,
  context: SessionContext,
  requestedBlocks = DEFAULT_RESERVATION_BLOCKS,
): EligibilityResult => {
  const usedBlocks = getUserUsedBlocks(user.id, context);
  const remainingBlocks = Math.max(0, user.maxBlocks - usedBlocks);
  const missingRequirements = [...getChecklistLabels(user)];
  if (remainingBlocks < requestedBlocks) {
    missingRequirements.push(`Level ${user.level} 신청 가능 블록 초과`);
  }
  return {
    canReserve: missingRequirements.length === 0,
    usedBlocks,
    remainingBlocks,
    missingRequirements,
  };
};

export const hasMeetingSessionCapacity = (
  meetingId: string,
  sessions: readonly ReservationSession[],
  excludeSessionId?: string,
): boolean => activeSessions(sessions, excludeSessionId).filter((session) => session.meetingId === meetingId).length < MAX_MEETING_SESSIONS;

export const hasOtherSpaceOnDate = (
  meetingId: string,
  spaceId: string,
  date: string,
  sessions: readonly ReservationSession[],
  excludeSessionId?: string,
): boolean =>
  activeSessions(sessions, excludeSessionId).some(
    (session) =>
      session.meetingId === meetingId &&
      session.date === date &&
      session.spaceId !== spaceId,
  );

export const getConflictingReservation = (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  sessions: readonly ReservationSession[],
  excludeSessionId?: string,
): ReservationSession | undefined =>
  activeSessions(sessions, excludeSessionId).find(
    (session) =>
      session.spaceId === spaceId &&
      session.date === date &&
      rangesOverlap(startTime, endTime, session.startTime, session.endTime),
  );

export const getConflictingAdminBlock = (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  adminBlocks: readonly AdminBlock[],
): AdminBlock | undefined =>
  adminBlocks.find(
    (block) =>
      block.spaceId === spaceId &&
      block.date === date &&
      block.isActive &&
      rangesOverlap(startTime, endTime, block.startTime, block.endTime),
  );

export const canSelectTimeRange = (
  context: Omit<SlotContext, "selectedBlockTimes"> & { readonly selectedStartTime: string; readonly blockCount?: number },
): boolean => {
  const blockCount = context.blockCount ?? DEFAULT_RESERVATION_BLOCKS;
  const endTime = addBlocks(context.selectedStartTime, blockCount);
  const withinDayLimit = getBlockCount(context.selectedStartTime, endTime) <= MAX_DAILY_BLOCKS;
  const withinOpenHours = isWithinOperatingHours(context.date, context.selectedStartTime, endTime, context.operatingHours);
  return (
    withinDayLimit &&
    withinOpenHours &&
    getConflictingReservation(context.spaceId, context.date, context.selectedStartTime, endTime, context.sessions) ===
      undefined &&
    getConflictingAdminBlock(context.spaceId, context.date, context.selectedStartTime, endTime, context.adminBlocks) ===
      undefined
  );
};

export const getUserDailyBlocks = (
  userId: string,
  date: string,
  meetings: readonly Meeting[],
  sessions: readonly ReservationSession[],
  excludeSessionId?: string,
): number => {
  const meetingIds = meetings.filter((meeting) => meeting.applicantUserId === userId).map((meeting) => meeting.id);
  return activeSessions(sessions, excludeSessionId)
    .filter((session) => meetingIds.includes(session.meetingId) && session.date === date)
    .reduce((total, session) => total + session.blockCount, 0);
};

export const validateReservationSave = (input: SaveValidationInput): SaveValidationResult => {
  const reasons: string[] = [...getChecklistLabels(input.user)];
  const endTime = addBlocks(input.startTime, input.blockCount);
  const currentUsedBlocks = getUserUsedBlocks(input.user.id, {
    meetings: input.meetings,
    sessions: activeSessions(input.sessions, input.excludeSessionId),
  });
  const dailyBlocks = getUserDailyBlocks(
    input.user.id,
    input.date,
    input.meetings,
    input.sessions,
    input.excludeSessionId,
  );

  if (currentUsedBlocks + input.blockCount > input.user.maxBlocks) {
    reasons.push(`Level ${input.user.level} 신청 가능 블록 초과`);
  }
  if (!hasMeetingSessionCapacity(input.meetingId, input.sessions, input.excludeSessionId)) {
    reasons.push("한 모임은 최대 6회차까지 신청 가능");
  }
  if (hasUserOtherSpaceOnDate(input.user.id, input.spaceId, input.date, input.meetings, input.sessions, input.excludeSessionId)) {
    reasons.push("하루에는 하나의 공간만 예약 가능");
  }
  if (dailyBlocks + input.blockCount > MAX_DAILY_BLOCKS) {
    reasons.push("하루 최대 4시간 초과");
  }
  if (!isWithinOperatingHours(input.date, input.startTime, endTime, input.operatingHours)) {
    reasons.push("운영 시간 범위 초과");
  }
  if (getConflictingReservation(input.spaceId, input.date, input.startTime, endTime, input.sessions, input.excludeSessionId) !== undefined) {
    reasons.push("기존 예약과 시간이 겹침");
  }
  if (getConflictingAdminBlock(input.spaceId, input.date, input.startTime, endTime, input.adminBlocks) !== undefined) {
    reasons.push("관리자 차단 일정과 시간이 겹침");
  }

  return {
    canSave: reasons.length === 0,
    reasons,
  };
};

export const hasUserOtherSpaceOnDate = (
  userId: string,
  spaceId: string,
  date: string,
  meetings: readonly Meeting[],
  sessions: readonly ReservationSession[],
  excludeSessionId?: string,
): boolean => {
  const meetingIds = meetings.filter((meeting) => meeting.applicantUserId === userId).map((meeting) => meeting.id);
  return activeSessions(sessions, excludeSessionId).some(
    (session) => meetingIds.includes(session.meetingId) && session.date === date && session.spaceId !== spaceId,
  );
};

export const getTimeSlots = (context: SlotContext): readonly TimeSlot[] => {
  const hours = getOperatingHoursForDate(context.date, context.operatingHours);
  if (hours === undefined || hours.isClosed) {
    return [];
  }
  return getTimeRangeBetween(hours.openTime, hours.closeTime).map((time) => {
    const blockEnd = addBlocks(time, 1);
    const reserved = getConflictingReservation(context.spaceId, context.date, time, blockEnd, context.sessions);
    const blocked = getConflictingAdminBlock(context.spaceId, context.date, time, blockEnd, context.adminBlocks);
    const isSelected = context.selectedBlockTimes.includes(time);
    if (reserved !== undefined) {
      return { time, status: "reserved", label: "예약됨" };
    }
    if (blocked !== undefined) {
      return { time, status: "blocked", label: "관리자 차단" };
    }
    if (isSelected) {
      return { time, status: "selected", label: "선택" };
    }
    return { time, status: "available", label: "가능" };
  });
};

export const getOperatingHoursForDate = (
  date: string,
  operatingHours: readonly OperatingHour[],
): OperatingHour | undefined => {
  const dayOfWeek = getDayOfWeek(date);
  return operatingHours.find((hours) => hours.dayOfWeek === dayOfWeek);
};

export const isWithinOperatingHours = (
  date: string,
  startTime: string,
  endTime: string,
  operatingHours: readonly OperatingHour[],
): boolean => {
  const hours = getOperatingHoursForDate(date, operatingHours);
  if (hours === undefined || hours.isClosed) {
    return false;
  }
  return toMinutes(startTime) >= toMinutes(hours.openTime) && toMinutes(endTime) <= toMinutes(hours.closeTime);
};
