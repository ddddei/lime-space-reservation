import { initialAdminBlocks } from "../data/mockAdminBlocks";
import { initialAdmins } from "../data/mockAdmins";
import { initialSpaces } from "../data/spaces";
import { initialUsers } from "../data/mockUsers";
import { findAdminByNameAndPhone, findParticipantByNameAndPhone, type AdminAuthResult, type ParticipantAuthResult } from "./participantAuth";
import { isSupabaseConfigured, supabaseClient } from "./supabaseClient";
import {
  firstAdminParticipantRow,
  firstAdminVerificationRow,
  firstParticipantVerificationRow,
  mapAdminApplicationRows,
  mapAdminBlockRows,
  mapAdminParticipantRows,
  mapAdminVerificationRow,
  mapParticipantVerificationRow,
  type SpaceImageRow,
  mapSpaceRows,
} from "./supabaseMappers";
import type { AdminApplication, AdminBlock, Space, ParticipantUser } from "../types/reservation";
import type { PostgrestError } from "@supabase/supabase-js";

type ReservationReadModel = {
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
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
    return { spaces: [], adminBlocks: [] };
  }

  const publicSpaceIds = spacesResponse.data.map((space) => space.space_id);
  if (publicSpaceIds.length === 0) {
    return { spaces: [], adminBlocks: [] };
  }

  const [operatingHoursResponse, adminBlocksResponse, spaceImagesResponse] = await Promise.all([
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
    fetchSpaceImageRows(publicSpaceIds),
  ]);

  if (operatingHoursResponse.error !== null) {
    warnSupabaseReadError("operating_hours 조회", operatingHoursResponse.error);
    return { spaces: mapSpaceRows(spacesResponse.data, [], spaceImagesResponse.rows), adminBlocks: [] };
  }

  if (adminBlocksResponse.error !== null) {
    warnSupabaseReadError("공개 admin_blocks 조회", adminBlocksResponse.error);
    return { spaces: mapSpaceRows(spacesResponse.data, operatingHoursResponse.data, spaceImagesResponse.rows), adminBlocks: [] };
  }

  return {
    spaces: mapSpaceRows(spacesResponse.data, operatingHoursResponse.data, spaceImagesResponse.rows),
    adminBlocks: mapAdminBlockRows(adminBlocksResponse.data),
  };
};

export const getMockReservationReadModel = (): ReservationReadModel => ({
  spaces: initialSpaces,
  adminBlocks: initialAdminBlocks,
});

export const fetchAdminReadModel = async (credentials: AdminCredentials): Promise<AdminReadModel | undefined> => {
  if (supabaseClient === undefined) {
    return undefined;
  }

  const args = {
    input_admin_name: credentials.name.trim(),
    input_admin_phone: credentials.phone.trim(),
  };
  const [participantsResponse, spacesResponse, applicationsResponse, blocksResponse] = await Promise.all([
    supabaseClient.rpc("get_admin_participants", args),
    supabaseClient.rpc("get_admin_spaces", args),
    supabaseClient.rpc("get_admin_applications", args),
    supabaseClient.rpc("get_admin_blocks", args),
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

  const adminSpaceRows = spacesResponse.data ?? [];
  const adminSpaceIds = adminSpaceRows.map((space) => space.space_id);
  const spaceImagesResponse = await fetchSpaceImageRows(adminSpaceIds);

  return {
    participants: mapAdminParticipantRows(participantsResponse.data ?? []),
    spaces: mapSpaceRows(adminSpaceRows, [], spaceImagesResponse.rows),
    applications: mapAdminApplicationRows(applicationsResponse.data ?? []),
    adminBlocks: mapAdminBlockRows(blocksResponse.data ?? []),
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

export const canUseMockFallback = (): boolean => !isSupabaseConfigured;

const emptyAdminReadModel = (): AdminReadModel => ({
  participants: [],
  spaces: [],
  applications: [],
  adminBlocks: [],
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
