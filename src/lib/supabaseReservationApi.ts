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
    .select("id,name,category,capacity,description,image_url,features,is_active,is_public_visible,requires_admin_unlock,parent_space_name,admin_memo,sort_order")
    .eq("is_active", true)
    .eq("is_public_visible", true)
    .order("sort_order", { ascending: true });

  if (spacesResponse.error !== null || spacesResponse.data.length === 0) {
    return undefined;
  }

  const publicSpaceIds = spacesResponse.data.map((space) => space.id);
  const [operatingHoursResponse, adminBlocksResponse] = await Promise.all([
    supabaseClient
      .from("operating_hours")
      .select("space_id,day_of_week,open_time,close_time,is_closed")
      .in("space_id", publicSpaceIds)
      .order("day_of_week", { ascending: true }),
    supabaseClient
      .from("admin_blocks")
      .select("id,space_id,date,start_time,end_time,reason,created_by,is_active,created_at")
      .eq("is_active", true)
      .in("space_id", publicSpaceIds)
      .order("date", { ascending: true }),
  ]);

  if (operatingHoursResponse.error !== null || adminBlocksResponse.error !== null) {
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
    p_name: name.trim(),
    p_phone: phone.trim(),
  });

  if (response.error !== null) {
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
    p_name: name.trim(),
    p_phone: phone.trim(),
  });

  if (response.error !== null) {
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
