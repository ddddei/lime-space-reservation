import { initialAdminBlocks } from "../data/mockAdminBlocks";
import { initialAdmins } from "../data/mockAdmins";
import { initialSessions } from "../data/mockSessions";
import { applySpaceContentOverrides, initialSpaces } from "../data/spaces";
import { initialUsers } from "../data/mockUsers";
import { findAdminByNameAndPhone, findParticipantByNameAndPhone, type AdminAuthResult, type ParticipantAuthResult } from "./participantAuth";
import { isSupabaseConfigured, supabaseClient } from "./supabaseClient";
import {
  firstAdminAccountRow,
  firstAdminParticipantRow,
  firstAdminBlockRow,
  firstAdminVerificationRow,
  firstCancelReservationRow,
  firstParticipantVerificationRow,
  firstSpaceImageRow,
  firstSpaceRow,
  mapAdminAccountRows,
  mapAdminApplicationRows,
  mapAdminBlockRows,
  mapAdminParticipantRows,
  mapAdminVerificationRow,
  mapMeetingRows,
  mapOperatingHourRows,
  mapParticipantVerificationRow,
  mapReservationSessionRows,
  mapReservationSubmissionRowsToMeeting,
  mapReservationSubmissionRowsToSessions,
  mapSpaceImageRows,
  type AdminApplicationRow,
  type OperatingHourRow,
  type SpaceImageRow,
  type SubmitReservationSessionInput,
  mapSpaceRows,
} from "./supabaseMappers";
import type { Admin, AdminApplication, AdminBlock, Meeting, OperatingHour, ParticipantUser, ReservationSession, Space, SpaceImage, UserLevel } from "../types/reservation";
import type { PostgrestError } from "@supabase/supabase-js";

type ReservationReadModel = {
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly activeSessions: readonly ReservationSession[];
};

export type AdminCredentials = {
  readonly name: string;
  readonly phone: string;
};

type AdminReadModel = {
  readonly participants: readonly ParticipantUser[];
  readonly spaces: readonly Space[];
  readonly applications: readonly AdminApplication[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly adminAccounts: readonly Admin[];
};

export type ParticipantReservationReadModel = {
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
};

export const fetchReservationReadModel = async (): Promise<ReservationReadModel | undefined> => {
  if (supabaseClient === undefined) {
    return undefined;
  }

  const spacesResponse = await supabaseClient
    .from("spaces")
    .select("space_id,name,category,capacity,description,image_url,features,is_active,is_public_visible,requires_admin_unlock,parent_space_name,admin_memo,sort_order,created_at,updated_at")
    .eq("category", "lifestyle")
    .eq("is_active", true)
    .eq("is_public_visible", true)
    .order("sort_order", { ascending: true });

  if (spacesResponse.error !== null) {
    warnSupabaseReadError("공개 spaces 조회", spacesResponse.error);
    return { spaces: [], adminBlocks: [], activeSessions: [] };
  }

  const publicSpaceIds = spacesResponse.data.map((space) => space.space_id);
  if (publicSpaceIds.length === 0) {
    return { spaces: [], adminBlocks: [], activeSessions: [] };
  }

  const [operatingHoursResponse, adminBlocksResponse, activeSessionsResponse, spaceImagesResponse] = await Promise.all([
    supabaseClient
      .from("operating_hours")
      .select("space_id,day_of_week,open_time,close_time,is_closed")
      .in("space_id", publicSpaceIds)
      .order("day_of_week", { ascending: true }),
    supabaseClient
      .from("admin_blocks")
      .select("block_id,space_id,date,start_time,end_time,reason,created_by,is_active,created_at")
      .eq("is_active", true)
      .in("space_id", publicSpaceIds)
      .order("date", { ascending: true }),
    fetchPublicActiveSessions(publicSpaceIds),
    fetchSpaceImageRows(publicSpaceIds),
  ]);

  if (operatingHoursResponse.error !== null) {
    warnSupabaseReadError("operating_hours 조회", operatingHoursResponse.error);
    return { spaces: mapSpaceRows(spacesResponse.data, [], spaceImagesResponse.rows), adminBlocks: [], activeSessions: [] };
  }

  if (adminBlocksResponse.error !== null) {
    warnSupabaseReadError("공개 admin_blocks 조회", adminBlocksResponse.error);
    return { spaces: mapSpaceRows(spacesResponse.data, operatingHoursResponse.data, spaceImagesResponse.rows), adminBlocks: [], activeSessions: [] };
  }

  return {
    spaces: mapSpaceRows(spacesResponse.data, operatingHoursResponse.data, spaceImagesResponse.rows),
    adminBlocks: mapAdminBlockRows(adminBlocksResponse.data),
    activeSessions: activeSessionsResponse.sessions,
  };
};

export const getMockReservationReadModel = (): ReservationReadModel => ({
  spaces: applySpaceContentOverrides(initialSpaces),
  adminBlocks: initialAdminBlocks,
  activeSessions: initialSessions.filter((session) => session.status !== "cancelled"),
});

export const fetchParticipantReservationReadModel = async (
  participantId: string,
): Promise<ParticipantReservationReadModel | undefined> => {
  if (supabaseClient === undefined) {
    return undefined;
  }
  return fetchParticipantReservationsFromRpc(participantId);
};

const fetchParticipantReservationsFromRpc = async (
  participantId: string,
): Promise<ParticipantReservationReadModel | undefined> => {
  if (supabaseClient === undefined) {
    return { meetings: [], sessions: [] };
  }

  const response = await supabaseClient.rpc("get_participant_applications", {
    input_participant_id: participantId,
  });

  if (response.error !== null) {
    warnSupabaseReadError("get_participant_applications RPC", response.error);
    return fetchParticipantReservationsFromTables(participantId);
  }

  return mapParticipantApplicationRows(response.data ?? []);
};

const mapParticipantApplicationRows = (
  rows: readonly AdminApplicationRow[],
): ParticipantReservationReadModel => {
  const meetingById = new Map<string, Meeting>();
  for (const row of rows) {
    const meeting = mapReservationSubmissionRowsToMeeting([row]);
    if (meeting !== undefined) {
      meetingById.set(meeting.id, meeting);
    }
  }
  return {
    meetings: [...meetingById.values()],
    sessions: mapReservationSubmissionRowsToSessions(rows),
  };
};

const fetchParticipantReservationsFromTables = async (
  participantId: string,
): Promise<ParticipantReservationReadModel | undefined> => {
  if (supabaseClient === undefined) {
    return { meetings: [], sessions: [] };
  }
  const meetingsResponse = await supabaseClient
    .from("meetings")
    .select("meeting_id,applicant_participant_id,applicant_name,phone_last4,level,meeting_name,purpose,status,created_at,updated_at")
    .eq("applicant_participant_id", participantId)
    .order("updated_at", { ascending: false });

  if (meetingsResponse.error !== null) {
    warnSupabaseReadError("참여자 meetings 조회", meetingsResponse.error);
    return undefined;
  }

  const meetingIds = (meetingsResponse.data ?? []).map((meeting) => meeting.meeting_id);
  if (meetingIds.length === 0) {
    return { meetings: [], sessions: [] };
  }

  const sessionsResponse = await supabaseClient
    .from("sessions")
    .select("session_id,meeting_id,session_index,space_id,date,start_time,end_time,block_count,status,created_at,updated_at")
    .in("meeting_id", meetingIds)
    .order("date", { ascending: false })
    .order("start_time", { ascending: true });

  if (sessionsResponse.error !== null) {
    warnSupabaseReadError("참여자 sessions 조회", sessionsResponse.error);
    return undefined;
  }

  return {
    meetings: mapMeetingRows(meetingsResponse.data ?? []),
    sessions: mapReservationSessionRows(sessionsResponse.data ?? []),
  };
};

export const fetchAdminReadModel = async (credentials: AdminCredentials): Promise<AdminReadModel | undefined> => {
  if (supabaseClient === undefined) {
    return undefined;
  }

  const args = {
    input_admin_name: credentials.name.trim(),
    input_admin_phone: credentials.phone.trim(),
  };
  const [participantsResponse, spacesResponse, applicationsResponse, blocksResponse, accountsResponse] = await Promise.all([
    supabaseClient.rpc("get_admin_participants", args),
    supabaseClient.rpc("get_admin_spaces", args),
    supabaseClient.rpc("get_admin_applications", args),
    supabaseClient.rpc("get_admin_blocks", args),
    supabaseClient.rpc("get_admin_accounts", args),
  ]);

  if (participantsResponse.error !== null) {
    warnSupabaseReadError("get_admin_participants RPC", participantsResponse.error);
    return emptyAdminReadModel();
  }
  if (spacesResponse.error !== null) {
    warnSupabaseReadError("get_admin_spaces RPC", spacesResponse.error);
    return emptyAdminReadModel();
  }
  if (applicationsResponse.error !== null) {
    warnSupabaseReadError("get_admin_applications RPC", applicationsResponse.error);
    return emptyAdminReadModel();
  }
  if (blocksResponse.error !== null) {
    warnSupabaseReadError("get_admin_blocks RPC", blocksResponse.error);
    return emptyAdminReadModel();
  }
  if (accountsResponse.error !== null) {
    warnSupabaseReadError("get_admin_accounts RPC", accountsResponse.error);
    return emptyAdminReadModel();
  }

  const adminSpaceRows = spacesResponse.data ?? [];
  const adminSpaceIds = adminSpaceRows.map((space) => space.space_id);
  const spaceImagesResponse = await fetchSpaceImageRows(adminSpaceIds);

  return {
    participants: mapAdminParticipantRows(participantsResponse.data ?? []),
    spaces: mapSpaceRows(adminSpaceRows, [], spaceImagesResponse.rows),
    applications: mapAdminApplicationRows(applicationsResponse.data ?? []),
    adminBlocks: mapAdminBlockRows(blocksResponse.data ?? []).filter((block) => block.isActive),
    adminAccounts: mapAdminAccountRows(accountsResponse.data ?? []),
  };
};

export const fetchSpaceImageRows = async (
  spaceIds: readonly string[],
): Promise<{ readonly rows: readonly SpaceImageRow[] }> => {
  if (supabaseClient === undefined || spaceIds.length === 0) {
    return { rows: [] };
  }

  const response = await supabaseClient
    .from("space_images")
    .select("image_id,space_id,image_url,alt_text,sort_order,is_primary,is_active,created_at")
    .eq("is_active", true)
    .in("space_id", spaceIds)
    .order("sort_order", { ascending: true });

  if (response.error !== null) {
    warnSupabaseReadError("space_images 조회", response.error);
    return { rows: [] };
  }

  return { rows: response.data ?? [] };
};

const fetchPublicActiveSessions = async (
  publicSpaceIds: readonly string[],
): Promise<{ readonly sessions: readonly ReservationSession[] }> => {
  if (supabaseClient === undefined || publicSpaceIds.length === 0) {
    return { sessions: [] };
  }

  const rpcResponse = await supabaseClient.rpc("get_public_active_sessions", {});
  if (rpcResponse.error === null) {
    return { sessions: mapReservationSessionRows(rpcResponse.data ?? []) };
  }

  if (rpcResponse.error.code !== "PGRST202") {
    warnSupabaseReadError("get_public_active_sessions RPC", rpcResponse.error);
    return { sessions: [] };
  }

  const sessionsResponse = await supabaseClient
    .from("sessions")
    .select("session_id,meeting_id,session_index,space_id,date,start_time,end_time,block_count,status,created_at,updated_at")
    .in("space_id", publicSpaceIds)
    .neq("status", "cancelled")
    .order("date", { ascending: true });

  if (sessionsResponse.error !== null) {
    warnSupabaseReadError("공개 sessions 조회", sessionsResponse.error);
    return { sessions: [] };
  }

  return { sessions: mapReservationSessionRows(sessionsResponse.data ?? []) };
};

export const verifyParticipantLogin = async (
  name: string,
  phone: string,
): Promise<ParticipantAuthResult> => {
  if (supabaseClient === undefined) {
    return findParticipantByNameAndPhone(name, phone, initialUsers);
  }

  const response = await supabaseClient.rpc("verify_participant", {
    input_name: name.trim(),
    input_phone: phone.trim(),
  });

  if (response.error !== null) {
    warnSupabaseAuthError("verify_participant RPC", response.error);
    return {
      status: "not_found",
      message: "예약 대상자로 확인되지 않습니다. 관리자에게 문의해 주세요.",
    };
  }

  const row = firstParticipantVerificationRow(response.data);
  if (row === undefined) {
    return {
      status: "not_found",
      message: "예약 대상자로 확인되지 않습니다. 관리자에게 문의해 주세요.",
    };
  }

  return {
    status: "found",
    user: mapParticipantVerificationRow(row, phone),
    message: "참여자 확인이 완료되었습니다.",
  };
};

export const verifyAdminLogin = async (
  name: string,
  phone: string,
): Promise<AdminAuthResult> => {
  if (supabaseClient === undefined) {
    return findAdminByNameAndPhone(name, phone, initialAdmins);
  }

  const response = await supabaseClient.rpc("verify_admin", {
    input_name: name.trim(),
    input_phone: phone.trim(),
  });

  if (response.error !== null) {
    warnSupabaseAuthError("verify_admin RPC", response.error);
    return {
      status: "not_found",
      message: "관리자 권한을 확인할 수 없습니다.",
    };
  }

  const row = firstAdminVerificationRow(response.data);
  if (row === undefined) {
    return {
      status: "not_found",
      message: "관리자 권한을 확인할 수 없습니다.",
    };
  }

  return {
    status: "found",
    admin: mapAdminVerificationRow(row, phone),
    message: "관리자 확인이 완료되었습니다.",
  };
};

export type ApprovalUpdateResult =
  | { readonly status: "ok"; readonly user: ParticipantUser }
  | { readonly status: "error"; readonly message: string };

export type ParticipantLevelUpdateResult =
  | { readonly status: "ok"; readonly user: ParticipantUser }
  | { readonly status: "error"; readonly message: string };

export type CreateAdminParticipantInput = {
  readonly name: string;
  readonly phone: string;
  readonly level: UserLevel;
  readonly memo?: string;
};

export type AdminParticipantMutationResult =
  | { readonly status: "ok"; readonly user: ParticipantUser }
  | { readonly status: "error"; readonly message: string };

export type AdminBlockMutationInput = {
  readonly id?: string;
  readonly spaceId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
};

export type AdminBlockMutationResult =
  | { readonly status: "ok"; readonly block: AdminBlock }
  | { readonly status: "error"; readonly message: string };

export type AdminSpaceMutationInput = Pick<
  Space,
  "id" | "name" | "capacity" | "description" | "imageUrl" | "features" | "isActive" | "isPublicVisible" | "parentSpaceName" | "adminMemo"
>;

export type AdminSpaceMutationResult =
  | { readonly status: "ok"; readonly space: Space }
  | { readonly status: "error"; readonly message: string };

export type CreateAdminSpaceInput = Pick<
  Space,
  | "id"
  | "name"
  | "category"
  | "capacity"
  | "description"
  | "imageUrl"
  | "features"
  | "operatingHours"
  | "isActive"
  | "isPublicVisible"
  | "requiresAdminUnlock"
  | "parentSpaceName"
  | "adminMemo"
  | "sortOrder"
>;

export const updateParticipantReservationApproval = async (
  admin: AdminCredentials,
  participantId: string,
  isApproved: boolean,
): Promise<ApprovalUpdateResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("update_participant_reservation_approval", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_participant_id: participantId,
    input_is_approved: isApproved,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("update_participant_reservation_approval RPC", response.error);
    return { status: "error", message: "예약 승인 상태를 변경할 수 없습니다." };
  }

  const row = firstAdminParticipantRow(response.data);
  if (row === undefined) {
    return { status: "error", message: "예약 승인 상태를 변경할 수 없습니다." };
  }

  return { status: "ok", user: mapAdminParticipantRows([row])[0] };
};

export const updateParticipantLevel = async (
  admin: AdminCredentials,
  participantId: string,
  level: UserLevel,
): Promise<ParticipantLevelUpdateResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("update_participant_level", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_participant_id: participantId,
    input_level: level,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("update_participant_level RPC", response.error);
    return { status: "error", message: "Level을 변경할 수 없습니다." };
  }

  const row = firstAdminParticipantRow(response.data);
  if (row === undefined) {
    return { status: "error", message: "Level을 변경할 수 없습니다." };
  }

  return { status: "ok", user: mapAdminParticipantRows([row])[0] };
};

export const createAdminParticipant = async (
  admin: AdminCredentials,
  input: CreateAdminParticipantInput,
): Promise<AdminParticipantMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("create_admin_participant", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_name: input.name.trim(),
    input_phone: input.phone.trim(),
    input_level: input.level,
    input_memo: input.memo?.trim() ?? null,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("create_admin_participant RPC", response.error);
    return { status: "error", message: toAdminParticipantFailureMessage(response.error, ADMIN_PARTICIPANT_CREATE_GENERIC_FAILURE_MESSAGE) };
  }

  const row = firstAdminParticipantRow(response.data);
  if (row === undefined) {
    return { status: "error", message: ADMIN_PARTICIPANT_CREATE_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", user: mapAdminParticipantRows([row])[0] };
};

export const deactivateAdminParticipant = async (
  admin: AdminCredentials,
  participantId: string,
): Promise<AdminParticipantMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("deactivate_admin_participant", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_participant_id: participantId,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("deactivate_admin_participant RPC", response.error);
    return { status: "error", message: toAdminParticipantFailureMessage(response.error, ADMIN_PARTICIPANT_DEACTIVATE_GENERIC_FAILURE_MESSAGE) };
  }

  const row = firstAdminParticipantRow(response.data);
  if (row === undefined) {
    return { status: "error", message: ADMIN_PARTICIPANT_DEACTIVATE_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", user: mapAdminParticipantRows([row])[0] };
};

export type CreateAdminAccountInput = {
  readonly name: string;
  readonly phone: string;
  readonly role?: string;
};

export type AdminAccountMutationResult =
  | { readonly status: "ok"; readonly account: Admin }
  | { readonly status: "error"; readonly message: string };

export const createAdminAccount = async (
  admin: AdminCredentials,
  input: CreateAdminAccountInput,
): Promise<AdminAccountMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("create_admin_account", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_name: input.name.trim(),
    input_phone: input.phone.trim(),
    input_role: input.role?.trim() ?? null,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("create_admin_account RPC", response.error);
    return { status: "error", message: toAdminAccountFailureMessage(response.error, ADMIN_ACCOUNT_CREATE_GENERIC_FAILURE_MESSAGE) };
  }

  const row = firstAdminAccountRow(response.data);
  if (row === undefined) {
    return { status: "error", message: ADMIN_ACCOUNT_CREATE_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", account: mapAdminAccountRows([row])[0] };
};

export const deactivateAdminAccount = async (
  admin: AdminCredentials,
  adminId: string,
): Promise<AdminAccountMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("deactivate_admin_account", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_admin_id: adminId,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("deactivate_admin_account RPC", response.error);
    return { status: "error", message: toAdminAccountFailureMessage(response.error, ADMIN_ACCOUNT_DEACTIVATE_GENERIC_FAILURE_MESSAGE) };
  }

  const row = firstAdminAccountRow(response.data);
  if (row === undefined) {
    return { status: "error", message: ADMIN_ACCOUNT_DEACTIVATE_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", account: mapAdminAccountRows([row])[0] };
};

export const saveAdminBlock = async (
  admin: AdminCredentials,
  input: AdminBlockMutationInput,
): Promise<AdminBlockMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("upsert_admin_block", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_block_id: input.id ?? null,
    input_space_id: input.spaceId,
    input_date: input.date,
    input_start_time: input.startTime,
    input_end_time: input.endTime,
    input_reason: input.reason,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("upsert_admin_block RPC", response.error);
    return { status: "error", message: toAdminBlockFailureMessage(response.error) };
  }

  const row = firstAdminBlockRow(response.data);
  if (row === undefined) {
    return { status: "error", message: ADMIN_BLOCK_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", block: mapAdminBlockRows([row])[0] };
};

export const deactivateAdminBlock = async (
  admin: AdminCredentials,
  blockId: string,
): Promise<AdminBlockMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("deactivate_admin_block", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_block_id: blockId,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("deactivate_admin_block RPC", response.error);
    return { status: "error", message: toAdminBlockFailureMessage(response.error) };
  }

  const row = firstAdminBlockRow(response.data);
  if (row === undefined) {
    return { status: "error", message: ADMIN_BLOCK_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", block: mapAdminBlockRows([row])[0] };
};

export const saveAdminSpace = async (
  admin: AdminCredentials,
  input: AdminSpaceMutationInput,
): Promise<AdminSpaceMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("update_admin_space", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_space_id: input.id,
    input_name: input.name.trim(),
    input_capacity: input.capacity,
    input_description: input.description,
    input_image_url: input.imageUrl,
    input_features: input.features,
    input_is_active: input.isActive,
    input_is_public_visible: input.isPublicVisible,
    input_parent_space_name: input.parentSpaceName ?? "",
    input_admin_memo: input.adminMemo ?? "",
  });

  if (response.error !== null) {
    warnSupabaseAuthError("update_admin_space RPC", response.error);
    return { status: "error", message: toAdminSpaceFailureMessage(response.error) };
  }

  const row = firstSpaceRow(response.data);
  if (row === undefined) {
    return { status: "error", message: ADMIN_SPACE_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", space: mapSpaceRows([row], [])[0] };
};

export const createAdminSpace = async (
  admin: AdminCredentials,
  input: CreateAdminSpaceInput,
): Promise<AdminSpaceMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("create_admin_space", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_space_id: input.id,
    input_name: input.name.trim(),
    input_category: input.category,
    input_capacity: input.capacity,
    input_description: input.description,
    input_image_url: input.imageUrl,
    input_features: input.features,
    input_is_active: input.isActive,
    input_is_public_visible: input.isPublicVisible,
    input_requires_admin_unlock: input.requiresAdminUnlock ?? false,
    input_parent_space_name: input.parentSpaceName ?? "",
    input_admin_memo: input.adminMemo ?? "",
    input_sort_order: input.sortOrder,
    input_operating_hours: toOperatingHoursPayload(input.operatingHours),
  });

  if (response.error !== null) {
    warnSupabaseAuthError("create_admin_space RPC", response.error);
    return { status: "error", message: toAdminSpaceCreateFailureMessage(response.error) };
  }

  const row = firstSpaceRow(response.data);
  if (row === undefined) {
    return { status: "error", message: ADMIN_SPACE_CREATE_GENERIC_FAILURE_MESSAGE };
  }

  const operatingHourRows: readonly OperatingHourRow[] = input.operatingHours.map((hour) => ({
    space_id: row.space_id,
    day_of_week: hour.dayOfWeek,
    open_time: hour.openTime,
    close_time: hour.closeTime,
    is_closed: hour.isClosed,
  }));

  return { status: "ok", space: mapSpaceRows([row], operatingHourRows)[0] };
};

export type AdminSpaceOperatingHoursMutationResult =
  | { readonly status: "ok"; readonly operatingHours: readonly OperatingHour[] }
  | { readonly status: "error"; readonly message: string };

export const updateAdminSpaceOperatingHours = async (
  admin: AdminCredentials,
  spaceId: string,
  operatingHours: readonly OperatingHour[],
): Promise<AdminSpaceOperatingHoursMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("update_admin_space_operating_hours", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_space_id: spaceId,
    input_operating_hours: toOperatingHoursPayload(operatingHours),
  });

  if (response.error !== null) {
    warnSupabaseAuthError("update_admin_space_operating_hours RPC", response.error);
    return { status: "error", message: toAdminSpaceOperatingHoursFailureMessage(response.error) };
  }

  const rows: readonly OperatingHourRow[] = response.data ?? [];
  if (rows.length === 0) {
    return { status: "error", message: ADMIN_SPACE_OPERATING_HOURS_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", operatingHours: mapOperatingHourRows(rows) };
};

export type SpaceImageMutationResult =
  | { readonly status: "ok"; readonly image: SpaceImage }
  | { readonly status: "error"; readonly message: string };

export const addSpaceImage = async (
  admin: AdminCredentials,
  spaceId: string,
  imageUrl: string,
  altText?: string,
): Promise<SpaceImageMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("add_space_image", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_space_id: spaceId,
    input_image_url: imageUrl,
    input_alt_text: altText?.trim() ?? null,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("add_space_image RPC", response.error);
    return { status: "error", message: toSpaceImageFailureMessage(response.error, SPACE_IMAGE_ADD_GENERIC_FAILURE_MESSAGE) };
  }

  const row = firstSpaceImageRow(response.data);
  if (row === undefined) {
    return { status: "error", message: SPACE_IMAGE_ADD_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", image: mapSpaceImageRows([row])[0] };
};

export const removeSpaceImage = async (
  admin: AdminCredentials,
  imageId: string,
): Promise<SpaceImageMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("remove_space_image", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_image_id: imageId,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("remove_space_image RPC", response.error);
    return { status: "error", message: toSpaceImageFailureMessage(response.error, SPACE_IMAGE_REMOVE_GENERIC_FAILURE_MESSAGE) };
  }

  const row = firstSpaceImageRow(response.data);
  if (row === undefined) {
    return { status: "error", message: SPACE_IMAGE_REMOVE_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", image: mapSpaceImageRows([row])[0] };
};

export const setPrimarySpaceImage = async (
  admin: AdminCredentials,
  imageId: string,
): Promise<SpaceImageMutationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("set_primary_space_image", {
    input_admin_name: admin.name.trim(),
    input_admin_phone: admin.phone.trim(),
    input_image_id: imageId,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("set_primary_space_image RPC", response.error);
    return { status: "error", message: toSpaceImageFailureMessage(response.error, SPACE_IMAGE_PRIMARY_GENERIC_FAILURE_MESSAGE) };
  }

  const row = firstSpaceImageRow(response.data);
  if (row === undefined) {
    return { status: "error", message: SPACE_IMAGE_PRIMARY_GENERIC_FAILURE_MESSAGE };
  }

  return { status: "ok", image: mapSpaceImageRows([row])[0] };
};

const SPACE_IMAGE_ADD_GENERIC_FAILURE_MESSAGE = "사진을 추가할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const SPACE_IMAGE_REMOVE_GENERIC_FAILURE_MESSAGE = "사진을 제거할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const SPACE_IMAGE_PRIMARY_GENERIC_FAILURE_MESSAGE = "대표 사진을 지정할 수 없습니다. 잠시 후 다시 시도해 주세요.";

// add_space_image / remove_space_image / set_primary_space_image RPC가 raise exception으로 던진
// 한국어 검증 메시지를 그대로 노출한다.
const toSpaceImageFailureMessage = (error: PostgrestError, genericMessage: string): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return genericMessage;
  }
  return parts.join(" / ");
};

const toOperatingHoursPayload = (hours: readonly OperatingHour[]) =>
  hours.map((hour) => ({
    day_of_week: hour.dayOfWeek,
    open_time: hour.openTime,
    close_time: hour.closeTime,
    is_closed: hour.isClosed,
  }));

export type { SubmitReservationSessionInput };

export type SubmitReservationResult =
  | { readonly status: "ok"; readonly meeting?: Meeting; readonly sessions: readonly ReservationSession[] }
  | { readonly status: "error"; readonly message: string };

export type CancelReservationSessionRequester =
  | { readonly kind: "participant"; readonly participantId: string }
  | { readonly kind: "admin"; readonly credentials: AdminCredentials };

export type CancelReservationSessionResult =
  | { readonly status: "ok"; readonly meeting?: Meeting; readonly sessions: readonly ReservationSession[] }
  | { readonly status: "error"; readonly message: string };

export const submitReservationApplication = async (
  participantId: string,
  meetingName: string,
  sessions: readonly SubmitReservationSessionInput[],
): Promise<SubmitReservationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("submit_reservation_application", {
    input_participant_id: participantId,
    input_meeting_name: meetingName,
    input_sessions: sessions,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("submit_reservation_application RPC", response.error);
    return { status: "error", message: toReservationFailureMessage(response.error) };
  }

  const rows = response.data ?? [];
  const meeting = mapReservationSubmissionRowsToMeeting(rows);
  if (meeting === undefined) {
    return { status: "error", message: RESERVATION_SUBMIT_GENERIC_FAILURE_MESSAGE };
  }

  return {
    status: "ok",
    meeting,
    sessions: mapReservationSubmissionRowsToSessions(rows),
  };
};

export type CancelReservationActor =
  | { readonly type: "participant"; readonly name: string; readonly phone: string }
  | { readonly type: "admin"; readonly name: string; readonly phone: string };

export type CancelReservationResult =
  | { readonly status: "ok"; readonly meetingId: string; readonly cancelledSessionCount: number }
  | { readonly status: "error"; readonly message: string };

const RESERVATION_CANCEL_GENERIC_FAILURE_MESSAGE = "신청 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.";

export const cancelReservationApplication = async (
  meetingId: string,
  actor: CancelReservationActor,
): Promise<CancelReservationResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("cancel_reservation_application", {
    input_meeting_id: meetingId,
    input_actor_type: actor.type,
    input_actor_name: actor.name.trim(),
    input_actor_phone: actor.phone.trim(),
  });

  if (response.error !== null) {
    warnSupabaseAuthError("cancel_reservation_application RPC", response.error);
    if (response.error.code === "P0001" && response.error.message.trim().length > 0) {
      return { status: "error", message: response.error.message };
    }
    return { status: "error", message: RESERVATION_CANCEL_GENERIC_FAILURE_MESSAGE };
  }

  const row = firstCancelReservationRow(response.data);
  if (row === undefined) {
    return { status: "error", message: RESERVATION_CANCEL_GENERIC_FAILURE_MESSAGE };
  }

  return {
    status: "ok",
    meetingId: row.meeting_id,
    cancelledSessionCount: row.cancelled_session_count ?? 0,
  };
};

export const cancelReservationSession = async (
  sessionId: string,
  requester: CancelReservationSessionRequester,
): Promise<CancelReservationSessionResult> => {
  if (supabaseClient === undefined) {
    return { status: "error", message: "Supabase 연결이 설정되지 않았습니다." };
  }

  const response = await supabaseClient.rpc("cancel_reservation_session", {
    input_session_id: sessionId,
    input_participant_id: requester.kind === "participant" ? requester.participantId : null,
    input_admin_name: requester.kind === "admin" ? requester.credentials.name.trim() : null,
    input_admin_phone: requester.kind === "admin" ? requester.credentials.phone.trim() : null,
  });

  if (response.error !== null) {
    warnSupabaseAuthError("cancel_reservation_session RPC", response.error);
    return { status: "error", message: toReservationCancelFailureMessage(response.error) };
  }

  const rows = response.data ?? [];
  return {
    status: "ok",
    meeting: mapReservationSubmissionRowsToMeeting(rows),
    sessions: mapReservationSubmissionRowsToSessions(rows),
  };
};

export const canUseMockFallback = (): boolean => !isSupabaseConfigured;

const RESERVATION_SUBMIT_GENERIC_FAILURE_MESSAGE = "예약 신청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const ADMIN_BLOCK_GENERIC_FAILURE_MESSAGE = "차단 일정을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const ADMIN_SPACE_GENERIC_FAILURE_MESSAGE = "공간 정보를 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const ADMIN_SPACE_CREATE_GENERIC_FAILURE_MESSAGE = "공간을 추가할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const ADMIN_SPACE_OPERATING_HOURS_GENERIC_FAILURE_MESSAGE = "운영시간을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const ADMIN_PARTICIPANT_CREATE_GENERIC_FAILURE_MESSAGE = "참가자를 추가할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const ADMIN_PARTICIPANT_DEACTIVATE_GENERIC_FAILURE_MESSAGE = "참가자를 비활성화할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const ADMIN_ACCOUNT_CREATE_GENERIC_FAILURE_MESSAGE = "관리자 계정을 추가할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const ADMIN_ACCOUNT_DEACTIVATE_GENERIC_FAILURE_MESSAGE = "관리자 계정을 비활성화할 수 없습니다. 잠시 후 다시 시도해 주세요.";

// create_admin_participant / deactivate_admin_participant RPC가 raise exception으로 던진
// 한국어 검증 메시지(예: '이미 등록된 참가자입니다.')를 그대로 노출한다.
const toAdminParticipantFailureMessage = (error: PostgrestError, genericMessage: string): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return genericMessage;
  }
  return parts.join(" / ");
};

// create_admin_account / deactivate_admin_account RPC가 raise exception으로 던진
// 한국어 검증 메시지(예: '본인 계정은 비활성화할 수 없습니다.')를 그대로 노출한다.
const toAdminAccountFailureMessage = (error: PostgrestError, genericMessage: string): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return genericMessage;
  }
  return parts.join(" / ");
};

// RPC 내부에서 raise exception으로 던진 한국어 검증 메시지(코드 P0001)는 사용자에게 그대로 보여주고,
// 그 외 네트워크/서버 오류는 사용자에게 기술적인 내용을 노출하지 않도록 안내 문구로 정리한다.
const toReservationFailureMessage = (error: PostgrestError): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return RESERVATION_SUBMIT_GENERIC_FAILURE_MESSAGE;
  }
  return parts.join(" / ");
};

const toReservationCancelFailureMessage = (error: PostgrestError): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return RESERVATION_CANCEL_GENERIC_FAILURE_MESSAGE;
  }
  return parts.join(" / ");
};

const toAdminBlockFailureMessage = (error: PostgrestError): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return ADMIN_BLOCK_GENERIC_FAILURE_MESSAGE;
  }
  return parts.join(" / ");
};

const toAdminSpaceFailureMessage = (error: PostgrestError): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return ADMIN_SPACE_GENERIC_FAILURE_MESSAGE;
  }
  return parts.join(" / ");
};

const toAdminSpaceCreateFailureMessage = (error: PostgrestError): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return ADMIN_SPACE_CREATE_GENERIC_FAILURE_MESSAGE;
  }
  return parts.join(" / ");
};

const toAdminSpaceOperatingHoursFailureMessage = (error: PostgrestError): string => {
  const parts = [
    error.message.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ].filter((part): part is string => part !== undefined && part.length > 0);

  if (parts.length === 0) {
    return ADMIN_SPACE_OPERATING_HOURS_GENERIC_FAILURE_MESSAGE;
  }
  return parts.join(" / ");
};

const emptyAdminReadModel = (): AdminReadModel => ({
  participants: [],
  spaces: [],
  applications: [],
  adminBlocks: [],
  adminAccounts: [],
});

const warnSupabaseReadError = (label: string, error: PostgrestError): void => {
  console.warn(`[Supabase] ${label} 실패. Supabase 연결 상태에서는 mock fallback을 사용하지 않습니다.`, {
    message: error.message,
    details: error.details,
  });
};

const warnSupabaseAuthError = (label: string, error: PostgrestError): void => {
  console.warn(`[Supabase auth] ${label} 실패. 로그인 실패로 처리합니다.`, {
    message: error.message,
    details: error.details,
  });
};
