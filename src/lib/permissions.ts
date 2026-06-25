import type { ParticipantUser } from "../types/reservation";

export const RESERVATION_APPROVAL_GUIDE_MESSAGE = "관리자 승인 후 공간 예약 신청이 가능합니다.";

export const getChecklistLabels = (user: ParticipantUser): readonly string[] => {
  const missing: string[] = [];
  if (!user.hasAdminApproval) {
    missing.push("관리자 승인");
  }
  return missing;
};
