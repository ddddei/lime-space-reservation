import type { ParticipantUser } from "../types/reservation";

export const getChecklistLabels = (user: ParticipantUser): readonly string[] => {
  const missing: string[] = [];
  if (!user.hasPlan) {
    missing.push("기획안 제출");
  }
  if (!user.hasBudget) {
    missing.push("예산안 제출");
  }
  if (!user.hasPromotion) {
    missing.push("홍보물 제출");
  }
  if (!user.hasAdminApproval) {
    missing.push("관리자 최종 승인");
  }
  if (!user.isActive) {
    missing.push("활성 사용자");
  }
  return missing;
};
