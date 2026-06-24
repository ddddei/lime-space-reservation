import type { Meeting } from "../types/reservation";

export const initialMeetings: readonly Meeting[] = [
  {
    id: "meeting-1",
    applicantUserId: "user-1",
    applicantName: "김라임",
    phoneLast4: "5678",
    level: 2,
    meetingName: "생활 기록 클럽",
    purpose: "청년의 생활 루틴을 기록하고 공유하는 6회차 모임",
    status: "approved",
    createdAt: "2026-06-15T09:00:00.000Z",
    updatedAt: "2026-06-15T09:00:00.000Z",
  },
  {
    id: "meeting-2",
    applicantUserId: "user-3",
    applicantName: "박생활",
    phoneLast4: "1204",
    level: 1,
    meetingName: "동네 식물 돌봄 모임",
    purpose: "식물 돌봄 경험을 나누는 작은 워크숍",
    status: "submitted",
    createdAt: "2026-06-18T10:30:00.000Z",
    updatedAt: "2026-06-18T10:30:00.000Z",
  },
];
