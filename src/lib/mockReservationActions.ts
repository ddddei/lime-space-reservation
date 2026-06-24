import { DEFAULT_RESERVATION_BLOCKS } from "../data/settings";
import { addBlocks } from "./date";
import { getEligibility, hasUserOtherSpaceOnDate, validateReservationSave } from "./reservationRules";
import type {
  AdminBlock,
  EligibilityResult,
  Meeting,
  ParticipantUser,
  ReservationSession,
  SaveValidationResult,
  Space,
} from "../types/reservation";

export type SessionEditValues = {
  readonly spaceId: string;
  readonly date: string;
  readonly startTime: string;
};

export type CreateReservationInput = {
  readonly selectedUser: ParticipantUser;
  readonly selectedSpace: Space;
  readonly selectedDate: string;
  readonly selectedStartTime: string;
  readonly selectedBlockCount: number;
  readonly meetingName: string;
  readonly purpose: string;
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
};

export type CreateReservationChange = {
  readonly validation: SaveValidationResult;
  readonly meeting?: Meeting;
  readonly session?: ReservationSession;
};

export type UpdateSessionInput = {
  readonly sessionId: string;
  readonly values: SessionEditValues;
  readonly selectedUser: ParticipantUser;
  readonly spaces: readonly Space[];
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly adminBlocks: readonly AdminBlock[];
};

export const buildEligibility = (
  user: ParticipantUser,
  meetings: readonly Meeting[],
  sessions: readonly ReservationSession[],
  selectedDate: string,
  selectedSpaceId: string,
  requestedBlocks = DEFAULT_RESERVATION_BLOCKS,
): EligibilityResult => {
  const base = getEligibility(user, { meetings, sessions }, requestedBlocks);
  const hasDifferentSpaceOnDate = hasUserOtherSpaceOnDate(user.id, selectedSpaceId, selectedDate, meetings, sessions);
  const missingRequirements = hasDifferentSpaceOnDate ? [...base.missingRequirements, "하루에는 하나의 공간만 예약 가능"] : base.missingRequirements;
  return {
    ...base,
    canReserve: base.canReserve && !hasDifferentSpaceOnDate,
    missingRequirements,
  };
};

export const validateCurrentSelection = (input: CreateReservationInput): SaveValidationResult => {
  const existingMeeting = findExistingMeeting(input);
  return validateReservationSave({
    user: input.selectedUser,
    meetingId: existingMeeting?.id ?? "new-meeting",
    spaceId: input.selectedSpace.id,
    date: input.selectedDate,
    startTime: input.selectedStartTime,
    blockCount: input.selectedBlockCount,
    meetings: input.meetings,
    sessions: input.sessions,
    adminBlocks: input.adminBlocks,
    operatingHours: input.selectedSpace.operatingHours,
  });
};

export const prepareReservationCreate = (input: CreateReservationInput): CreateReservationChange => {
  const now = new Date().toISOString();
  const existingMeeting = findExistingMeeting(input);
  const meetingId = existingMeeting?.id ?? `meeting-${Date.now()}`;
  const currentSessions = input.sessions.filter((session) => session.meetingId === meetingId && session.status !== "cancelled");
  const validation = validateReservationSave({
    user: input.selectedUser,
    meetingId,
    spaceId: input.selectedSpace.id,
    date: input.selectedDate,
    startTime: input.selectedStartTime,
    blockCount: input.selectedBlockCount,
    meetings: input.meetings,
    sessions: input.sessions,
    adminBlocks: input.adminBlocks,
    operatingHours: input.selectedSpace.operatingHours,
  });

  if (!validation.canSave) {
    return { validation };
  }

  return {
    validation,
    meeting: existingMeeting === undefined ? createMeeting(input, meetingId, now) : undefined,
    session: {
      id: `session-${Date.now()}`,
      meetingId,
      sessionIndex: currentSessions.length + 1,
      spaceId: input.selectedSpace.id,
      date: input.selectedDate,
      startTime: input.selectedStartTime,
      endTime: addBlocks(input.selectedStartTime, input.selectedBlockCount),
      blockCount: input.selectedBlockCount,
      status: "requested",
      createdAt: now,
      updatedAt: now,
    },
  };
};

export const prepareSessionUpdate = (input: UpdateSessionInput): {
  readonly validation: SaveValidationResult;
  readonly sessions: readonly ReservationSession[];
} => {
  const session = input.sessions.find((item) => item.id === input.sessionId);
  const selectedSpace = input.spaces.find((space) => space.id === input.values.spaceId);
  if (session === undefined) {
    return {
      validation: { canSave: false, reasons: ["수정할 회차를 찾을 수 없음"] },
      sessions: input.sessions,
    };
  }
  if (selectedSpace === undefined) {
    return {
      validation: { canSave: false, reasons: ["수정할 공간을 찾을 수 없음"] },
      sessions: input.sessions,
    };
  }

  const validation = validateReservationSave({
    user: input.selectedUser,
    meetingId: session.meetingId,
    spaceId: input.values.spaceId,
    date: input.values.date,
    startTime: input.values.startTime,
    blockCount: session.blockCount,
    meetings: input.meetings,
    sessions: input.sessions,
    adminBlocks: input.adminBlocks,
    operatingHours: selectedSpace.operatingHours,
    excludeSessionId: session.id,
  });

  if (!validation.canSave) {
    return { validation, sessions: input.sessions };
  }

  return {
    validation,
    sessions: input.sessions.map((item) =>
      item.id === session.id
        ? {
            ...item,
            spaceId: input.values.spaceId,
            date: input.values.date,
            startTime: input.values.startTime,
            endTime: addBlocks(input.values.startTime, item.blockCount),
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
  };
};

const findExistingMeeting = (input: CreateReservationInput): Meeting | undefined =>
  input.meetings.find(
    (meeting) => meeting.applicantUserId === input.selectedUser.id && meeting.meetingName === input.meetingName,
  );

const createMeeting = (input: CreateReservationInput, meetingId: string, now: string): Meeting => ({
  id: meetingId,
  applicantUserId: input.selectedUser.id,
  applicantName: input.selectedUser.name,
  phoneLast4: input.selectedUser.phoneLast4,
  level: input.selectedUser.level,
  meetingName: input.meetingName,
  purpose: input.purpose,
  status: "submitted",
  createdAt: now,
  updatedAt: now,
});
