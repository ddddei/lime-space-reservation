import { useState, type FormEvent } from "react";
import type { AdminAuthResult } from "../lib/participantAuth";
import { verifyAdminLogin } from "../lib/supabaseReservationApi";
import type { Admin } from "../types/reservation";

type AdminLoginProps = {
  readonly onAuthenticated: (admin: Admin) => void;
};

export function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [authResult, setAuthResult] = useState<AdminAuthResult | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (name.trim().length === 0 || phone.trim().length === 0) {
      return;
    }
    setIsSubmitting(true);
    void verifyAdminLogin(name, phone).then((result) => {
      setAuthResult(result);
      if (result.status === "found") {
        onAuthenticated(result.admin);
      }
    }).finally(() => setIsSubmitting(false));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="ui-card mx-auto grid max-w-2xl gap-4 rounded-2xl p-5"
    >
      <div>
        <p className="text-sm font-extrabold text-[#5F9820]">관리자 로그인</p>
        <h2 className="mt-1 text-2xl font-extrabold text-[#172014]">등록된 관리자만 접근할 수 있습니다</h2>
        <p className="mt-2 text-sm leading-6 text-[#5B6856]">
          등록된 관리자 이름과 전체 전화번호로 권한을 확인합니다.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          관리자 이름
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="ui-input font-medium"
            placeholder="관리자"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          전체 전화번호
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            className="ui-input font-medium"
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
        type="submit"
        disabled={name.trim().length === 0 || phone.trim().length === 0}
        aria-busy={isSubmitting}
        className="ui-button ui-button-secondary w-full"
      >
        {isSubmitting ? "확인 중" : "관리자 로그인"}
      </button>
    </form>
  );
}
