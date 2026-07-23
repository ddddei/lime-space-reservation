import type {
  Admin,
  AdminApplication,
  AdminBlock,
  Meeting,
  MeetingStatus,
  OperatingHour,
  ParticipantUser,
  ReservationSession,
  SessionStatus,
  Space,
  SpaceCategory,
  SpaceImage,
  UserLevel,
} from "../types/reservation";

export type SpaceRow = {
  readonly space_id: string;
  readonly name: string;
  readonly category: string;
  readonly capacity: number;
  readonly description: string | null;
  readonly image_url: string | null;
  readonly features: readonly string[] | null;
  readonly is_active: boolean;
  readonly is_public_visible: boolean;
  readonly requires_admin_unlock: boolean | null;
  readonly parent_space_name: string | null;
  readonly admin_memo: string | null;
  readonly sort_order: number | null;
  readonly created_at?: string | null;
  readonly updated_at?: string | null;
};

export type SpaceUpdate = {
  readonly name?: string;
  readonly capacity?: number;
  readonly description?: string;
  readonly image_url?: string;
  readonly features?: readonly string[];
  readonly is_active?: boolean;
  readonly is_public_visible?: boolean;
  readonly parent_space_name?: string;
  readonly admin_memo?: string;
};

export type SpaceImageRow = {
  readonly image_id: string;
  readonly space_id: string;
  readonly image_url: string | null;
  readonly alt_text: string | null;
  readonly sort_order: number | null;
  readonly is_primary: boolean | null;
  readonly is_active: boolean | null;
  readonly created_at: string | null;
};

export type OperatingHourRow = {
  readonly id?: string;
  readonly space_id: string;
  readonly day_of_week: number;
  readonly open_time: string;
  readonly close_time: string;
  readonly is_closed: boolean;
};

export type AdminBlockRow = {
  readonly block_id: string;
  readonly space_id: string;
  readonly space_name?: string | null;
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly reason: string | null;
  readonly created_by: string | null;
  readonly is_active: boolean;
  readonly created_at: string;
};

export type AdminBlockInsert = {
  readonly block_id: string;
  readonly space_id: string;
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly reason: string;
  readonly created_by: string;
  readonly is_active: boolean;
};

export type AdminBlockUpdate = {
  readonly space_id?: string;
  readonly date?: string;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly reason?: string;
  readonly is_active?: boolean;
};

export type ParticipantVerificationRow = {
  readonly participant_id: string;
  readonly name: string;
  readonly phone_last4: string | null;
  readonly level: number | null;
  readonly has_plan: boolean | null;
  readonly has_budget: boolean | null;
  readonly has_promotion: boolean | null;
  readonly has_admin_approval: boolean | null;
  readonly max_blocks: number | null;
  readonly memo: string | null;
  readonly is_active?: boolean | null;
  readonly created_at?: string | null;
  readonly updated_at?: string | null;
};

export type AdminVerificationRow = {
  readonly admin_id: string;
  readonly name: string;
  readonly phone_last4: string | null;
  readonly role: string | null;
};

export type AdminAccountRow = {
  readonly admin_id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly phone_last4: string | null;
  readonly role: string | null;
  readonly is_active: boolean | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
};

export type AdminParticipantRow = {
  readonly participant_id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly phone_last4: string | null;
  readonly level: number | null;
  readonly has_plan: boolean | null;
  readonly has_budget: boolean | null;
  readonly has_promotion: boolean | null;
  readonly has_admin_approval: boolean | null;
  readonly max_blocks: number | null;
  readonly memo: string | null;
  readonly is_active: boolean | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
};

export type SubmitReservationSessionInput = {
  readonly space_id: string;
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly block_count: number;
  readonly session_index: number;
};

export type AdminApplicationRow = {
  readonly meeting_id: string;
  readonly session_id: string;
  readonly applicant_participant_id: string;
  readonly applicant_name: string;
  readonly phone_last4: string | null;
  readonly level: number | null;
  readonly meeting_name: string;
  readonly purpose: string | null;
  readonly meeting_status: string | null;
  readonly session_index: number | null;
  readonly space_id: string;
  readonly space_name: string;
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly block_count: number | null;
  readonly session_status: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type MeetingRow = {
  readonly meeting_id: string;
  readonly applicant_participant_id: string;
  readonly applicant_name: string;
  readonly phone_last4: string | null;
  readonly level: number | null;
  readonly meeting_name: string;
  readonly purpose: string | null;
  readonly status: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type ReservationSessionRow = {
  readonly session_id: string;
  readonly meeting_id: string;
  readonly session_index: number | null;
  readonly space_id: string;
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly block_count: number | null;
  readonly status: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export const mapSpaceRows = (
  spaceRows: readonly SpaceRow[],
  operatingHourRows: readonly OperatingHourRow[],
  spaceImageRows: readonly SpaceImageRow[] = [],
): readonly Space[] => {
  const hoursBySpaceId = new Map<string, readonly OperatingHour[]>();
  for (const row of operatingHourRows) {
    const current = hoursBySpaceId.get(row.space_id) ?? [];
    hoursBySpaceId.set(row.space_id, [...current, mapOperatingHourRow(row)]);
  }

  const imagesBySpaceId = groupSpaceImagesBySpaceId(spaceImageRows);

  return spaceRows.map((row) => ({
    id: row.space_id,
    name: row.name,
    category: mapSpaceCategory(row.category),
    capacity: row.capacity,
    description: row.description ?? "",
    imageUrl: getPrimarySpaceImageUrl(imagesBySpaceId.get(row.space_id) ?? [], row.image_url ?? ""),
    images: imagesBySpaceId.get(row.space_id) ?? [],
    features: row.features ?? [],
    operatingHours: [...(hoursBySpaceId.get(row.space_id) ?? [])].sort((first, second) => first.dayOfWeek - second.dayOfWeek),
    isActive: row.is_active,
    isPublicVisible: row.is_public_visible,
    requiresAdminUnlock: row.requires_admin_unlock ?? undefined,
    parentSpaceName: row.parent_space_name ?? undefined,
    adminMemo: row.admin_memo ?? undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }));
};

export const mapSpaceImageRows = (rows: readonly SpaceImageRow[]): readonly SpaceImage[] =>
  rows
    .map((row) => ({
      id: row.image_id,
      spaceId: row.space_id,
      imageUrl: row.image_url ?? "",
      altText: row.alt_text ?? undefined,
      sortOrder: row.sort_order ?? 0,
      isPrimary: row.is_primary ?? false,
      isActive: row.is_active ?? false,
      createdAt: row.created_at ?? undefined,
    }))
    .sort(compareSpaceImages);

export const mapAdminBlockRows = (rows: readonly AdminBlockRow[]): readonly AdminBlock[] =>
  rows.map((row) => ({
    id: row.block_id,
    spaceId: row.space_id,
    spaceName: row.space_name ?? undefined,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason ?? "예약 불가",
    createdBy: row.created_by ?? "관리자",
    isActive: row.is_active,
    createdAt: row.created_at,
  }));

export const mapAdminParticipantRows = (rows: readonly AdminParticipantRow[]): readonly ParticipantUser[] =>
  rows.map((row) => ({
    id: row.participant_id,
    name: row.name,
    phone: row.phone ?? "",
    phoneLast4: row.phone_last4 ?? getPhoneLast4(row.phone ?? ""),
    level: mapUserLevel(row.level),
    hasPlan: row.has_plan ?? false,
    hasBudget: row.has_budget ?? false,
    hasPromotion: row.has_promotion ?? false,
    hasAdminApproval: row.has_admin_approval ?? false,
    maxBlocks: row.max_blocks ?? 0,
    memo: row.memo ?? "",
    isActive: row.is_active ?? false,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }));

export const mapAdminAccountRows = (rows: readonly AdminAccountRow[]): readonly Admin[] =>
  rows.map((row) => ({
    id: row.admin_id,
    name: row.name,
    phone: row.phone ?? "",
    phoneLast4: row.phone_last4 ?? getPhoneLast4(row.phone ?? ""),
    role: row.role ?? "admin",
    isActive: row.is_active ?? false,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }));

export const mapAdminApplicationRows = (rows: readonly AdminApplicationRow[]): readonly AdminApplication[] =>
  rows.map((row) => ({
    meetingId: row.meeting_id,
    sessionId: row.session_id,
    applicantParticipantId: row.applicant_participant_id,
    applicantName: row.applicant_name,
    phoneLast4: row.phone_last4 ?? "",
    level: mapUserLevel(row.level),
    meetingName: row.meeting_name,
    purpose: row.purpose ?? "",
    meetingStatus: mapMeetingStatus(row.meeting_status),
    sessionIndex: row.session_index ?? 1,
    spaceId: row.space_id,
    spaceName: row.space_name,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    blockCount: row.block_count ?? 0,
    sessionStatus: mapSessionStatus(row.session_status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

export const mapReservationSubmissionRowsToMeeting = (
  rows: readonly AdminApplicationRow[],
): Meeting | undefined => {
  const first = rows[0];
  if (first === undefined) {
    return undefined;
  }
  return {
    id: first.meeting_id,
    applicantUserId: first.applicant_participant_id,
    applicantName: first.applicant_name,
    phoneLast4: first.phone_last4 ?? "",
    level: mapUserLevel(first.level),
    meetingName: first.meeting_name,
    purpose: first.purpose ?? "",
    status: mapMeetingStatus(first.meeting_status),
    createdAt: first.created_at,
    updatedAt: first.updated_at,
  };
};

export const mapReservationSubmissionRowsToSessions = (
  rows: readonly AdminApplicationRow[],
): readonly ReservationSession[] =>
  rows.map((row) => ({
    id: row.session_id,
    meetingId: row.meeting_id,
    sessionIndex: row.session_index ?? 1,
    spaceId: row.space_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    blockCount: row.block_count ?? 0,
    status: mapSessionStatus(row.session_status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

export const mapMeetingRows = (rows: readonly MeetingRow[]): readonly Meeting[] =>
  rows.map((row) => ({
    id: row.meeting_id,
    applicantUserId: row.applicant_participant_id,
    applicantName: row.applicant_name,
    phoneLast4: row.phone_last4 ?? "",
    level: mapUserLevel(row.level),
    meetingName: row.meeting_name,
    purpose: row.purpose ?? "",
    status: mapMeetingStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

export const mapReservationSessionRows = (rows: readonly ReservationSessionRow[]): readonly ReservationSession[] =>
  rows.map((row) => ({
    id: row.session_id,
    meetingId: row.meeting_id,
    sessionIndex: row.session_index ?? 1,
    spaceId: row.space_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    blockCount: row.block_count ?? 0,
    status: mapSessionStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

export const mapParticipantVerificationRow = (row: ParticipantVerificationRow, submittedPhone: string): ParticipantUser => ({
  id: row.participant_id,
  name: row.name,
  phone: submittedPhone,
  phoneLast4: row.phone_last4 ?? getPhoneLast4(submittedPhone),
  level: mapUserLevel(row.level),
  hasPlan: row.has_plan ?? false,
  hasBudget: row.has_budget ?? false,
  hasPromotion: row.has_promotion ?? false,
  hasAdminApproval: row.has_admin_approval ?? false,
  maxBlocks: row.max_blocks ?? 0,
  memo: row.memo ?? "",
  isActive: row.is_active ?? true,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

export const mapAdminVerificationRow = (row: AdminVerificationRow, submittedPhone: string): Admin => ({
  id: row.admin_id,
  name: row.name,
  phone: submittedPhone,
  phoneLast4: row.phone_last4 ?? getPhoneLast4(submittedPhone),
  role: row.role ?? "admin",
  isActive: true,
});

export const firstParticipantVerificationRow = (
  data: ParticipantVerificationRow | ParticipantVerificationRow[] | null,
): ParticipantVerificationRow | undefined => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data ?? undefined;
};

export const firstAdminVerificationRow = (
  data: AdminVerificationRow | AdminVerificationRow[] | null,
): AdminVerificationRow | undefined => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data ?? undefined;
};

export const firstAdminParticipantRow = (
  data: AdminParticipantRow | AdminParticipantRow[] | null,
): AdminParticipantRow | undefined => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data ?? undefined;
};

export const firstAdminAccountRow = (
  data: AdminAccountRow | AdminAccountRow[] | null,
): AdminAccountRow | undefined => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data ?? undefined;
};

export const firstAdminBlockRow = (
  data: AdminBlockRow | AdminBlockRow[] | null,
): AdminBlockRow | undefined => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data ?? undefined;
};

export const firstSpaceRow = (
  data: SpaceRow | SpaceRow[] | null,
): SpaceRow | undefined => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data ?? undefined;
};

export const firstSpaceImageRow = (
  data: SpaceImageRow | SpaceImageRow[] | null,
): SpaceImageRow | undefined => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data ?? undefined;
};

export type CancelReservationRow = {
  readonly meeting_id: string;
  readonly meeting_status: string | null;
  readonly cancelled_session_count: number | null;
};

export const firstCancelReservationRow = (
  data: CancelReservationRow | CancelReservationRow[] | null,
): CancelReservationRow | undefined => {
  if (Array.isArray(data)) {
    return data[0];
  }
  return data ?? undefined;
};

const mapOperatingHourRow = (row: OperatingHourRow): OperatingHour => ({
  dayOfWeek: row.day_of_week,
  openTime: row.open_time,
  closeTime: row.close_time,
  isClosed: row.is_closed,
});

export const mapOperatingHourRows = (rows: readonly OperatingHourRow[]): readonly OperatingHour[] =>
  [...rows].map(mapOperatingHourRow).sort((first, second) => first.dayOfWeek - second.dayOfWeek);

const groupSpaceImagesBySpaceId = (rows: readonly SpaceImageRow[]): ReadonlyMap<string, readonly SpaceImage[]> => {
  const groupedImages = new Map<string, readonly SpaceImage[]>();
  for (const image of mapSpaceImageRows(rows)) {
    const current = groupedImages.get(image.spaceId) ?? [];
    groupedImages.set(image.spaceId, [...current, image]);
  }
  return groupedImages;
};

const getPrimarySpaceImageUrl = (images: readonly SpaceImage[], fallbackUrl: string): string => {
  const primaryImage = [...images].sort(compareSpaceImages).find((image) => image.imageUrl.trim().length > 0);
  return primaryImage?.imageUrl ?? fallbackUrl;
};

const compareSpaceImages = (first: SpaceImage, second: SpaceImage): number => {
  if (first.isPrimary !== second.isPrimary) {
    return first.isPrimary ? -1 : 1;
  }
  return first.sortOrder - second.sortOrder;
};

const mapSpaceCategory = (category: string): SpaceCategory =>
  category === "youth-building" ? "youth-building" : "lifestyle";

const mapUserLevel = (level: number | null): UserLevel => level === 1 ? 1 : 2;

const getPhoneLast4 = (phone: string): string => phone.replace(/\D/g, "").slice(-4);

const mapMeetingStatus = (status: string | null): MeetingStatus => {
  if (status === "submitted" || status === "approved" || status === "rejected" || status === "cancelled") {
    return status;
  }
  return "draft";
};

const mapSessionStatus = (status: string | null): SessionStatus => {
  if (status === "confirmed" || status === "cancelled") {
    return status;
  }
  return "requested";
};
