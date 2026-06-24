import type { Admin } from "../types/reservation";

type AdminSummaryProps = {
  readonly admin: Admin;
  readonly onLogout: () => void;
};

export function AdminSummary({ admin, onLogout }: AdminSummaryProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[#5F9820]">관리자 로그인 완료</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#172014]">{admin.name}</h2>
          <p className="mt-1 text-sm text-[#5B6856]">권한 {admin.role}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm font-bold text-[#5B6856] hover:border-[#77B82A]"
        >
          관리자 로그아웃
        </button>
      </div>
    </section>
  );
}
