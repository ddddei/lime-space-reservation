import { useMemo, useState } from "react";
import { Eye, EyeOff, Save, Star, Trash2, Upload, X } from "lucide-react";
import { getSpaceCategoryLabel } from "../lib/displayLabels";
import {
  analyzeOperatingHours,
  buildCustomOperatingHours,
  isCustomOperatingHoursRangeInvalid,
  summarizeOperatingHoursLines,
} from "../lib/operatingHoursSummary";
import { uploadSpaceImage } from "../lib/spaceImageUpload";
import { OperatingHoursCustomFields } from "./OperatingHoursCustomFields";
import { SpaceCreateForm } from "./SpaceCreateForm";
import { SpaceImageUploadField } from "./SpaceImageUploadField";
import type { OperatingHour, Space, SpaceImage } from "../types/reservation";
import type { CreateAdminSpaceInput } from "../lib/supabaseReservationApi";
import type { ReactNode } from "react";

type SaveResult = { readonly status: "ok" } | { readonly status: "error"; readonly message: string };
type SpaceImageSaveResult = { readonly status: "ok" } | { readonly status: "error"; readonly message: string };

type SpaceAdminEditorProps = {
  readonly spaces: readonly Space[];
  readonly onSaveSpace: (space: Space) => Promise<SaveResult>;
  readonly onAddSpace: (space: CreateAdminSpaceInput) => Promise<SaveResult>;
  readonly onSaveOperatingHours: (spaceId: string, operatingHours: readonly OperatingHour[]) => Promise<SaveResult>;
  readonly canManageImages: boolean;
  readonly onAddImage: (spaceId: string, imageUrl: string, altText?: string) => Promise<SpaceImageSaveResult>;
  readonly onRemoveImage: (imageId: string) => Promise<SpaceImageSaveResult>;
  readonly onSetPrimaryImage: (imageId: string) => Promise<SpaceImageSaveResult>;
};

type SpaceNotice = {
  readonly tone: "success" | "error";
  readonly message: string;
};

type OperatingHoursDraft = {
  readonly startTime: string;
  readonly endTime: string;
  readonly closedDays: ReadonlySet<number>;
  readonly warningMessage?: string;
};

export function SpaceAdminEditor({
  spaces,
  onSaveSpace,
  onAddSpace,
  onSaveOperatingHours,
  canManageImages,
  onAddImage,
  onRemoveImage,
  onSetPrimaryImage,
}: SpaceAdminEditorProps) {
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<readonly string[]>([]);
  const [draftsById, setDraftsById] = useState<Readonly<Record<string, Space>>>({});
  const [savingSpaceIds, setSavingSpaceIds] = useState<readonly string[]>([]);
  const [noticesById, setNoticesById] = useState<Readonly<Record<string, SpaceNotice | undefined>>>({});

  const [selectedFilesById, setSelectedFilesById] = useState<Readonly<Record<string, File | undefined>>>({});
  const [previewUrlsById, setPreviewUrlsById] = useState<Readonly<Record<string, string | undefined>>>({});

  const [operatingHoursOpenIds, setOperatingHoursOpenIds] = useState<readonly string[]>([]);
  const [operatingHoursDraftById, setOperatingHoursDraftById] = useState<Readonly<Record<string, OperatingHoursDraft>>>({});
  const [operatingHoursSavingIds, setOperatingHoursSavingIds] = useState<readonly string[]>([]);
  const [operatingHoursNoticesById, setOperatingHoursNoticesById] = useState<Readonly<Record<string, SpaceNotice | undefined>>>({});

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

  const clearSelectedFile = (spaceId: string): void => {
    const previewUrl = previewUrlsById[spaceId];
    if (previewUrl !== undefined) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFilesById((current) => ({ ...current, [spaceId]: undefined }));
    setPreviewUrlsById((current) => ({ ...current, [spaceId]: undefined }));
  };

  // ①: 파일을 선택하지 않고 저장하면 업로드 단계 없이 기존 handleSave 흐름을 그대로 탄다.
  const handleSaveSpaceButtonClick = (draft: Space, space: Space): void => {
    const validationMessage = validateSpace(draft);
    if (validationMessage !== undefined) {
      setNoticesById((current) => ({ ...current, [space.id]: { tone: "error", message: validationMessage } }));
      return;
    }

    const selectedFile = selectedFilesById[space.id];
    if (selectedFile === undefined) {
      handleSave(draft, "공간 정보를 저장했습니다.");
      return;
    }

    setSavingSpaceIds((current) => [...current, space.id]);
    setNoticesById((current) => ({ ...current, [space.id]: undefined }));
    void uploadSpaceImage(selectedFile).then((uploadResult) => {
      if (uploadResult.status === "error") {
        setSavingSpaceIds((current) => current.filter((id) => id !== space.id));
        setNoticesById((current) => ({ ...current, [space.id]: { tone: "error", message: uploadResult.message } }));
        return;
      }

      const draftWithImage = { ...draft, imageUrl: uploadResult.publicUrl };
      void onSaveSpace(draftWithImage).then((result) => {
        setSavingSpaceIds((current) => current.filter((id) => id !== space.id));
        if (result.status === "error") {
          setNoticesById((current) => ({ ...current, [space.id]: { tone: "error", message: result.message } }));
          return;
        }
        setDraftsById((current) => ({ ...current, [space.id]: draftWithImage }));
        clearSelectedFile(space.id);
        setNoticesById((current) => ({ ...current, [space.id]: { tone: "success", message: "공간 정보를 저장했습니다." } }));
      });
    });
  };

  const toggleOperatingHoursEditor = (space: Space): void => {
    const isOpen = operatingHoursOpenIds.includes(space.id);
    if (isOpen) {
      setOperatingHoursOpenIds((current) => current.filter((id) => id !== space.id));
      return;
    }

    // ③: 요일마다 시간이 다른(예: 티파티) 공간을 열면 공통 시간으로 환원 불가능하므로 경고를 함께 초기화한다.
    const shape = analyzeOperatingHours(space.operatingHours);
    setOperatingHoursDraftById((current) => ({
      ...current,
      [space.id]: {
        startTime: shape.startTime,
        endTime: shape.endTime,
        closedDays: shape.closedDays,
        warningMessage: shape.isUniform ? undefined : "요일별 상세 시간은 저장 시 공통 시간으로 통일됩니다.",
      },
    }));
    setOperatingHoursOpenIds((current) => [...current, space.id]);
  };

  const updateOperatingHoursDraft = (spaceId: string, patch: Partial<OperatingHoursDraft>): void => {
    setOperatingHoursDraftById((current) => {
      const existing = current[spaceId];
      if (existing === undefined) {
        return current;
      }
      return { ...current, [spaceId]: { ...existing, ...patch } };
    });
  };

  const toggleOperatingHoursClosedDay = (spaceId: string, dayOfWeek: number): void => {
    setOperatingHoursDraftById((current) => {
      const existing = current[spaceId];
      if (existing === undefined) {
        return current;
      }
      const next = new Set(existing.closedDays);
      if (next.has(dayOfWeek)) {
        next.delete(dayOfWeek);
      } else {
        next.add(dayOfWeek);
      }
      return { ...current, [spaceId]: { ...existing, closedDays: next } };
    });
  };

  // ②: 공간 정보만 저장할 때는 이 함수가 아예 호출되지 않으므로 운영시간 RPC는 타지 않는다.
  const handleSaveOperatingHours = (space: Space): void => {
    const draft = operatingHoursDraftById[space.id];
    if (draft === undefined || isCustomOperatingHoursRangeInvalid(draft.startTime, draft.endTime)) {
      return;
    }
    const operatingHours = buildCustomOperatingHours(draft.startTime, draft.endTime, draft.closedDays);

    setOperatingHoursSavingIds((current) => [...current, space.id]);
    setOperatingHoursNoticesById((current) => ({ ...current, [space.id]: undefined }));
    void onSaveOperatingHours(space.id, operatingHours).then((result) => {
      setOperatingHoursSavingIds((current) => current.filter((id) => id !== space.id));
      if (result.status === "error") {
        setOperatingHoursNoticesById((current) => ({ ...current, [space.id]: { tone: "error", message: result.message } }));
        return;
      }
      setDraftsById((current) => ({ ...current, [space.id]: { ...(current[space.id] ?? space), operatingHours } }));
      setOperatingHoursNoticesById((current) => ({ ...current, [space.id]: { tone: "success", message: "운영시간을 저장했습니다." } }));
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
          const selectedFile = selectedFilesById[space.id];
          const previewUrl = previewUrlsById[space.id];

          const operatingHoursExpanded = operatingHoursOpenIds.includes(space.id);
          const operatingHoursDraft = operatingHoursDraftById[space.id];
          const isOperatingHoursSaving = operatingHoursSavingIds.includes(space.id);
          const operatingHoursNotice = operatingHoursNoticesById[space.id];
          const isOperatingHoursRangeInvalid = operatingHoursDraft !== undefined
            && isCustomOperatingHoursRangeInvalid(operatingHoursDraft.startTime, operatingHoursDraft.endTime);

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
                  <SpaceImageUploadField
                    selectedFile={selectedFile}
                    previewUrl={previewUrl}
                    onFileSelected={(file) => {
                      const currentPreviewUrl = previewUrlsById[space.id];
                      if (currentPreviewUrl !== undefined) {
                        URL.revokeObjectURL(currentPreviewUrl);
                      }
                      setSelectedFilesById((current) => ({ ...current, [space.id]: file }));
                      setPreviewUrlsById((current) => ({ ...current, [space.id]: URL.createObjectURL(file) }));
                    }}
                    onClearFile={() => clearSelectedFile(space.id)}
                    helperText="파일을 선택하면 대표 이미지 URL 입력값 대신 업로드된 파일이 사용되며, 저장 버튼을 누르는 시점에 업로드됩니다."
                  />
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
                      onClick={() => {
                        clearSelectedFile(space.id);
                        updateDraft(setDraftsById, space, space);
                      }}
                      className="ui-button ui-button-ghost min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      변경 취소
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveSpaceButtonClick(draft, space)}
                      className="ui-button ui-button-primary min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={15} strokeWidth={2.3} />
                      {isSaving ? "저장 중" : "수정 저장"}
                    </button>
                  </div>

                  <div className="mt-2 grid gap-2 rounded-lg border border-[#DDE8D6] bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-[#172014]">운영시간</p>
                        <div className="mt-1 grid gap-0.5 text-xs font-semibold text-[#5B6856]">
                          {summarizeOperatingHoursLines(draft.operatingHours).map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleOperatingHoursEditor(draft)}
                        className="ui-button ui-button-ghost min-h-9 px-3 py-2 text-xs"
                      >
                        {operatingHoursExpanded ? "운영시간 수정 닫기" : "운영시간 수정"}
                      </button>
                    </div>
                    {operatingHoursExpanded && operatingHoursDraft !== undefined && (
                      <>
                        <OperatingHoursCustomFields
                          startTime={operatingHoursDraft.startTime}
                          endTime={operatingHoursDraft.endTime}
                          closedDays={operatingHoursDraft.closedDays}
                          onStartTimeChange={(value) => updateOperatingHoursDraft(space.id, { startTime: value })}
                          onEndTimeChange={(value) => updateOperatingHoursDraft(space.id, { endTime: value })}
                          onToggleClosedDay={(dayOfWeek) => toggleOperatingHoursClosedDay(space.id, dayOfWeek)}
                          warningMessage={operatingHoursDraft.warningMessage}
                        />
                        {operatingHoursNotice !== undefined && (
                          <div className={noticeClassName(operatingHoursNotice.tone)} role={operatingHoursNotice.tone === "error" ? "alert" : "status"}>
                            {operatingHoursNotice.message}
                          </div>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isOperatingHoursSaving || isOperatingHoursRangeInvalid}
                            onClick={() => handleSaveOperatingHours(space)}
                            className="ui-button ui-button-primary min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Save size={15} strokeWidth={2.3} />
                            {isOperatingHoursSaving ? "저장 중" : "운영시간 저장"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {canManageImages && (
                    <SpaceImageGallerySection
                      space={draft}
                      onAddImage={onAddImage}
                      onRemoveImage={onRemoveImage}
                      onSetPrimaryImage={onSetPrimaryImage}
                    />
                  )}
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

function SpaceImageGallerySection({
  space,
  onAddImage,
  onRemoveImage,
  onSetPrimaryImage,
}: {
  readonly space: Space;
  readonly onAddImage: (spaceId: string, imageUrl: string, altText?: string) => Promise<SpaceImageSaveResult>;
  readonly onRemoveImage: (imageId: string) => Promise<SpaceImageSaveResult>;
  readonly onSetPrimaryImage: (imageId: string) => Promise<SpaceImageSaveResult>;
}) {
  // 관리 목록은 실제 space_images 레코드만 다룬다 (대표 이미지 URL 기반 합성 fallback은 제외 —
  // 그 fallback은 image_id가 실제 존재하지 않아 제거/대표 지정 RPC를 호출할 수 없다).
  const images = space.images ?? [];
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [busyImageId, setBusyImageId] = useState<string | undefined>();
  const [notice, setNotice] = useState<SpaceNotice | undefined>();
  const [failedImageIds, setFailedImageIds] = useState<readonly string[]>([]);

  const clearSelectedFile = (): void => {
    if (previewUrl !== undefined) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(undefined);
    setPreviewUrl(undefined);
  };

  const handleUpload = (): void => {
    if (selectedFile === undefined || isUploading) {
      return;
    }
    setIsUploading(true);
    setNotice(undefined);
    void uploadSpaceImage(selectedFile).then((uploadResult) => {
      if (uploadResult.status === "error") {
        setIsUploading(false);
        setNotice({ tone: "error", message: uploadResult.message });
        return;
      }
      void onAddImage(space.id, uploadResult.publicUrl).then((result) => {
        setIsUploading(false);
        if (result.status === "error") {
          setNotice({ tone: "error", message: result.message });
          return;
        }
        clearSelectedFile();
        setNotice({ tone: "success", message: "사진을 추가했습니다." });
      });
    });
  };

  const handleRemove = (imageId: string): void => {
    setBusyImageId(imageId);
    setNotice(undefined);
    void onRemoveImage(imageId).then((result) => {
      setBusyImageId(undefined);
      if (result.status === "error") {
        setNotice({ tone: "error", message: result.message });
        return;
      }
      setNotice({ tone: "success", message: "사진을 제거했습니다." });
    });
  };

  const handleSetPrimary = (imageId: string): void => {
    setBusyImageId(imageId);
    setNotice(undefined);
    void onSetPrimaryImage(imageId).then((result) => {
      setBusyImageId(undefined);
      if (result.status === "error") {
        setNotice({ tone: "error", message: result.message });
        return;
      }
      setNotice({ tone: "success", message: "대표 사진을 지정했습니다." });
    });
  };

  return (
    <div className="mt-2 grid gap-2 rounded-lg border border-[#DDE8D6] bg-white p-3">
      <p className="text-sm font-extrabold text-[#172014]">사진 갤러리</p>
      {images.length === 0 ? (
        <p className="text-xs font-semibold text-[#819078]">등록된 사진이 없습니다.</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const showImage = image.imageUrl.trim().length > 0 && !failedImageIds.includes(image.id);
            const isBusy = busyImageId === image.id;
            return (
              <figure key={image.id} className="w-32 shrink-0 overflow-hidden rounded-lg border border-[#DDE8D6] bg-white">
                <div className="h-20 bg-[#070A07]">
                  {showImage ? (
                    <img
                      src={image.imageUrl}
                      alt={image.altText ?? `${space.name} 사진 ${index + 1}`}
                      className="h-full w-full object-cover"
                      width="128"
                      height="80"
                      onError={() => setFailedImageIds((current) => [...current, image.id])}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#070A07,#1A2419_52%,#2C3A2B)] text-[10px] font-black text-[#A6F15B]">
                      LIME
                    </div>
                  )}
                </div>
                <figcaption className="grid gap-1 px-2 py-1.5">
                  <span className="truncate text-[11px] font-bold text-[#5B6856]">
                    {image.isPrimary ? "대표" : `${index + 1}번`}
                  </span>
                  <div className="flex gap-1">
                    {!image.isPrimary && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSetPrimary(image.id)}
                        className="ui-button ui-button-ghost min-h-7 flex-1 px-1.5 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Star size={11} strokeWidth={2.3} />
                        대표 지정
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRemove(image.id)}
                      className="ui-button ui-button-danger min-h-7 flex-1 px-1.5 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={11} strokeWidth={2.3} />
                      제거
                    </button>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
      <SpaceImageUploadField
        selectedFile={selectedFile}
        previewUrl={previewUrl}
        onFileSelected={(file) => {
          if (previewUrl !== undefined) {
            URL.revokeObjectURL(previewUrl);
          }
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
        }}
        onClearFile={clearSelectedFile}
        helperText="파일을 선택하고 아래 사진 추가 버튼을 누르면 이 공간의 사진 갤러리에 새 사진으로 등록됩니다."
      />
      {notice !== undefined && (
        <div className={noticeClassName(notice.tone)} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.message}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={selectedFile === undefined || isUploading}
          onClick={handleUpload}
          className="ui-button ui-button-primary min-h-9 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload size={13} strokeWidth={2.3} />
          {isUploading ? "업로드 중" : "사진 추가"}
        </button>
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
