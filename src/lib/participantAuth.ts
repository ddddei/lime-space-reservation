import type { Admin, ParticipantUser } from "../types/reservation";

export type ParticipantAuthResult =
  | {
      readonly status: "found";
      readonly user: ParticipantUser;
      readonly message: string;
    }
  | {
      readonly status: "not_found" | "multiple";
      readonly message: string;
    };

export type AdminAuthResult =
  | {
      readonly status: "found";
      readonly admin: Admin;
      readonly message: string;
    }
  | {
      readonly status: "not_found";
      readonly message: string;
    };

export const findParticipantByNameAndPhone = (
  name: string,
  phone: string,
  users: readonly ParticipantUser[],
): ParticipantAuthResult => {
  const normalizedName = normalizeText(name);
  const normalizedPhone = normalizePhone(phone);
  const matches = users.filter(
    (user) => normalizeText(user.name) === normalizedName && normalizePhone(user.phone) === normalizedPhone,
  );

  if (matches.length === 1) {
    return {
      status: "found",
      user: matches[0],
      message: "참여자 확인이 완료되었습니다.",
    };
  }

  if (matches.length > 1) {
    return {
      status: "multiple",
      message: "동일한 이름과 전화번호가 여러 명 조회되었습니다. 관리자에게 문의해 주세요.",
    };
  }

  return {
    status: "not_found",
    message: "예약 대상자로 확인되지 않습니다. 관리자에게 문의해 주세요.",
  };
};

export const findAdminByNameAndPhone = (
  name: string,
  phone: string,
  admins: readonly Admin[],
): AdminAuthResult => {
  const normalizedName = normalizeText(name);
  const normalizedPhone = normalizePhone(phone);
  const admin = admins.find(
    (item) =>
      normalizeText(item.name) === normalizedName &&
      normalizePhone(item.phone) === normalizedPhone &&
      item.isActive,
  );

  if (admin !== undefined) {
    return {
      status: "found",
      admin,
      message: "관리자 확인이 완료되었습니다.",
    };
  }

  return {
    status: "not_found",
    message: "관리자 권한을 확인할 수 없습니다.",
  };
};

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ");

const normalizePhone = (value: string): string => value.replace(/\D/g, "");
