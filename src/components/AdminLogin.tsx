import { useState } from "react";
import { findAdminByNameAndPhone } from "../lib/participantAuth";
import type { AdminAuthResult } from "../lib/participantAuth";
import type { Admin } from "../types/reservation";

type AdminLoginProps = {
  readonly admins: readonly Admin[];
  readonly onAuthenticated: (admin: Admin) => void;
};

export function AdminLogin({ admins, onAuthenticated }: AdminLoginProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [authResult, setAuthResult] = useState<AdminAuthResult | undefined>();

  return (
    <section className="mx-auto grid max-w-2xl gap-4 rounded-lg border border-[#DDE8D6] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,20,0.08)]">
      <div>
        <p className="text-sm font-extrabold text-[#5F9820]">관리자 로그인</p>
        <h2 className="mt-1 text-2xl font-extrabold text-[#172014]">등록된 관리자만 접근할 수 있습니다</h2>
        <p className="mt-2 text-sm leading-6 text-[#5B6856]">
          Admins 시트에 등록된 관리자 이름과 전체 전화번호로 권한을 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          관리자 이름
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium outline-none focus:border-[#77B82A] focus:ring-2 focus:ring-[#77B82A]/20"
            placeholder="관리자"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          전체 전화번호
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium outline-none focus:border-[#77B82A] focus:ring-2 focus:ring-[#77B82A]/20"
            placeholder="010-9000-1000"
          />
        </label>
      </div>
      {authResult !== undefined && (
        <div className={`rounded-lg border p-3 text-sm ${
          authResult.status === "found"
            ? "border-[#DDE8D6] bg-[#F1F8EC] text-[#178A46]"
            : "border-[#F1C5C2] bg-[#FCEBEA] text-[#C9443E]"
        }`}
        >
          {authResult.message}
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          const result = findAdminByNameAndPhone(name, phone, admins);
          setAuthResult(result);
          if (result.status === "found") {
            onAuthenticated(result.admin);
          }
        }}
        disabled={name.trim().length === 0 || phone.trim().length === 0}
        className="rounded-lg bg-[#172014] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#2F3B2A] focus:outline-none focus:ring-2 focus:ring-[#77B82A]/30 disabled:cursor-not-allowed disabled:bg-[#B9C9AE]"
      >
        관리자 로그인
      </button>
    </section>
  );
}

