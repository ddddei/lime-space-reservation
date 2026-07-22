import { useMemo, useState } from "react";
import { Eye, EyeOff, Save, X } from "lucide-react";
import { getSpaceCategoryLabel } from "../lib/displayLabels";
import { SpaceCreateForm } from "./SpaceCreateForm";
import type { Space, SpaceImage } from "../types/reservation";
import type { CreateAdminSpaceInput } from "../lib/supabaseReservationApi";
import type { ReactNode } from "react";

type SpaceAdminEditorProps = {
  readonly spaces: readonly Space[];
  readonly onSaveSpace: (space: Space) => Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }>;
  readonly onAddSpace: (space: CreateAdminSpaceInput) => Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }>;
};

type SpaceNotice = {
  readonly tone: "success" | "error";
  readonly message: string;
};

export function SpaceAdminEditor({ spaces, onSaveSpace, onAddSpace }: SpaceAdminEditorProps) {
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<readonly string[]>([]);
  const [draftsById, setDraftsById] = useState<Readonly<Record<string, Space>>>({});
  const [savingSpaceIds, setSavingSpaceIds] = useState<readonly string[]>([]);
  const [noticesById, setNoticesById] = useState<Readonly<Record<string, SpaceNotice | undefined>>>({});

  const sortedSpaces = useMemo(
    () => [...spaces].sort((first, second) => first.sortOrder - second.sortOrder),
    [spaces],
  );
  const nextSortOrder = useMemo(
    () => spaces.reduce((max, space) => Math.max(max, space.sortOrder), 0) + 1,
    [spaces],
  );

  const handleSave = (space: Space, successMessage: string): void => {
    const validationMessage = validateSpace(space);
    if (validationMessage !== undefined) {
      setNoticesById((current) => ({ ...current, [space.id]: { tone: "error", message: validationMessage } }));
      return;
    }
    setSavingSpaceIds((current) => [...current, space.id]);
    setNoticesById((current) => ({ ...current, [space.id]: undefined }));
    void onSaveSpace(space).then((result) => {
      setSavingSpaceIds((current) => current.filter((id) => id !== space.id));
      if (result.status === "error") {
        setNoticesById((current) => ({ ...current, [space.id]: { tone: "error", message: result.message } }));
        return;
      }
      setDraftsById((current) => ({ ...current, [space.id]: space }));
      setNoticesById((current) => ({ ...current, [space.id]: { tone: "success", message: successMessage } }));
    });
  };

  return (
    <section className="min-w-0 rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">공간 정보 관리</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">
            현장에서는 사용자 노출 여부와 기본 정보만 수정합니다. 공간 추가와 이미지 변경은 담당자 확인 후 진행하세요.
          </p>
        </div>
        <span className="rounded-full bg-[#F1F8EC] px-3 py-1 text-xs font-extrabold text-[#5F9820]">
          운영 수정 가능
        </span>
      </div>
      <div className="mt-3 rounded-lg bg-[#F7FBF4] px-3 py-2 text-xs font-semibold text-[#5B6856]">
        신청 내역 초기화는 이 화면에서 제공하지 않습니다. 운영 초기화가 필요하면 담당자 확인 후 별도 절차로 진행하세요.
      </div>
      <div className="mt-3">
        <SpaceCreateForm nextSortOrder={nextSortOrder} onAddSpace={onAddSpace} />
      </div>
      <div className="mt-3 grid gap-3">
        {sortedSpaces.map((space) => {
          const draft = draftsById[space.id] ?? space;
          const expanded = expandedSpaceIds.includes(space.id);
          const isSaving = savingSpaceIds.includes(space.id);
          const notice = noticesById[space.id];
          return (
            <article key={space.id} className="rounded-lg border border-[#EBF2E7] p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-[#172014]">{draft.name}</h3>
                    <StatusChip active={draft.isActive} activeLabel="활성" inactiveLabel="비활성" />
                    <StatusChip active={draft.isPublicVisible} activeLabel="사용자 노출" inactiveLabel="사용자 숨김" />
                    {draft.requiresAdminUnlock === true && <span className="rounded-full bg-[#FFF6E3] px-2 py-1 text-xs font-bold text-[#B76E00]">관리자 허용 필요</span>}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#819078]">
                    {draft.parentSpaceName ?? "상위 공간 없음"} · {getSpaceCategoryLabel(draft.category)} · 최대 {draft.capacity}명
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave({ ...draft, isPublicVisible: !draft.isPublicVisible }, draft.isPublicVisible ? "사용자 화면에서 숨김 처리했습니다." : "사용자 화면에 다시 노출했습니다.")}
                    disabled={isSaving}
                    className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {draft.isPublicVisible ? <EyeOff size={13} strokeWidth={2.3} /> : <Eye size={13} strokeWidth={2.3} />}
                    {draft.isPublicVisible ? "사용자 숨김" : "사용자 노출"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedSpaceIds((current) => toggleId(current, space.id))}
                    className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs"
                  >
                    {expanded ? "수정 닫기" : "수정 열기"}
                  </button>
                </div>
              </div>
              <AdminSpaceImages space={draft} />
              {notice !== undefined && (
                <div className={noticeClassName(notice.tone)} role={notice.tone === "error" ? "alert" : "status"}>
                  {notice.message}
                </div>
              )}
              {expanded && (
                <div className="mt-3 grid gap-3 rounded-lg bg-[#F7FBF4] p-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                    <Field label="공간명">
                      <input
                        value={draft.name}
                        onChange={(event) => updateDraft(setDraftsById, draft, { name: event.target.value })}
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="상위 공간명">
                      <input
                        value={draft.parentSpaceName ?? ""}
                        onChange={(event) => updateDraft(setDraftsById, draft, { parentSpaceName: event.target.value || undefined })}
                        className={inputClassName}
                      />
                    </Field>
                    <Field label="정원">
                      <input
                        type="number"
                        min={1}
                        value={draft.capacity}
                        onChange={(event) => updateCapacity(draft, event.target.value, setDraftsById)}
                        className={inputClassName}
                      />
                    </Field>
                  </div>
                  <Field label="대표 이미지 URL">
                    <input
                      value={draft.imageUrl}
                      onChange={(event) => updateDraft(setDraftsById, draft, { imageUrl: event.target.value })}
                      className={inputClassName}
                    />
                  </Field>
                  <div className="flex flex-wrap items-end gap-3 text-sm font-bold text-[#172014]">
                    <Checkbox label="활성" checked={draft.isActive} onChange={(checked) => updateDraft(setDraftsById, draft, { isActive: checked })} />
                    <Checkbox label="사용자 노출" checked={draft.isPublicVisible} onChange={(checked) => updateDraft(setDraftsById, draft, { isPublicVisible: checked })} />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSave({ ...draft, isActive: false }, "공간을 비활성 처리했습니다.")}
                      className="ui-button ui-button-danger min-h-9 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X size={13} strokeWidth={2.3} />
                      비활성 처리
                    </button>
                  </div>
                  <Field label="특징 태그">
                    <input
                      value={draft.features.join(", ")}
                      onChange={(event) => updateDraft(setDraftsById, draft, { features: parseFeatures(event.target.value) })}
                      className={inputClassName}
                      placeholder="TV, HDMI, 와이파이"
                    />
                  </Field>
                  <Field label="설명">
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft(setDraftsById, draft, { description: event.target.value })}
                      rows={3}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="관리자 메모">
                    <textarea
                      value={draft.adminMemo ?? ""}
                      onChange={(event) => updateDraft(setDraftsById, draft, { adminMemo: event.target.value || undefined })}
                      rows={2}
                      className={inputClassName}
                    />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => updateDraft(setDraftsById, space, space)}
                      className="ui-button ui-button-ghost min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      변경 취소
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSave(draft, "공간 정보를 저장했습니다.")}
                      className="ui-button ui-button-primary min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={15} strokeWidth={2.3} />
                      {isSaving ? "저장 중" : "수정 저장"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const inputClassName = "ui-input min-w-0 w-full text-sm";

function Field(props: { readonly label: string; readonly children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[#172014]">
      {props.label}
      {props.children}
    </label>
  );
}

function AdminSpaceImages({ space }: { readonly space: Space }) {
  const images = getAdminDisplayImages(space);
  const [failedImageIds, setFailedImageIds] = useState<readonly string[]>([]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      <p className="text-xs font-extrabold text-[#5B6856]">등록 이미지 {images.length}장</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((image, index) => {
          const showImage = image.imageUrl.trim().length > 0 && !failedImageIds.includes(image.id);
          return (
            <figure key={image.id} className="w-28 shrink-0 overflow-hidden rounded-lg border border-[#DDE8D6] bg-white">
              <div className="h-20 bg-[#070A07]">
                {showImage ? (
                  <img
                    src={image.imageUrl}
                    alt={image.altText ?? `${space.name} 사진 ${index + 1}`}
                    className="h-full w-full object-cover"
                    width="112"
                    height="80"
                    onError={() => setFailedImageIds((current) => [...current, image.id])}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#070A07,#1A2419_52%,#2C3A2B)] text-[10px] font-black text-[#A6F15B]">
                    LIME
                  </div>
                )}
              </div>
              <figcaption className="truncate px-2 py-1 text-[11px] font-bold text-[#5B6856]">
                {image.isPrimary ? "대표" : `${index + 1}번`}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function getAdminDisplayImages(space: Space): readonly SpaceImage[] {
  if (space.images !== undefined && space.images.length > 0) {
    return space.images;
  }
  if (space.imageUrl.trim().length === 0) {
    return [];
  }
  return [{
    id: `${space.id}-admin-primary-image`,
    spaceId: space.id,
    imageUrl: space.imageUrl,
    altText: `${space.name} 사진`,
    sortOrder: 0,
    isPrimary: true,
    isActive: true,
  }];
}

function StatusChip(props: { readonly active: boolean; readonly activeLabel: string; readonly inactiveLabel: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${props.active ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#EEF0EA] text-[#5B6856]"}`}>
      {props.active ? props.activeLabel : props.inactiveLabel}
    </span>
  );
}

function Checkbox(props: { readonly label: string; readonly checked: boolean; readonly onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
        className="h-4 w-4 accent-[#77B82A]"
      />
      {props.label}
    </label>
  );
}

function updateDraft(
  setDraftsById: (updater: (current: Readonly<Record<string, Space>>) => Readonly<Record<string, Space>>) => void,
  space: Space,
  patch: Partial<Space>,
): void {
  setDraftsById((current) => ({ ...current, [space.id]: { ...space, ...patch } }));
}

function updateCapacity(
  space: Space,
  value: string,
  setDraftsById: (updater: (current: Readonly<Record<string, Space>>) => Readonly<Record<string, Space>>) => void,
): void {
  const capacity = Number(value);
  if (Number.isFinite(capacity)) {
    updateDraft(setDraftsById, space, { capacity });
  }
}

function parseFeatures(value: string): readonly string[] {
  return value.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
}

function validateSpace(space: Space): string | undefined {
  if (space.name.trim().length === 0) {
    return "공간명을 입력해 주세요.";
  }
  if (!Number.isFinite(space.capacity) || space.capacity < 1) {
    return "정원은 1명 이상이어야 합니다.";
  }
  return undefined;
}

function toggleId(ids: readonly string[], id: string): readonly string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function noticeClassName(tone: SpaceNotice["tone"]): string {
  const toneClass = tone === "success"
    ? "border-[#DDE8D6] bg-[#F1F8EC] text-[#178A46]"
    : "border-[#F1C5C2] bg-[#FCEBEA] text-[#C9443E]";
  return `mt-3 rounded-lg border p-3 text-sm font-bold ${toneClass}`;
}
