import { DEFAULT_RESERVATION_BLOCKS, MAX_DAILY_BLOCKS, MAX_MEETING_SESSIONS } from "../data/settings";
import { addBlocks, getBlockCount, getTimeRange, rangesOverlap, toMinutes } from "./date";
import { getChecklistLabels } from "./permissions";
import type {
  AdminBlock,
  EligibilityResult,
  Meeting,
  ParticipantUser,
  ReservationSession,
  TimeSlot,
} from "../types/reservation";

type SessionContext = {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
};

type SlotContext = {
  readonly spaceId: string;
  readonly date: string;
  readonly selectedStartTime: string;
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
};

export const getUserUsedBlocks = (userId: string, context: SessionContext): number => {
  const meetingIds = context.meetings
    .filter((meeting) => meeting.applicantUserId === userId)
    .map((meeting) => meeting.id);
  return context.sessions
    .filter((session) => meetingIds.includes(session.meetingId) && session.status !== "cancelled")
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
): boolean => sessions.filter((session) => session.meetingId === meetingId && session.status !== "cancelled").length < MAX_MEETING_SESSIONS;

export const hasOtherSpaceOnDate = (
  meetingId: string,
  spaceId: string,
  date: string,
  sessions: readonly ReservationSession[],
): boolean =>
  sessions.some(
    (session) =>
      session.meetingId === meetingId &&
      session.date === date &&
      session.spaceId !== spaceId &&
      session.status !== "cancelled",
  );

export const getConflictingReservation = (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  sessions: readonly ReservationSession[],
): ReservationSession | undefined =>
  sessions.find(
    (session) =>
      session.spaceId === spaceId &&
      session.date === date &&
      session.status !== "cancelled" &&
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

export const canSelectTimeRange = (context: SlotContext): boolean => {
  const endTime = addBlocks(context.selectedStartTime, DEFAULT_RESERVATION_BLOCKS);
  const withinDayLimit = getBlockCount(context.selectedStartTime, endTime) <= MAX_DAILY_BLOCKS;
  const withinOpenHours = toMinutes(endTime) <= toMinutes("21:00");
  return (
    withinDayLimit &&
    withinOpenHours &&
    getConflictingReservation(context.spaceId, context.date, context.selectedStartTime, endTime, context.sessions) ===
      undefined &&
    getConflictingAdminBlock(context.spaceId, context.date, context.selectedStartTime, endTime, context.adminBlocks) ===
      undefined
  );
};

export const getTimeSlots = (context: SlotContext): readonly TimeSlot[] => {
  const selectedEndTime = addBlocks(context.selectedStartTime, DEFAULT_RESERVATION_BLOCKS);
  return getTimeRange().map((time) => {
    const blockEnd = addBlocks(time, 1);
    const reserved = getConflictingReservation(context.spaceId, context.date, time, blockEnd, context.sessions);
    const blocked = getConflictingAdminBlock(context.spaceId, context.date, time, blockEnd, context.adminBlocks);
    const isSelected = rangesOverlap(time, blockEnd, context.selectedStartTime, selectedEndTime);
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
