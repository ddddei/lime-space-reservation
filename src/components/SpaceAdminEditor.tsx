import { useState } from "react";
import { SpaceCreateForm } from "./SpaceCreateForm";
import { getSpaceCategoryLabel } from "../lib/displayLabels";
import type { Space } from "../types/reservation";

type SpaceAdminEditorProps = {
  readonly spaces: readonly Space[];
  readonly onUpdateSpace: (space: Space) => void;
  readonly onAddSpace: (space: Space) => void;
};

export function SpaceAdminEditor({ spaces, onUpdateSpace, onAddSpace }: SpaceAdminEditorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<readonly string[]>([]);
  const nextSortOrder = Math.max(0, ...spaces.map((space) => space.sortOrder)) + 1;

  return (
    <section className="rounded-lg border border-[#DDE8D6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#172014]">공간 정보 관리</h2>
          <p className="mt-1 text-xs font-semibold text-[#819078]">삭제 대신 비활성 처리로 운영합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          className="rounded-lg bg-[#172014] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#2F3B2A]"
        >
          {showCreateForm ? "새 공간 닫기" : "새 공간 추가"}
        </button>
      </div>
      {showCreateForm && (
        <div className="mt-3 rounded-lg border border-[#EBF2E7] bg-[#F7FBF4] p-3">
          <SpaceCreateForm nextSortOrder={nextSortOrder} onAddSpace={onAddSpace} />
        </div>
      )}
      <div className="mt-3 grid gap-3">
        {spaces.map((space) => {
          const expanded = expandedSpaceIds.includes(space.id);
          return (
            <article key={space.id} className="rounded-lg border border-[#EBF2E7] p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-[#172014]">{space.name}</h3>
                    <StatusChip active={space.isActive} activeLabel="활성" inactiveLabel="비활성" />
                    <StatusChip active={space.isPublicVisible} activeLabel="사용자 노출" inactiveLabel="사용자 숨김" />
                    {space.requiresAdminUnlock === true && <span className="rounded-full bg-[#FFF6E3] px-2 py-1 text-xs font-bold text-[#B76E00]">관리자 허용 필요</span>}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#819078]">
                    {space.parentSpaceName ?? "상위 공간 없음"} · {getSpaceCategoryLabel(space.category)} · 최대 {space.capacity}명
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedSpaceIds((current) => toggleId(current, space.id))}
                  className="rounded-lg border border-[#DDE8D6] px-3 py-2 text-xs font-extrabold text-[#5B6856] hover:border-[#77B82A]"
                >
                  {expanded ? "수정 닫기" : "수정 열기"}
                </button>
              </div>
              {expanded && (
                <div className="mt-3 grid gap-3 rounded-lg bg-[#F7FBF4] p-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                    <label className="grid gap-1 text-sm font-bold text-[#172014]">
                      공간명
                      <input
                        value={space.name}
                        onChange={(event) => onUpdateSpace({ ...space, name: event.target.value })}
                        className={inputClassName}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-[#172014]">
                      상위 공간명
                      <input
                        value={space.parentSpaceName ?? ""}
                        onChange={(event) => onUpdateSpace({ ...space, parentSpaceName: event.target.value || undefined })}
                        className={inputClassName}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-[#172014]">
                      정원
                      <input
                        type="number"
                        value={space.capacity}
                        onChange={(event) => updateCapacity(space, event.target.value, onUpdateSpace)}
                        className={inputClassName}
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                    <label className="grid gap-1 text-sm font-bold text-[#172014]">
                      카테고리
                      <select
                        value={space.category}
                        onChange={(event) => onUpdateSpace({ ...space, category: toSpaceCategory(event.target.value) })}
                        className={inputClassName}
                      >
                        <option value="lifestyle">생활밀착형</option>
                        <option value="youth-building">청년동</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-[#172014]">
                      사진 URL
                      <input
                        value={space.imageUrl}
                        onChange={(event) => onUpdateSpace({ ...space, imageUrl: event.target.value })}
                        className={inputClassName}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-end gap-3 text-sm font-bold text-[#172014]">
                    <Checkbox label="활성" checked={space.isActive} onChange={(checked) => onUpdateSpace({ ...space, isActive: checked })} />
                    <Checkbox label="사용자 노출" checked={space.isPublicVisible} onChange={(checked) => onUpdateSpace({ ...space, isPublicVisible: checked })} />
                    <Checkbox label="관리자 허용 필요" checked={space.requiresAdminUnlock === true} onChange={(checked) => onUpdateSpace({ ...space, requiresAdminUnlock: checked })} />
                    <button
                      type="button"
                      onClick={() => onUpdateSpace({ ...space, isActive: false })}
                      className="rounded-lg border border-[#F1C5C2] px-3 py-2 text-xs font-extrabold text-[#C9443E]"
                    >
                      비활성 처리
                    </button>
                  </div>
                  <label className="grid gap-1 text-sm font-bold text-[#172014]">
                    특징
                    <input
                      value={space.features.join(", ")}
                      onChange={(event) => onUpdateSpace({ ...space, features: parseFeatures(event.target.value) })}
                      className={inputClassName}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-bold text-[#172014]">
                    설명
                    <textarea
                      value={space.description}
                      onChange={(event) => onUpdateSpace({ ...space, description: event.target.value })}
                      rows={2}
                      className={inputClassName}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-bold text-[#172014]">
                    관리자 메모
                    <textarea
                      value={space.adminMemo ?? ""}
                      onChange={(event) => onUpdateSpace({ ...space, adminMemo: event.target.value || undefined })}
                      rows={2}
                      className={inputClassName}
                    />
                  </label>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const inputClassName = "min-w-0 w-full rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium";

function StatusChip(props: { readonly active: boolean; readonly activeLabel: string; readonly inactiveLabel: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${props.active ? "bg-[#E8F5DE] text-[#178A46]" : "bg-[#EEF0EA] text-[#5B6856]"}`}>
      {props.active ? props.activeLabel : props.inactiveLabel}
    </span>
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

function toggleId(current: readonly string[], id: string): readonly string[] {
  if (current.includes(id)) {
    return current.filter((item) => item !== id);
  }
  return [...current, id];
}

function toSpaceCategory(value: string): Space["category"] {
  return value === "youth-building" ? "youth-building" : "lifestyle";
}

function parseFeatures(value: string): readonly string[] {
  return value
    .split(",")
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0);
}

function updateCapacity(space: Space, value: string, onUpdateSpace: (space: Space) => void): void {
  const capacity = Number(value);
  if (Number.isFinite(capacity) && capacity > 0) {
    onUpdateSpace({ ...space, capacity });
  }
}
