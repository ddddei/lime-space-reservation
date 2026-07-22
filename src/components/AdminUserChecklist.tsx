import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, RotateCcw, UserX } from "lucide-react";
import type { AdminApplication, ParticipantUser, UserLevel } from "../types/reservation";

export type CreateParticipantFormInput = {
  readonly name: string;
  readonly phone: string;
  readonly level: UserLevel;
  readonly memo?: string;
};

type ParticipantMutationResult =
  | { readonly status: "ok" }
  | { readonly status: "error"; readonly message: string };

type AdminUserChecklistProps = {
  readonly users: readonly ParticipantUser[];
  readonly applications: readonly AdminApplication[];
  readonly readOnly: boolean;
  readonly canManageParticipants: boolean;
  readonly onToggleApproval: (user: ParticipantUser, nextValue: boolean) => Promise<boolean>;
  readonly onUpdateLevel: (user: ParticipantUser, nextLevel: UserLevel) => Promise<boolean>;
  readonly onCreateParticipant: (input: CreateParticipantFormInput) => Promise<ParticipantMutationResult>;
  readonly onDeactivateParticipant: (user: ParticipantUser) => Promise<ParticipantMutationResult>;
  readonly onReactivateParticipant: (user: ParticipantUser) => Promise<ParticipantMutationResult>;
};

const defaultVisibleCount = 6;

export function AdminUserChecklist({
  users,
  applications,
  readOnly,
  canManageParticipants,
  onToggleApproval,
  onUpdateLevel,
  onCreateParticipant,
  onDeactivateParticipant,
  onReactivateParticipant,
}: AdminUserChecklistProps) {
  const [showAll, setShowAll] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [savingIds, setSavingIds] = useState<readonly string[]>([]);
  const [errorsById, setErrorsById] = useState<Readonly<Record<string, string | undefined>>>({});

  const activeUsers = users.filter((user) => user.isActive);
  const inactiveUsers = users.filter((user) => !user.isActive);
  const listedUsers = showInactive ? users : activeUsers;
  const visibleUsers = showAll ? listedUsers : listedUsers.slice(0, defaultVisibleCount);

  const handleToggleApproval = (user: ParticipantUser): void => {
    const nextValue = !user.hasAdminApproval;
    setSavingIds((current) => [...current, user.id]);
    setErrorsById((current) => ({ ...current, [user.id]: undefined }));
    void onToggleApproval(user, nextValue)
      .then((success) => {
        if (!success) {
          setErrorsById((current) => ({ ...current, [user.id]: "예약 승인 상태를 변경하지 못했습니다." }));
        }
      })
      .finally(() => {
        setSavingIds((current) => current.filter((id) => id !== user.id));
      });
  };

  const handleLevelChange = (user: ParticipantUser, nextLevel: UserLevel): void => {
    if (nextLevel === user.level) {
      return;
    }
    setSavingIds((current) => [...current, user.id]);
    setErrorsById((current) => ({ ...current, [user.id]: undefined }));
    void onUpdateLevel(user, nextLevel)
      .then((success) => {
        if (!success) {
          setErrorsById((current) => ({ ...current, [user.id]: "Level을 변경하지 못했습니다." }));
        }
      })
      .finally(() => {
        setSavingIds((current) => current.filter((id) => id !== user.id));
      });
  };

  const handleDeactivate = (user: ParticipantUser): void => {
    if (!window.confirm(`${user.name} 참가자를 비활성화할까요? 예약 이력은 그대로 유지되고, 목록에서는 "비활성 포함 보기"를 켜야 다시 보입니다.`)) {
      return;
    }
    setSavingIds((current) => [...current, user.id]);
    setErrorsById((current) => ({ ...current, [user.id]: undefined }));
    void onDeactivateParticipant(user)
      .then((result) => {
        if (result.status === "error") {
          setErrorsById((current) => ({ ...current, [user.id]: result.message }));
        }
      })
      .finally(() => {
        setSavingIds((current) => current.filter((id) => id !== user.id));
      });
  };

  const handleReactivate = (user: ParticipantUser): void => {
    setSavingIds((current) => [...current, user.id]);
    setErrorsById((current) => ({ ...current, [user.id]: undefined }));
    void onReactivateParticipant(user)
      .then((result) => {
        if (result.status === "error") {
          setErrorsById((current) => ({ ...current, [user.id]: result.message }));
        }
      })
      .finally(() => {
        setSavingIds((current) => current.filter((id) => id !== user.id));
      });
  };

  return (
    <section className="min-w-0 rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">참여자 체크리스트</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            예약 승인 여부를 기준으로 예약 신청 가능 여부를 판단합니다. 전체 {listedUsers.length}명 중 {visibleUsers.length}명 표시
            {inactiveUsers.length > 0 && ` (비활성 ${inactiveUsers.length}명 ${showInactive ? "포함" : "숨김"})`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {inactiveUsers.length > 0 && (
            <label className="inline-flex items-center gap-2 text-xs font-bold text-[#5B6856]">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={() => setShowInactive((current) => !current)}
                className="h-4 w-4 accent-[#77B82A]"
              />
              비활성 포함 보기
            </label>
          )}
          {listedUsers.length > defaultVisibleCount && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#DDE8D6] px-3 py-2 text-xs font-extrabold text-[#5B6856] hover:border-[#77B82A]"
            >
              {showAll ? <ChevronUp size={13} strokeWidth={2.3} /> : <ChevronDown size={13} strokeWidth={2.3} />}
              {showAll ? "접기" : "더보기"}
            </button>
          )}
        </div>
      </div>

      {canManageParticipants && (
        <CreateParticipantPanel onCreateParticipant={onCreateParticipant} />
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#DDE8D6] text-xs text-[#5B6856]">
              <th className="py-2 pr-3">참여자</th>
              <th className="px-3">예약 승인</th>
              <th className="px-3">예약 가능</th>
              <th className="px-3">Level</th>
              <th className="px-3">사용 시간</th>
              <th className="px-3">자료 확인</th>
              <th className="px-3">메모</th>
              {canManageParticipants && <th className="px-3">관리</th>}
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => {
              const usedBlocks = applications
                .filter((application) => application.applicantParticipantId === user.id && application.sessionStatus !== "cancelled")
                .reduce((total, application) => total + application.blockCount, 0);
              const canReserve = user.isActive && user.hasAdminApproval && usedBlocks < user.maxBlocks;
              const isSaving = savingIds.includes(user.id);
              const errorMessage = errorsById[user.id];
              return (
                <tr key={user.id} className={`border-b border-[#EBF2E7] ${user.isActive ? "" : "bg-[#F7F7F5] text-[#A3ACA0]"}`}>
                  <td className="py-2 pr-3 font-bold text-[#172014]">
                    <span className={user.isActive ? "" : "text-[#A3ACA0]"}>{user.name}</span>
                    {!user.isActive && <span className="ml-2 rounded-full bg-[#EAEAE6] px-2 py-0.5 text-[10px] font-extrabold text-[#7A8175]">비활성</span>}
                    <span className="block text-xs font-medium text-[#819078]">끝자리 {user.phoneLast4}</span>
                  </td>
                  <td className="px-3">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#5B6856]">
                      <input
                        type="checkbox"
                        checked={user.hasAdminApproval}
                        disabled={isSaving || !user.isActive}
                        onChange={() => handleToggleApproval(user)}
                        className="h-4 w-4 accent-[#77B82A]"
                        aria-label={`${user.name} 예약 승인`}
                      />
                      {isSaving ? "저장 중" : user.hasAdminApproval ? "승인 완료" : "승인 대기"}
                    </label>
                    {errorMessage !== undefined && (
                      <p className="mt-1 text-xs font-bold text-[#C9443E]">{errorMessage}</p>
                    )}
                  </td>
                  <td className="px-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${canReserve ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FFF6E3] text-[#B76E00]"}`}>
                      {canReserve ? "가능" : user.hasAdminApproval ? "불가" : "승인 대기"}
                    </span>
                  </td>
                  <td className="px-3">
                    <select
                      value={user.level}
                      disabled={readOnly || isSaving || !user.isActive}
                      onChange={(event) => {
                        const nextLevel = toUserLevel(event.target.value);
                        if (nextLevel !== undefined) {
                          handleLevelChange(user, nextLevel);
                        }
                      }}
                      className="rounded border border-[#DDE8D6] px-2 py-1 text-xs font-bold text-[#172014] disabled:bg-[#F1F8EC] disabled:text-[#819078]"
                      aria-label={`${user.name} Level`}
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
                  {canManageParticipants && (
                    <td className="px-3">
                      {user.isActive ? (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleDeactivate(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#F1C5C2] px-2 py-1 text-xs font-extrabold text-[#C9443E] hover:bg-[#FCEBEA] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <UserX size={13} strokeWidth={2.3} />
                          비활성
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleReactivate(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#DDE8D6] px-2 py-1 text-xs font-extrabold text-[#5B6856] hover:border-[#77B82A] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RotateCcw size={13} strokeWidth={2.3} />
                          재활성
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type CreateParticipantPanelProps = {
  readonly onCreateParticipant: (input: CreateParticipantFormInput) => Promise<ParticipantMutationResult>;
};

type CreateParticipantNotice = {
  readonly tone: "success" | "error";
  readonly message: string;
};

function CreateParticipantPanel({ onCreateParticipant }: CreateParticipantPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState<UserLevel>(1);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<CreateParticipantNotice | undefined>();

  const resetForm = (): void => {
    setName("");
    setPhone("");
    setLevel(1);
    setMemo("");
  };

  const handleSubmit = (): void => {
    if (name.trim().length === 0) {
      setNotice({ tone: "error", message: "이름을 입력해 주세요." });
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setNotice({ tone: "error", message: "전화번호를 010-0000-0000 형식으로 입력해 주세요." });
      return;
    }

    setSaving(true);
    setNotice(undefined);
    void onCreateParticipant({ name: name.trim(), phone: phone.trim(), level, memo: memo.trim() })
      .then((result) => {
        if (result.status === "error") {
          setNotice({ tone: "error", message: result.message });
          return;
        }
        setNotice({ tone: "success", message: "참가자를 추가했습니다." });
        resetForm();
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <div className="mt-3 rounded-lg border border-[#DDE8D6]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-extrabold text-[#172014]"
      >
        <span className="inline-flex items-center gap-1">
          <Plus size={14} strokeWidth={2.3} />
          참가자 추가
        </span>
        {expanded ? <ChevronUp size={14} strokeWidth={2.3} /> : <ChevronDown size={14} strokeWidth={2.3} />}
      </button>
      {expanded && (
        <div className="grid gap-3 border-t border-[#EBF2E7] p-3">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="grid gap-1 text-xs font-bold text-[#172014]">
              이름
              <input
                value={name}
                disabled={saving}
                onChange={(event) => setName(event.target.value)}
                className="rounded border border-[#DDE8D6] px-2 py-1.5 text-sm"
                placeholder="홍길동"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-[#172014]">
              전화번호
              <input
                value={phone}
                disabled={saving}
                onChange={(event) => setPhone(event.target.value)}
                className="rounded border border-[#DDE8D6] px-2 py-1.5 text-sm"
                placeholder="010-0000-0000"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-[#172014]">
              Level
              <select
                value={level}
                disabled={saving}
                onChange={(event) => {
                  const nextLevel = toUserLevel(event.target.value);
                  if (nextLevel !== undefined) {
                    setLevel(nextLevel);
                  }
                }}
                className="rounded border border-[#DDE8D6] px-2 py-1.5 text-sm"
              >
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-[#172014]">
              메모 (선택)
              <input
                value={memo}
                disabled={saving}
                onChange={(event) => setMemo(event.target.value)}
                className="rounded border border-[#DDE8D6] px-2 py-1.5 text-sm"
                placeholder="예: 7월 신규 합류"
              />
            </label>
          </div>
          {notice !== undefined && (
            <p className={`text-xs font-bold ${notice.tone === "success" ? "text-[#178A46]" : "text-[#C9443E]"}`}>
              {notice.message}
            </p>
          )}
          <div>
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1 rounded-lg bg-[#77B82A] px-3 py-2 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "저장 중" : "추가"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const toUserLevel = (value: string): UserLevel | undefined => {
  if (value === "1") {
    return 1;
  }
  if (value === "2") {
    return 2;
  }
  return undefined;
};

function getDocumentSummary(user: ParticipantUser): string {
  const missing = [
    user.hasPlan ? undefined : "기획안",
    user.hasBudget ? undefined : "예산안",
    user.hasPromotion ? undefined : "홍보물",
    user.hasAdminApproval ? undefined : "관리자 승인",
  ].filter((item): item is string => item !== undefined);
  return missing.length === 0 ? "전체 확인" : `대기: ${missing.join(", ")}`;
}
