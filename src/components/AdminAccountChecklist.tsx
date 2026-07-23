import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, RotateCcw, UserX } from "lucide-react";
import type { Admin } from "../types/reservation";

export type CreateAdminAccountFormInput = {
  readonly name: string;
  readonly phone: string;
  readonly role?: string;
};

type AdminAccountMutationResult =
  | { readonly status: "ok" }
  | { readonly status: "error"; readonly message: string };

type AdminAccountChecklistProps = {
  readonly accounts: readonly Admin[];
  readonly currentAdminId: string;
  readonly canManageAccounts: boolean;
  readonly onCreateAccount: (input: CreateAdminAccountFormInput) => Promise<AdminAccountMutationResult>;
  readonly onDeactivateAccount: (account: Admin) => Promise<AdminAccountMutationResult>;
  readonly onReactivateAccount: (account: Admin) => Promise<AdminAccountMutationResult>;
};

const defaultVisibleCount = 6;

export function AdminAccountChecklist({
  accounts,
  currentAdminId,
  canManageAccounts,
  onCreateAccount,
  onDeactivateAccount,
  onReactivateAccount,
}: AdminAccountChecklistProps) {
  const [showAll, setShowAll] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [savingIds, setSavingIds] = useState<readonly string[]>([]);
  const [errorsById, setErrorsById] = useState<Readonly<Record<string, string | undefined>>>({});

  const activeAccounts = accounts.filter((account) => account.isActive);
  const inactiveAccounts = accounts.filter((account) => !account.isActive);
  const listedAccounts = showInactive ? accounts : activeAccounts;
  const visibleAccounts = showAll ? listedAccounts : listedAccounts.slice(0, defaultVisibleCount);

  const handleDeactivate = (account: Admin): void => {
    if (!window.confirm(`${account.name} 관리자 계정을 비활성화할까요? 로그인 권한이 즉시 제거됩니다.`)) {
      return;
    }
    setSavingIds((current) => [...current, account.id]);
    setErrorsById((current) => ({ ...current, [account.id]: undefined }));
    void onDeactivateAccount(account)
      .then((result) => {
        if (result.status === "error") {
          setErrorsById((current) => ({ ...current, [account.id]: result.message }));
        }
      })
      .finally(() => {
        setSavingIds((current) => current.filter((id) => id !== account.id));
      });
  };

  const handleReactivate = (account: Admin): void => {
    setSavingIds((current) => [...current, account.id]);
    setErrorsById((current) => ({ ...current, [account.id]: undefined }));
    void onReactivateAccount(account)
      .then((result) => {
        if (result.status === "error") {
          setErrorsById((current) => ({ ...current, [account.id]: result.message }));
        }
      })
      .finally(() => {
        setSavingIds((current) => current.filter((id) => id !== account.id));
      });
  };

  return (
    <section className="min-w-0 rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">관리자 계정</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            로그인 가능한 관리자 계정을 관리합니다. 전체 {listedAccounts.length}명 중 {visibleAccounts.length}명 표시
            {inactiveAccounts.length > 0 && ` (비활성 ${inactiveAccounts.length}명 ${showInactive ? "포함" : "숨김"})`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {inactiveAccounts.length > 0 && (
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
          {listedAccounts.length > defaultVisibleCount && (
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

      {canManageAccounts && <CreateAdminAccountPanel onCreateAccount={onCreateAccount} />}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[560px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#DDE8D6] text-xs text-[#5B6856]">
              <th className="py-2 pr-3">관리자</th>
              <th className="px-3">역할</th>
              <th className="px-3">상태</th>
              {canManageAccounts && <th className="px-3">관리</th>}
            </tr>
          </thead>
          <tbody>
            {visibleAccounts.map((account) => {
              const isSaving = savingIds.includes(account.id);
              const errorMessage = errorsById[account.id];
              const isSelf = account.id === currentAdminId;
              return (
                <tr key={account.id} className={`border-b border-[#EBF2E7] ${account.isActive ? "" : "bg-[#F7F7F5] text-[#A3ACA0]"}`}>
                  <td className="py-2 pr-3 font-bold text-[#172014]">
                    <span className={account.isActive ? "" : "text-[#A3ACA0]"}>{account.name}</span>
                    {isSelf && <span className="ml-2 rounded-full bg-[#E8F5DE] px-2 py-0.5 text-[10px] font-extrabold text-[#178A46]">본인</span>}
                    {!account.isActive && <span className="ml-2 rounded-full bg-[#EAEAE6] px-2 py-0.5 text-[10px] font-extrabold text-[#7A8175]">비활성</span>}
                    <span className="block text-xs font-medium text-[#819078]">끝자리 {account.phoneLast4}</span>
                  </td>
                  <td className="px-3 text-[#5B6856]">{account.role}</td>
                  <td className="px-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${account.isActive ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#FFF6E3] text-[#B76E00]"}`}>
                      {account.isActive ? "활성" : "비활성"}
                    </span>
                    {errorMessage !== undefined && (
                      <p className="mt-1 text-xs font-bold text-[#C9443E]">{errorMessage}</p>
                    )}
                  </td>
                  {canManageAccounts && (
                    <td className="px-3">
                      {account.isActive ? (
                        <button
                          type="button"
                          disabled={isSaving || isSelf}
                          title={isSelf ? "본인 계정은 비활성화할 수 없습니다." : undefined}
                          onClick={() => handleDeactivate(account)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#F1C5C2] px-2 py-1 text-xs font-extrabold text-[#C9443E] hover:bg-[#FCEBEA] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <UserX size={13} strokeWidth={2.3} />
                          비활성
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleReactivate(account)}
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

type CreateAdminAccountPanelProps = {
  readonly onCreateAccount: (input: CreateAdminAccountFormInput) => Promise<AdminAccountMutationResult>;
};

type CreateAdminAccountNotice = {
  readonly tone: "success" | "error";
  readonly message: string;
};

function CreateAdminAccountPanel({ onCreateAccount }: CreateAdminAccountPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<CreateAdminAccountNotice | undefined>();

  const resetForm = (): void => {
    setName("");
    setPhone("");
    setRole("");
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
    void onCreateAccount({ name: name.trim(), phone: phone.trim(), role: role.trim().length > 0 ? role.trim() : undefined })
      .then((result) => {
        if (result.status === "error") {
          setNotice({ tone: "error", message: result.message });
          return;
        }
        setNotice({ tone: "success", message: "관리자 계정을 추가했습니다." });
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
          관리자 계정 추가
        </span>
        {expanded ? <ChevronUp size={14} strokeWidth={2.3} /> : <ChevronDown size={14} strokeWidth={2.3} />}
      </button>
      {expanded && (
        <div className="grid gap-3 border-t border-[#EBF2E7] p-3">
          <div className="grid gap-3 md:grid-cols-3">
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
              역할 (선택)
              <input
                value={role}
                disabled={saving}
                onChange={(event) => setRole(event.target.value)}
                className="rounded border border-[#DDE8D6] px-2 py-1.5 text-sm"
                placeholder="비워두면 manager로 등록됩니다"
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
