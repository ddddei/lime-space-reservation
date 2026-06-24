export type SpaceCategory = "youth-building" | "lifestyle";
export type UserLevel = 1 | 2;
export type MeetingStatus = "draft" | "submitted" | "approved" | "rejected";
export type SessionStatus = "requested" | "confirmed" | "cancelled";

export type Space = {
  readonly id: string;
  readonly name: string;
  readonly category: SpaceCategory;
  readonly capacity: number;
  readonly description: string;
  readonly imageUrl: string;
  readonly features: readonly string[];
  readonly isActive: boolean;
  readonly sortOrder: number;
};

export type ParticipantUser = {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly phoneLast4: string;
  readonly level: UserLevel;
  readonly hasPlan: boolean;
  readonly hasBudget: boolean;
  readonly hasPromotion: boolean;
  readonly hasAdminApproval: boolean;
  readonly maxBlocks: number;
  readonly memo: string;
  readonly isActive: boolean;
};

export type Meeting = {
  readonly id: string;
  readonly applicantUserId: string;
  readonly applicantName: string;
  readonly phoneLast4: string;
  readonly level: UserLevel;
  readonly meetingName: string;
  readonly purpose: string;
  readonly status: MeetingStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ReservationSession = {
  readonly id: string;
  readonly meetingId: string;
  readonly sessionIndex: number;
  readonly spaceId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly blockCount: number;
  readonly status: SessionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type AdminBlock = {
  readonly id: string;
  readonly spaceId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
  readonly createdBy: string;
  readonly isActive: boolean;
  readonly createdAt: string;
};

export type EligibilityResult = {
  readonly canReserve: boolean;
  readonly usedBlocks: number;
  readonly remainingBlocks: number;
  readonly missingRequirements: readonly string[];
};

export type TimeSlotStatus = "available" | "reserved" | "blocked" | "selected";

export type TimeSlot = {
  readonly time: string;
  readonly status: TimeSlotStatus;
  readonly label: string;
};
