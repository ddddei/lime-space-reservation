import type { Admin } from "../types/reservation";

export const initialAdmins: readonly Admin[] = [
  {
    id: "admin-1",
    name: "관리자",
    phone: "010-9000-1000",
    phoneLast4: "1000",
    role: "system-admin",
    isActive: true,
  },
  {
    id: "admin-2",
    name: "공간매니저",
    phone: "010-9000-2000",
    phoneLast4: "2000",
    role: "space-manager",
    isActive: true,
  },
];
