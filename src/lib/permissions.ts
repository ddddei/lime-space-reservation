import type { ParticipantUser } from "../types/reservation";

export const getChecklistLabels = (user: ParticipantUser): readonly string[] => {
  const missing: string[] = [];
  if (!user.isActive) {
    missing.push("활성 상태");
  }
  return missing;
};
