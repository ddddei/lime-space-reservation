import type { Admin, AdminBlock, OperatingHour, ParticipantUser, Space, SpaceCategory, UserLevel } from "../types/reservation";

export type SpaceRow = {
  readonly id: string;
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
  readonly id: string;
  readonly space_id: string;
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly reason: string | null;
  readonly created_by: string | null;
  readonly is_active: boolean;
  readonly created_at: string;
};

export type ParticipantVerificationRow = {
  readonly id: string;
  readonly name: string;
  readonly phone?: string | null;
  readonly phone_last4: string | null;
  readonly level: number | null;
  readonly has_plan: boolean | null;
  readonly has_budget: boolean | null;
  readonly has_promotion: boolean | null;
  readonly has_admin_approval: boolean | null;
  readonly max_blocks: number | null;
  readonly memo: string | null;
  readonly is_active: boolean | null;
};

export type AdminVerificationRow = {
  readonly id: string;
  readonly name: string;
  readonly phone?: string | null;
  readonly phone_last4: string | null;
  readonly role: string | null;
  readonly is_active: boolean | null;
};

export const mapSpaceRows = (
  spaceRows: readonly SpaceRow[],
  operatingHourRows: readonly OperatingHourRow[],
): readonly Space[] => {
  const hoursBySpaceId = new Map<string, readonly OperatingHour[]>();
  for (const row of operatingHourRows) {
    const current = hoursBySpaceId.get(row.space_id) ?? [];
    hoursBySpaceId.set(row.space_id, [...current, mapOperatingHourRow(row)]);
  }

  return spaceRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: mapSpaceCategory(row.category),
    capacity: row.capacity,
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
    features: row.features ?? [],
    operatingHours: [...(hoursBySpaceId.get(row.id) ?? [])].sort((first, second) => first.dayOfWeek - second.dayOfWeek),
    isActive: row.is_active,
    isPublicVisible: row.is_public_visible,
    requiresAdminUnlock: row.requires_admin_unlock ?? undefined,
    parentSpaceName: row.parent_space_name ?? undefined,
    adminMemo: row.admin_memo ?? undefined,
    sortOrder: row.sort_order ?? 0,
  }));
};

export const mapAdminBlockRows = (rows: readonly AdminBlockRow[]): readonly AdminBlock[] =>
  rows.map((row) => ({
    id: row.id,
    spaceId: row.space_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason ?? "예약 불가",
    createdBy: row.created_by ?? "관리자",
    isActive: row.is_active,
    createdAt: row.created_at,
  }));

export const mapParticipantVerificationRow = (row: ParticipantVerificationRow, submittedPhone: string): ParticipantUser => ({
  id: row.id,
  name: row.name,
  phone: row.phone ?? submittedPhone,
  phoneLast4: row.phone_last4 ?? getPhoneLast4(row.phone ?? submittedPhone),
  level: mapUserLevel(row.level),
  hasPlan: row.has_plan ?? false,
  hasBudget: row.has_budget ?? false,
  hasPromotion: row.has_promotion ?? false,
  hasAdminApproval: row.has_admin_approval ?? false,
  maxBlocks: row.max_blocks ?? 0,
  memo: row.memo ?? "",
  isActive: row.is_active ?? true,
});

export const mapAdminVerificationRow = (row: AdminVerificationRow, submittedPhone: string): Admin => ({
  id: row.id,
  name: row.name,
  phone: row.phone ?? submittedPhone,
  phoneLast4: row.phone_last4 ?? getPhoneLast4(row.phone ?? submittedPhone),
  role: row.role ?? "admin",
  isActive: row.is_active ?? true,
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

const mapOperatingHourRow = (row: OperatingHourRow): OperatingHour => ({
  dayOfWeek: row.day_of_week,
  openTime: row.open_time,
  closeTime: row.close_time,
  isClosed: row.is_closed,
});

const mapSpaceCategory = (category: string): SpaceCategory =>
  category === "youth-building" ? "youth-building" : "lifestyle";

const mapUserLevel = (level: number | null): UserLevel => level === 1 ? 1 : 2;

const getPhoneLast4 = (phone: string): string => phone.replace(/\D/g, "").slice(-4);
