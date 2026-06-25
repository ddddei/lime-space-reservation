import { LogOut } from "lucide-react";
import { getAdminRoleLabel } from "../lib/displayLabels";
import type { Admin } from "../types/reservation";

type AdminSummaryProps = {
  readonly admin: Admin;
  readonly onLogout: () => void;
};

export function AdminSummary({ admin, onLogout }: AdminSummaryProps) {
  return (
    <section className="ui-card min-w-0 rounded-2xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[#5F9820]">관리자 로그인 완료</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#172014]">{admin.name}</h2>
          <p className="mt-1 text-sm text-[#5B6856]">권한 {getAdminRoleLabel(admin.role)}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="ui-button ui-button-ghost"
        >
          <LogOut size={16} strokeWidth={2.3} />
          관리자 로그아웃
        </button>
      </div>
    </section>
  );
}
