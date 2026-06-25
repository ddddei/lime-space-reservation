import { RESERVATION_APPROVAL_GUIDE_MESSAGE } from "../lib/permissions";
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
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${user.hasAdminApproval ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FFF6E3] text-[#B76E00]"}`}>
            {user.hasAdminApproval ? "예약 승인 완료" : "예약 승인 대기"}
          </span>
          <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${eligibility.canReserve ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FCEBEA] text-[#C9443E]"}`}>
            {eligibility.canReserve ? "예약 가능" : "예약 불가"}
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-[#F7FBF4] p-3 text-sm text-[#5B6856]">
        사용 {eligibility.usedBlocks / 2}시간 / 최대 {user.maxBlocks / 2}시간, 잔여 {eligibility.remainingBlocks / 2}시간
      </div>
      {!user.hasAdminApproval && (
        <div className="mt-3 rounded-lg border border-[#FBDFAE] bg-[#FFF6E3] px-3 py-2 text-sm font-bold text-[#B76E00]">
          {RESERVATION_APPROVAL_GUIDE_MESSAGE}
        </div>
      )}
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
