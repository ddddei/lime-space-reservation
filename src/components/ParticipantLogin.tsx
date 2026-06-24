import { useState } from "react";
import { findParticipantByNameAndPhone } from "../lib/participantAuth";
import type { ParticipantAuthResult } from "../lib/participantAuth";
import type { ParticipantUser } from "../types/reservation";

type ParticipantLoginProps = {
  readonly users: readonly ParticipantUser[];
  readonly onAuthenticated: (user: ParticipantUser) => void;
};

export function ParticipantLogin({ users, onAuthenticated }: ParticipantLoginProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [authResult, setAuthResult] = useState<ParticipantAuthResult | undefined>();

  return (
    <section className="mx-auto grid max-w-3xl gap-4 rounded-lg border border-[#DDE8D6] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,20,0.08)]">
      <div>
        <p className="text-sm font-extrabold text-[#5F9820]">참여자 본인 확인</p>
        <h2 className="mt-1 text-2xl font-extrabold text-[#172014]">등록된 참여자만 예약을 신청할 수 있습니다</h2>
        <p className="mt-2 text-sm leading-6 text-[#5B6856]">
          Users 시트에 등록된 이름과 전체 전화번호로 확인합니다. 전화번호 뒤 4자리는 화면 표시와 공개 현황 마스킹에만 사용합니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          이름
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium outline-none focus:border-[#77B82A] focus:ring-2 focus:ring-[#77B82A]/20"
            placeholder="예: 김라임"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          전체 전화번호
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium outline-none focus:border-[#77B82A] focus:ring-2 focus:ring-[#77B82A]/20"
            placeholder="010-1234-5678"
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
        onClick={() => submitParticipantCheck({
          name,
          phone,
          users,
          setAuthResult,
          onAuthenticated,
        })}
        className="rounded-lg bg-[#77B82A] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#5F9820] focus:outline-none focus:ring-2 focus:ring-[#77B82A]/30 disabled:cursor-not-allowed disabled:bg-[#B9C9AE]"
        disabled={name.trim().length === 0 || phone.trim().length === 0}
      >
        참여자 확인
      </button>
    </section>
  );
}

type SubmitInput = {
  readonly name: string;
  readonly phone: string;
  readonly users: readonly ParticipantUser[];
  readonly setAuthResult: (result: ParticipantAuthResult) => void;
  readonly onAuthenticated: (user: ParticipantUser) => void;
};

function submitParticipantCheck(input: SubmitInput): void {
  const result = findParticipantByNameAndPhone(input.name, input.phone, input.users);
  input.setAuthResult(result);
  if (result.status === "found") {
    input.onAuthenticated(result.user);
  }
}
