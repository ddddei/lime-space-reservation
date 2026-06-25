import type { EligibilityResult, ParticipantUser } from "../types/reservation";

type ParticipantSummaryProps = {
  readonly user: ParticipantUser;
  readonly eligibility: EligibilityResult;
  readonly onLogout: () => void;
};

export function ParticipantSummary({ user, eligibility, onLogout }: ParticipantSummaryProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[#5F9820]">참여자 확인 완료</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#172014]">{user.name}</h2>
          <p className="mt-1 text-sm text-[#5B6856]">
            전화번호 끝자리 {user.phoneLast4}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${eligibility.canReserve ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FCEBEA] text-[#C9443E]"}`}>
            {eligibility.canReserve ? "예약 가능" : "예약 불가"}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-sm font-bold text-[#5B6856] hover:border-[#77B82A]"
          >
            다른 참여자로 확인하기
          </button>
        </div>
      </div>
    </section>
  );
}
