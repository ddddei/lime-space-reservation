import type { EligibilityResult, ParticipantUser } from "../types/reservation";

type EligibilityPanelProps = {
  readonly eligibility: EligibilityResult;
  readonly user: ParticipantUser;
};

export function EligibilityPanel({ eligibility, user }: EligibilityPanelProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">예약 가능 여부</h2>
          <p className="text-sm text-[#5B6856]">{user.name}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${eligibility.canReserve ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FCEBEA] text-[#C9443E]"}`}>
          {eligibility.canReserve ? "예약 가능" : "예약 불가"}
        </span>
      </div>
      <div className="mt-3 rounded-lg bg-[#F7FBF4] p-3 text-sm text-[#5B6856]">
        사용 {eligibility.usedBlocks / 2}시간 / 최대 {user.maxBlocks / 2}시간, 잔여 {eligibility.remainingBlocks / 2}시간
      </div>
      {eligibility.missingRequirements.length > 0 && (
        <ul className="mt-3 grid gap-2 text-sm text-[#C9443E]">
          {eligibility.missingRequirements.map((requirement) => (
            <li key={requirement} className="rounded-lg bg-[#FCEBEA] px-3 py-2">{requirement} 필요</li>
          ))}
        </ul>
      )}
    </section>
  );
}
