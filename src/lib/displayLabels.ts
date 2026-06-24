import type { MeetingStatus, SessionStatus, SpaceCategory } from "../types/reservation";

export const getMeetingStatusLabel = (status: MeetingStatus): string => {
  switch (status) {
    case "draft":
      return "임시 저장";
    case "submitted":
      return "제출 완료";
    case "approved":
      return "승인 완료";
    case "rejected":
      return "반려됨";
  }
};

export const getSessionStatusLabel = (status: SessionStatus): string => {
  switch (status) {
    case "requested":
      return "신청 요청";
    case "confirmed":
      return "예약 확정";
    case "cancelled":
      return "취소됨";
  }
};

export const getSpaceCategoryLabel = (category: SpaceCategory): string => {
  switch (category) {
    case "lifestyle":
      return "생활밀착형";
    case "youth-building":
      return "청년동";
  }
};

export const getAdminRoleLabel = (role: string): string => {
  switch (role) {
    case "system-admin":
      return "시스템 관리자";
    case "space-manager":
      return "공간 관리자";
    default:
      return role;
  }
};
