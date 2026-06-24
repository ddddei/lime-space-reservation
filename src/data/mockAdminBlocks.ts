import type { AdminBlock } from "../types/reservation";

export const initialAdminBlocks: readonly AdminBlock[] = [
  {
    id: "block-1",
    spaceId: "lifestyle-2",
    date: "2026-06-27",
    startTime: "13:00",
    endTime: "15:00",
    reason: "공간 점검",
    createdBy: "관리자",
    isActive: true,
    createdAt: "2026-06-20T04:00:00.000Z",
  },
  {
    id: "block-2",
    spaceId: "multi-room-2",
    date: "2026-06-29",
    startTime: "09:00",
    endTime: "12:00",
    reason: "내부 행사",
    createdBy: "관리자",
    isActive: true,
    createdAt: "2026-06-21T02:00:00.000Z",
  },
];
