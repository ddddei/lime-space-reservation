import { initialAdminBlocks } from "../data/mockAdminBlocks";
import { initialAdmins } from "../data/mockAdmins";
import { initialSpaces } from "../data/spaces";
import { initialUsers } from "../data/mockUsers";
import { findAdminByNameAndPhone, findParticipantByNameAndPhone, type AdminAuthResult, type ParticipantAuthResult } from "./participantAuth";
import { supabaseClient } from "./supabaseClient";
import {
  firstAdminVerificationRow,
  firstParticipantVerificationRow,
  mapAdminBlockRows,
  mapAdminVerificationRow,
  mapParticipantVerificationRow,
  mapSpaceRows,
} from "./supabaseMappers";
import type { AdminBlock, Space } from "../types/reservation";
import type { PostgrestError } from "@supabase/supabase-js";

type ReservationReadModel = {
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
};

export const fetchReservationReadModel = async (): Promise<ReservationReadModel | undefined> => {
  if (supabaseClient === undefined) {
    return undefined;
  }

  const spacesResponse = await supabaseClient
    .from("spaces")
    .select("space_id,name,category,capacity,description,image_url,features,is_active,is_public_visible,requires_admin_unlock,parent_space_name,admin_memo,sort_order")
    .eq("is_active", true)
    .eq("is_public_visible", true)
    .order("sort_order", { ascending: true });

  if (spacesResponse.error !== null) {
    warnSupabaseFallback("spaces 조회", spacesResponse.error);
    return undefined;
  }

  if (spacesResponse.data.length === 0) {
    console.warn("[Supabase fallback] spaces 조회 결과가 비어 있어 mock 데이터를 사용합니다.");
    return undefined;
  }

  const publicSpaceIds = spacesResponse.data.map((space) => space.space_id);
  const [operatingHoursResponse, adminBlocksResponse] = await Promise.all([
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
  ]);

  if (operatingHoursResponse.error !== null) {
    warnSupabaseFallback("operating_hours 조회", operatingHoursResponse.error);
    return undefined;
  }

  if (adminBlocksResponse.error !== null) {
    warnSupabaseFallback("admin_blocks 조회", adminBlocksResponse.error);
    return undefined;
  }

  return {
    spaces: mapSpaceRows(spacesResponse.data, operatingHoursResponse.data),
    adminBlocks: mapAdminBlockRows(adminBlocksResponse.data),
  };
};

export const getMockReservationReadModel = (): ReservationReadModel => ({
  spaces: initialSpaces,
  adminBlocks: initialAdminBlocks,
});

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
    warnSupabaseFallback("verify_participant RPC", response.error);
    return findParticipantByNameAndPhone(name, phone, initialUsers);
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
    warnSupabaseFallback("verify_admin RPC", response.error);
    return findAdminByNameAndPhone(name, phone, initialAdmins);
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

const warnSupabaseFallback = (label: string, error: PostgrestError): void => {
  console.warn(`[Supabase fallback] ${label} 실패로 mock 데이터를 사용합니다.`, {
    message: error.message,
    details: error.details,
  });
};
