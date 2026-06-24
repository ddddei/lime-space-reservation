import type { ParticipantUser } from "../types/reservation";

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

export const findParticipantByNameAndPhoneLast4 = (
  name: string,
  phoneLast4: string,
  users: readonly ParticipantUser[],
): ParticipantAuthResult => {
  const normalizedName = normalizeText(name);
  const normalizedLast4 = phoneLast4.trim();
  const matches = users.filter(
    (user) => normalizeText(user.name) === normalizedName && user.phoneLast4 === normalizedLast4,
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
      message: "동일한 이름과 전화번호 뒤 4자리가 여러 명 조회되었습니다. 전체 전화번호를 입력해 주세요.",
    };
  }

  return {
    status: "not_found",
    message: "예약 대상자로 확인되지 않습니다. 관리자에게 문의해 주세요.",
  };
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
      message: "전체 전화번호로 참여자 확인이 완료되었습니다.",
    };
  }

  return {
    status: "not_found",
    message: "예약 대상자로 확인되지 않습니다. 관리자에게 문의해 주세요.",
  };
};

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ");

const normalizePhone = (value: string): string => value.replace(/\D/g, "");
