import { useMemo, useState } from "react";
import { Ban, Pencil, Save, X } from "lucide-react";
import { rangesOverlap, toMinutes } from "../lib/date";
import type { AdminBlock, Space } from "../types/reservation";

export type AdminBlockFormInput = {
  readonly id?: string;
  readonly spaceId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
};

type AdminBlockActionResult =
  | { readonly status: "ok" }
  | { readonly status: "error"; readonly message: string };

type AdminBlockFormProps = {
  readonly spaces: readonly Space[];
  readonly adminBlocks: readonly AdminBlock[];
  readonly canManage: boolean;
  readonly onSaveBlock: (block: AdminBlockFormInput) => Promise<AdminBlockActionResult>;
  readonly onDeactivateBlock: (block: AdminBlock) => Promise<AdminBlockActionResult>;
};

type AdminBlockDraft = {
  readonly spaceId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
};

type FormNotice = {
  readonly tone: "success" | "error";
  readonly title: string;
  readonly message: string;
};

const defaultVisibleCount = 6;
const defaultDate = "2026-07-17";

export function AdminBlockForm({ spaces, adminBlocks, canManage, onSaveBlock, onDeactivateBlock }: AdminBlockFormProps) {
  const firstSpace = spaces[0];
  const [showAllBlocks, setShowAllBlocks] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | undefined>();
  const [savingForm, setSavingForm] = useState(false);
  const [releasingBlockId, setReleasingBlockId] = useState<string | undefined>();
  const [notice, setNotice] = useState<FormNotice | undefined>();
  const [draft, setDraft] = useState<AdminBlockDraft>(() => createDraft(firstSpace?.id ?? ""));

  const effectiveDraft = draft.spaceId.length === 0 && firstSpace !== undefined ? { ...draft, spaceId: firstSpace.id } : draft;
  const sortedBlocks = useMemo(
    () => [...adminBlocks].sort(compareAdminBlocks),
    [adminBlocks],
  );
  const visibleBlocks = showAllBlocks ? sortedBlocks : sortedBlocks.slice(0, defaultVisibleCount);
  const validationMessages = validateDraft(effectiveDraft, adminBlocks, editingBlockId);
  const canSubmit = canManage && spaces.length > 0 && validationMessages.length === 0 && !savingForm;

  const handleSubmit = (): void => {
    if (!canManage) {
      setNotice({ tone: "error", title: "저장할 수 없습니다.", message: "관리자 전체 전화번호로 다시 로그인해 주세요." });
      return;
    }
    if (validationMessages.length > 0) {
      setNotice({ tone: "error", title: "입력값을 확인해 주세요.", message: validationMessages.join(" ") });
      return;
    }

    setSavingForm(true);
    setNotice(undefined);
    void onSaveBlock({
      id: editingBlockId,
      spaceId: effectiveDraft.spaceId,
      date: effectiveDraft.date,
      startTime: effectiveDraft.startTime,
      endTime: effectiveDraft.endTime,
      reason: effectiveDraft.reason.trim(),
    }).then((result) => {
      setSavingForm(false);
      if (result.status === "error") {
        setNotice({ tone: "error", title: "차단 일정 저장 실패", message: result.message });
        return;
      }
      setNotice({
        tone: "success",
        title: editingBlockId === undefined ? "차단 일정이 저장되었습니다." : "차단 일정이 수정되었습니다.",
        message: "관리자 목록과 참가자 예약 화면에 반영했습니다.",
      });
      setEditingBlockId(undefined);
      setDraft(createDraft(effectiveDraft.spaceId));
    });
  };

  const handleRelease = (block: AdminBlock): void => {
    setReleasingBlockId(block.id);
    setNotice(undefined);
    void onDeactivateBlock(block).then((result) => {
      setReleasingBlockId(undefined);
      if (result.status === "error") {
        setNotice({ tone: "error", title: "차단 해제 실패", message: result.message });
        return;
      }
      if (editingBlockId === block.id) {
        setEditingBlockId(undefined);
        setDraft(createDraft(block.spaceId));
      }
      setNotice({ tone: "success", title: "차단 일정이 해제되었습니다.", message: "참가자 화면에서 다시 예약 가능 상태로 반영했습니다." });
    });
  };

  return (
    <section className="ui-card min-w-0 rounded-2xl p-4" data-testid="admin-block-form">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">관리자 차단 일정</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            전체 {adminBlocks.length}건 중 {visibleBlocks.length}건 표시
          </p>
        </div>
        {adminBlocks.length > defaultVisibleCount && (
          <button
            type="button"
            onClick={() => setShowAllBlocks((current) => !current)}
            className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs"
          >
            {showAllBlocks ? "접기" : "더보기"}
          </button>
        )}
      </div>

      {!canManage && (
        <p className="mt-3 rounded-lg border border-[#F2D59B] bg-[#FFF6E3] px-3 py-2 text-xs font-semibold text-[#B76E00]">
          저장/수정/해제는 관리자 전체 전화번호로 다시 로그인한 뒤 사용할 수 있습니다.
        </p>
      )}

      {notice !== undefined && (
        <div className={noticeClassName(notice.tone)} role={notice.tone === "error" ? "alert" : "status"}>
          <p className="font-bold">{notice.title}</p>
          <p className="mt-1">{notice.message}</p>
        </div>
      )}

      <div className="mt-3 grid gap-3 rounded-lg bg-[#F7FBF4] p-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_150px_120px_120px]">
          <label className={labelClassName}>
            공간
            <select
              data-testid="admin-block-space"
              value={effectiveDraft.spaceId}
              disabled={!canManage || spaces.length === 0 || savingForm}
              onChange={(event) => updateDraft(setDraft, { spaceId: event.target.value })}
              className={inputClassName}
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>{space.name}</option>
              ))}
            </select>
          </label>
          <label className={labelClassName}>
            날짜
            <input
              data-testid="admin-block-date"
              type="date"
              value={effectiveDraft.date}
              min={getTodayDateValue()}
              disabled={!canManage || savingForm}
              onChange={(event) => updateDraft(setDraft, { date: event.target.value })}
              onInput={(event) => updateDraft(setDraft, { date: event.currentTarget.value })}
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            시작
            <input
              data-testid="admin-block-start"
              type="time"
              value={effectiveDraft.startTime}
              disabled={!canManage || savingForm}
              onChange={(event) => updateDraft(setDraft, { startTime: event.target.value })}
              onInput={(event) => updateDraft(setDraft, { startTime: event.currentTarget.value })}
              className={inputClassName}
            />
          </label>
          <label className={labelClassName}>
            종료
            <input
              data-testid="admin-block-end"
              type="time"
              value={effectiveDraft.endTime}
              disabled={!canManage || savingForm}
              onChange={(event) => updateDraft(setDraft, { endTime: event.target.value })}
              onInput={(event) => updateDraft(setDraft, { endTime: event.currentTarget.value })}
              className={inputClassName}
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className={labelClassName}>
            차단 사유
            <input
              data-testid="admin-block-reason"
              value={effectiveDraft.reason}
              disabled={!canManage || savingForm}
              onChange={(event) => updateDraft(setDraft, { reason: event.target.value })}
              onInput={(event) => updateDraft(setDraft, { reason: event.currentTarget.value })}
              className={inputClassName}
              placeholder="예: 공간 정비, 내부 행사"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {editingBlockId !== undefined && (
              <button
                type="button"
                disabled={savingForm}
                onClick={() => {
                  setEditingBlockId(undefined);
                  setDraft(createDraft(effectiveDraft.spaceId));
                  setNotice(undefined);
                }}
                className="ui-button ui-button-ghost min-h-10 px-3 py-2 text-sm"
              >
                <X size={15} strokeWidth={2.3} />
                수정 취소
              </button>
            )}
            <button
              data-testid="admin-block-save"
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="ui-button ui-button-primary min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={15} strokeWidth={2.3} />
              {savingForm ? "저장 중" : editingBlockId === undefined ? "차단 저장" : "수정 저장"}
            </button>
          </div>
        </div>
        {notice?.tone !== "success" && validationMessages.length > 0 && (
          <div className="rounded-lg border border-[#F2D59B] bg-[#FFF6E3] p-3 text-xs font-bold text-[#B76E00]">
            {validationMessages.join(" ")}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {visibleBlocks.map((block) => {
          const space = spaces.find((item) => item.id === block.spaceId);
          const isEditing = editingBlockId === block.id;
          const isReleasing = releasingBlockId === block.id;
          return (
            <article key={block.id} className={`rounded-lg bg-[#FFF6E3] px-3 py-3 text-sm text-[#B76E00] ${isEditing ? "ring-2 ring-[#77B82A]/20" : ""}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="font-extrabold text-[#172014]">{block.spaceName ?? space?.name ?? "공간 없음"}</p>
                  <p className="mt-1 text-xs font-bold text-[#B76E00]">
                    {block.date} · {block.startTime}-{block.endTime} · {block.reason}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canManage || isReleasing}
                    onClick={() => {
                      setEditingBlockId(block.id);
                      setDraft({
                        spaceId: block.spaceId,
                        date: block.date,
                        startTime: block.startTime,
                        endTime: block.endTime,
                        reason: block.reason,
                      });
                      setNotice(undefined);
                    }}
                    className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pencil size={13} strokeWidth={2.3} />
                    수정
                  </button>
                  <button
                    type="button"
                    disabled={!canManage || isReleasing}
                    onClick={() => handleRelease(block)}
                    className="ui-button ui-button-danger min-h-9 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Ban size={13} strokeWidth={2.3} />
                    {isReleasing ? "해제 중" : "해제"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {visibleBlocks.length === 0 && (
          <p className="rounded-lg bg-[#F7FBF4] p-4 text-center text-sm font-semibold text-[#819078]">
            등록된 차단 일정이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

const labelClassName = "grid gap-1 text-sm font-bold text-[#172014]";
const inputClassName = "ui-input min-w-0 w-full text-sm";

function createDraft(spaceId: string): AdminBlockDraft {
  return {
    spaceId,
    date: defaultDate,
    startTime: "19:00",
    endTime: "23:00",
    reason: "공간 정비",
  };
}

function updateDraft(
  setDraft: (updater: (current: AdminBlockDraft) => AdminBlockDraft) => void,
  patch: Partial<AdminBlockDraft>,
): void {
  setDraft((current) => ({ ...current, ...patch }));
}

function validateDraft(
  draft: AdminBlockDraft,
  adminBlocks: readonly AdminBlock[],
  editingBlockId: string | undefined,
): readonly string[] {
  const messages: string[] = [];
  if (draft.spaceId.length === 0) {
    messages.push("공간을 선택해 주세요.");
  }
  if (draft.date.length === 0) {
    messages.push("날짜를 선택해 주세요.");
  } else if (draft.date < getTodayDateValue()) {
    messages.push("과거 날짜는 차단할 수 없습니다.");
  }
  if (draft.startTime.length === 0 || draft.endTime.length === 0 || toMinutes(draft.startTime) >= toMinutes(draft.endTime)) {
    messages.push("종료시간은 시작시간보다 늦어야 합니다.");
  }
  if (draft.reason.trim().length === 0) {
    messages.push("차단 사유를 입력해 주세요.");
  }
  if (hasOverlappingAdminBlock(draft, adminBlocks, editingBlockId)) {
    messages.push("같은 공간의 기존 차단 일정과 시간이 겹칩니다.");
  }
  return messages;
}

function hasOverlappingAdminBlock(
  draft: AdminBlockDraft,
  adminBlocks: readonly AdminBlock[],
  editingBlockId: string | undefined,
): boolean {
  if (draft.startTime.length === 0 || draft.endTime.length === 0 || toMinutes(draft.startTime) >= toMinutes(draft.endTime)) {
    return false;
  }
  return adminBlocks.some(
    (block) =>
      block.isActive &&
      block.id !== editingBlockId &&
      block.spaceId === draft.spaceId &&
      block.date === draft.date &&
      rangesOverlap(draft.startTime, draft.endTime, block.startTime, block.endTime),
  );
}

function getTodayDateValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function compareAdminBlocks(first: AdminBlock, second: AdminBlock): number {
  if (first.date !== second.date) {
    return second.date.localeCompare(first.date);
  }
  return second.startTime.localeCompare(first.startTime);
}

function noticeClassName(tone: FormNotice["tone"]): string {
  const toneClass = tone === "success"
    ? "border-[#DDE8D6] bg-[#F1F8EC] text-[#178A46]"
    : "border-[#F1C5C2] bg-[#FCEBEA] text-[#C9443E]";
  return `mt-3 rounded-lg border p-3 text-sm ${toneClass}`;
}
