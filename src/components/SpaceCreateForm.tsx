import { useState } from "react";
import { allDayHours, chitChatHours, teaPartyHours, youthBuildingHours } from "../data/operatingHours";
import type { OperatingHour, SpaceCategory } from "../types/reservation";
import type { CreateAdminSpaceInput } from "../lib/supabaseReservationApi";

type SpaceCreateFormResult = { readonly status: "ok" } | { readonly status: "error"; readonly message: string };

type SpaceCreateFormProps = {
  readonly nextSortOrder: number;
  readonly onAddSpace: (space: CreateAdminSpaceInput) => Promise<SpaceCreateFormResult>;
};

type OperatingHoursPreset = "all-day" | "youth-building" | "chitchat" | "tea-party";

const presetHours: Record<OperatingHoursPreset, readonly OperatingHour[]> = {
  "all-day": allDayHours,
  "youth-building": youthBuildingHours,
  chitchat: chitChatHours,
  "tea-party": teaPartyHours,
};

export function SpaceCreateForm({ nextSortOrder, onAddSpace }: SpaceCreateFormProps) {
  const [name, setName] = useState("");
  const [parentSpaceName, setParentSpaceName] = useState("");
  const [category, setCategory] = useState<SpaceCategory>("lifestyle");
  const [capacity, setCapacity] = useState(8);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80");
  const [features, setFeatures] = useState("제휴공간, 소규모 모임");
  const [isActive, setIsActive] = useState(true);
  const [isPublicVisible, setIsPublicVisible] = useState(true);
  const [requiresAdminUnlock, setRequiresAdminUnlock] = useState(false);
  const [adminMemo, setAdminMemo] = useState("");
  const [operatingPreset, setOperatingPreset] = useState<OperatingHoursPreset>("all-day");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  return (
    <div className="rounded-lg border border-[#EBF2E7] bg-[#F7FBF4] p-3">
      <h3 className="text-sm font-extrabold text-[#172014]">새 공간 추가</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <TextField label="공간명" value={name} onChange={setName} />
        <TextField label="상위 공간명" value={parentSpaceName} onChange={setParentSpaceName} />
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          카테고리
          <select value={category} onChange={(event) => setCategory(event.target.value as SpaceCategory)} className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium">
            <option value="lifestyle">생활밀착형 제휴공간</option>
            <option value="youth-building">청년동 공간</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          정원
          <input type="number" min={1} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium" />
        </label>
        <TextField label="사진 URL" value={imageUrl} onChange={setImageUrl} />
        <TextField label="특징" value={features} onChange={setFeatures} />
        <label className="grid gap-1 text-sm font-bold text-[#172014]">
          운영시간 프리셋
          <select value={operatingPreset} onChange={(event) => setOperatingPreset(event.target.value as OperatingHoursPreset)} className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium">
            <option value="all-day">24시간</option>
            <option value="youth-building">청년동 기본</option>
            <option value="chitchat">칫챗 08:00-22:00</option>
            <option value="tea-party">티파티 요일별</option>
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3 text-sm font-bold text-[#172014]">
          <Checkbox label="활성" checked={isActive} onChange={setIsActive} />
          <Checkbox label="사용자 노출" checked={isPublicVisible} onChange={setIsPublicVisible} />
          <Checkbox label="관리자 허용 필요" checked={requiresAdminUnlock} onChange={setRequiresAdminUnlock} />
        </div>
        <label className="grid gap-1 text-sm font-bold text-[#172014] md:col-span-2">
          설명
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#172014] md:col-span-2">
          관리자 메모
          <textarea value={adminMemo} onChange={(event) => setAdminMemo(event.target.value)} rows={2} className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium" />
        </label>
      </div>
      {errorMessage !== undefined && (
        <div className="mt-3 rounded-lg border border-[#F1C5C2] bg-[#FCEBEA] p-3 text-sm font-bold text-[#C9443E]" role="alert">
          {errorMessage}
        </div>
      )}
      <button
        type="button"
        disabled={name.trim().length === 0 || capacity < 1 || isSaving}
        onClick={() => {
          setIsSaving(true);
          setErrorMessage(undefined);
          void onAddSpace({
            id: `space-${Date.now()}`,
            name: name.trim(),
            category,
            capacity,
            description: description.trim(),
            imageUrl,
            features: features.split(",").map((feature) => feature.trim()).filter(Boolean),
            operatingHours: presetHours[operatingPreset],
            isActive,
            isPublicVisible,
            requiresAdminUnlock,
            parentSpaceName: parentSpaceName.trim() || undefined,
            adminMemo: adminMemo.trim() || undefined,
            sortOrder: nextSortOrder,
          }).then((result) => {
            setIsSaving(false);
            if (result.status === "error") {
              setErrorMessage(result.message);
              return;
            }
            setName("");
            setDescription("");
          });
        }}
        className="mt-3 rounded-lg bg-[#77B82A] px-4 py-2 text-sm font-extrabold text-white disabled:bg-[#B9C9AE]"
      >
        {isSaving ? "저장 중" : "공간 추가"}
      </button>
    </div>
  );
}

function TextField(props: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[#172014]">
      {props.label}
      <input value={props.value} onChange={(event) => props.onChange(event.target.value)} className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium" />
    </label>
  );
}

function Checkbox(props: { readonly label: string; readonly checked: boolean; readonly onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} className="h-4 w-4 accent-[#77B82A]" />
      {props.label}
    </label>
  );
}
