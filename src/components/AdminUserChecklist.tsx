import { useState } from "react";
import { LEVEL_MAX_BLOCKS } from "../data/settings";
import type { AdminApplication, ParticipantUser, UserLevel } from "../types/reservation";

type AdminUserChecklistProps = {
  readonly users: readonly ParticipantUser[];
  readonly applications: readonly AdminApplication[];
  readonly readOnly: boolean;
  readonly onUpdateUser: (user: ParticipantUser) => void;
};

const defaultVisibleCount = 6;

export function AdminUserChecklist({ users, applications, readOnly, onUpdateUser }: AdminUserChecklistProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleUsers = showAll ? users : users.slice(0, defaultVisibleCount);

  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">참여자 체크리스트</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            활성 상태를 기준으로 예약 가능 여부를 판단합니다. 전체 {users.length}명 중 {visibleUsers.length}명 표시
          </p>
        </div>
        {users.length > defaultVisibleCount && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-xs font-extrabold text-[#5B6856] hover:border-[#77B82A]"
          >
            {showAll ? "접기" : "더보기"}
          </button>
        )}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#DDE8D6] text-xs text-[#5B6856]">
              <th className="py-2 pr-3">참여자</th>
              <th className="px-3">활성</th>
              <th className="px-3">예약 가능</th>
              <th className="px-3">Level</th>
              <th className="px-3">사용 시간</th>
              <th className="px-3">자료 확인</th>
              <th className="px-3">메모</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => {
              const usedBlocks = applications
                .filter((application) => application.applicantParticipantId === user.id && application.sessionStatus !== "cancelled")
                .reduce((total, application) => total + application.blockCount, 0);
              const canReserve = user.isActive && user.hasAdminApproval && usedBlocks < user.maxBlocks;
              return (
                <tr key={user.id} className="border-b border-[#EBF2E7]">
                  <td className="py-2 pr-3 font-bold text-[#172014]">
                    {user.name}
                    <span className="block text-xs font-medium text-[#819078]">끝자리 {user.phoneLast4}</span>
                  </td>
                  <td className="px-3">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#5B6856]">
                      <input
                        type="checkbox"
                        checked={user.isActive}
                        disabled={readOnly}
                        onChange={() => onUpdateUser({ ...user, isActive: !user.isActive })}
                        className="h-4 w-4 accent-[#77B82A]"
                        aria-label={`${user.name} 활성`}
                      />
                      {user.isActive ? "활성" : "대기"}
                    </label>
                  </td>
                  <td className="px-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${canReserve ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FFF6E3] text-[#B76E00]"}`}>
                      {canReserve ? "가능" : user.isActive ? "불가" : "대기"}
                    </span>
                  </td>
                  <td className="px-3">
                    <select
                      value={user.level}
                      disabled={readOnly}
                      onChange={(event) => updateLevel(user, Number(event.target.value), onUpdateUser)}
                      className="rounded border border-[#DDE8D6] px-2 py-1"
                    >
                      <option value={1}>Level 1</option>
                      <option value={2}>Level 2</option>
                    </select>
                  </td>
                  <td className="px-3 text-[#5B6856]">
                    {usedBlocks / 2}/{user.maxBlocks / 2}시간
                  </td>
                  <td className="max-w-[220px] px-3 text-xs text-[#5B6856]">
                    {getDocumentSummary(user)}
                  </td>
                  <td className="max-w-[220px] px-3 text-xs text-[#819078]">
                    {user.memo.length > 0 ? user.memo : "없음"}
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

function getDocumentSummary(user: ParticipantUser): string {
  const missing = [
    user.hasPlan ? undefined : "기획안",
    user.hasBudget ? undefined : "예산안",
    user.hasPromotion ? undefined : "홍보물",
    user.hasAdminApproval ? undefined : "관리자 승인",
  ].filter((item): item is string => item !== undefined);
  return missing.length === 0 ? "전체 확인" : `대기: ${missing.join(", ")}`;
}
