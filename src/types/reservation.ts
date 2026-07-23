export type SpaceCategory = "youth-building" | "lifestyle";
export type UserLevel = 1 | 2;
export type MeetingStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled";
export type SessionStatus = "requested" | "confirmed" | "cancelled";

export type OperatingHour = {
  readonly dayOfWeek: number;
  readonly openTime: string;
  readonly closeTime: string;
  readonly isClosed: boolean;
};

export type Admin = {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly phoneLast4: string;
  readonly role: string;
  readonly isActive: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

export type Space = {
  readonly id: string;
  readonly name: string;
  readonly category: SpaceCategory;
  readonly capacity: number;
  readonly description: string;
  readonly imageUrl: string;
  readonly images?: readonly SpaceImage[];
  readonly features: readonly string[];
  readonly operatingHours: readonly OperatingHour[];
  readonly isActive: boolean;
  readonly isPublicVisible: boolean;
  readonly requiresAdminUnlock?: boolean;
  readonly parentSpaceName?: string;
  readonly adminMemo?: string;
  readonly sortOrder: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

export type SpaceImage = {
  readonly id: string;
  readonly spaceId: string;
  readonly imageUrl: string;
  readonly altText?: string;
  readonly sortOrder: number;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
  readonly createdAt?: string;
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
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

export type AdminApplication = {
  readonly meetingId: string;
  readonly sessionId: string;
  readonly applicantParticipantId: string;
  readonly applicantName: string;
  readonly phoneLast4: string;
  readonly level: UserLevel;
  readonly meetingName: string;
  readonly purpose: string;
  readonly meetingStatus: MeetingStatus;
  readonly sessionIndex: number;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly blockCount: number;
  readonly sessionStatus: SessionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
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
  readonly spaceName?: string;
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

export type SaveValidationResult = {
  readonly canSave: boolean;
  readonly reasons: readonly string[];
};

export type TimeSlotStatus = "available" | "reserved" | "blocked" | "selected";

export type TimeSlot = {
  readonly time: string;
  readonly status: TimeSlotStatus;
  readonly label: string;
};
