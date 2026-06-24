import { LEVEL_MAX_BLOCKS } from "../data/settings";
import { getEligibility } from "../lib/reservationRules";
import type { Meeting, ParticipantUser, ReservationSession, UserLevel } from "../types/reservation";

type AdminUserChecklistProps = {
  readonly users: readonly ParticipantUser[];
  readonly meetings: readonly Meeting[];
  readonly sessions: readonly ReservationSession[];
  readonly onUpdateUser: (user: ParticipantUser) => void;
};

type BooleanKey = "hasPlan" | "hasBudget" | "hasPromotion" | "hasAdminApproval" | "isActive";

const checklistFields: readonly { readonly key: BooleanKey; readonly label: string }[] = [
  { key: "hasPlan", label: "기획안" },
  { key: "hasBudget", label: "예산안" },
  { key: "hasPromotion", label: "홍보물" },
  { key: "hasAdminApproval", label: "승인" },
  { key: "isActive", label: "활성" },
];

export function AdminUserChecklist({ users, meetings, sessions, onUpdateUser }: AdminUserChecklistProps) {
  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <h2 className="text-lg font-bold text-[#172014]">참여자 체크리스트</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[940px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#DDE8D6] text-xs text-[#5B6856]">
              <th className="py-2 pr-3">참여자</th>
              <th className="px-3">Level</th>
              {checklistFields.map((field) => (
                <th key={field.key} className="px-3">{field.label}</th>
              ))}
              <th className="px-3">예약 가능</th>
              <th className="px-3">불가 사유</th>
              <th className="px-3">블록</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const eligibility = getEligibility(user, { meetings, sessions });
              return (
                <tr key={user.id} className="border-b border-[#EBF2E7]">
                  <td className="py-3 pr-3 font-bold text-[#172014]">
                    {user.name}
                    <span className="block text-xs font-medium text-[#819078]">{user.phone}</span>
                  </td>
                  <td className="px-3">
                    <select
                      value={user.level}
                      onChange={(event) => updateLevel(user, Number(event.target.value), onUpdateUser)}
                      className="rounded border border-[#DDE8D6] px-2 py-1"
                    >
                      <option value={1}>Level 1</option>
                      <option value={2}>Level 2</option>
                    </select>
                  </td>
                  {checklistFields.map((field) => (
                    <td key={field.key} className="px-3">
                      <input
                        type="checkbox"
                        checked={user[field.key]}
                        onChange={() => onUpdateUser({ ...user, [field.key]: !user[field.key] })}
                        className="h-4 w-4 accent-[#77B82A]"
                        aria-label={`${user.name} ${field.label}`}
                      />
                    </td>
                  ))}
                  <td className="px-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${eligibility.canReserve ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FCEBEA] text-[#C9443E]"}`}>
                      {eligibility.canReserve ? "가능" : "불가"}
                    </span>
                  </td>
                  <td className="max-w-[240px] px-3 text-xs text-[#C9443E]">
                    {eligibility.missingRequirements.length === 0 ? (
                      <span className="text-[#819078]">없음</span>
                    ) : (
                      eligibility.missingRequirements.join(", ")
                    )}
                  </td>
                  <td className="px-3 text-[#5B6856]">
                    {eligibility.usedBlocks}/{user.maxBlocks}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function updateLevel(user: ParticipantUser, value: number, onUpdateUser: (user: ParticipantUser) => void): void {
  if (value === 1 || value === 2) {
    const level: UserLevel = value;
    onUpdateUser({ ...user, level, maxBlocks: LEVEL_MAX_BLOCKS[level] });
  }
}
